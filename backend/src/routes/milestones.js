const express = require("express");
const { query } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { ethers } = require("ethers");
const config = require("../config");
const {
  MILESTONE_TYPES,
  MILESTONE_LABELS,
  MILESTONE_DESCRIPTIONS,
  mintFriendshipMilestone,
} = require("../services/friendshipMilestone");

const router = express.Router();

/**
 * GET /api/milestones/:friendId
 *
 * Returns available & claimed milestones between the current user and a friend.
 * The backend checks off-chain data to decide which milestones are eligible.
 */
router.get("/:friendId", requireAuth, async (req, res) => {
  const currentUserId = Number(req.user.id);
  const friendId = Number(req.params.friendId);

  if (currentUserId === friendId) {
    return res.status(400).json({ message: "Cannot check milestones with yourself." });
  }

  try {
    // 1. Check if they are actually friends (either direction)
    const friendCheck = await query(
      `SELECT 1 FROM follows
       WHERE (follower_id = $1 AND following_id = $2)
          OR (follower_id = $2 AND following_id = $1)`,
      [currentUserId, friendId]
    );
    if (friendCheck.rowCount === 0) {
      return res.json({ milestones: [] });
    }

    // 2. Get friendship start date (earliest follow in either direction)
    const friendshipRow = await query(
      `SELECT MIN(created_at) AS created_at FROM follows
       WHERE (follower_id = $1 AND following_id = $2)
          OR (follower_id = $2 AND following_id = $1)`,
      [currentUserId, friendId]
    );
    const friendshipStart = friendshipRow.rows[0]?.created_at;
    const friendshipDays = friendshipStart
      ? Math.floor((Date.now() - new Date(friendshipStart).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // 3. Count mutual reactions
    const reactionCount = await query(
      `SELECT COUNT(*)::int AS cnt FROM post_reactions pr
       JOIN posts p ON p.id = pr.post_id
       WHERE (pr.user_id = $1 AND p.user_id = $2)
          OR (pr.user_id = $2 AND p.user_id = $1)`,
      [currentUserId, friendId]
    );
    const mutualReactions = reactionCount.rows[0]?.cnt || 0;

    // 4. Check if either has posted since becoming friends
    const photoCheck = await query(
      `SELECT 1 FROM posts
       WHERE user_id IN ($1, $2) AND created_at >= $3
       LIMIT 1`,
      [currentUserId, friendId, friendshipStart]
    );
    const hasPhotoTogether = photoCheck.rowCount > 0;

    // 5. Get already-claimed milestones from our DB
    const claimedRows = await query(
      `SELECT milestone_type, token_id, tx_hash, contract_address, chain_id,
              block_number, minted_at
       FROM friendship_milestones
       WHERE (user_id_a = $1 AND user_id_b = $2)
          OR (user_id_a = $2 AND user_id_b = $1)`,
      [currentUserId, friendId]
    );
    const claimedMap = {};
    claimedRows.rows.forEach((r) => {
      claimedMap[r.milestone_type] = {
        tokenId: Number(r.token_id),
        txHash: r.tx_hash,
        contractAddress: r.contract_address,
        chainId: r.chain_id ? Number(r.chain_id) : null,
        blockNumber: r.block_number ? Number(r.block_number) : null,
        mintedAt: r.minted_at,
        explorerUrl:
          r.chain_id && Number(r.chain_id) === 11155111 && r.tx_hash
            ? `https://sepolia.etherscan.io/tx/${r.tx_hash}`
            : "",
      };
    });

    // 6. Build milestone list
    const milestoneList = [
      {
        type: MILESTONE_TYPES.FIRST_FRIEND,
        label: MILESTONE_LABELS[MILESTONE_TYPES.FIRST_FRIEND],
        description: MILESTONE_DESCRIPTIONS[MILESTONE_TYPES.FIRST_FRIEND],
        eligible: true, // always eligible once friends
      },
      {
        type: MILESTONE_TYPES.FIRST_PHOTO,
        label: MILESTONE_LABELS[MILESTONE_TYPES.FIRST_PHOTO],
        description: MILESTONE_DESCRIPTIONS[MILESTONE_TYPES.FIRST_PHOTO],
        eligible: hasPhotoTogether,
      },
      {
        type: MILESTONE_TYPES.WEEK_STREAK,
        label: MILESTONE_LABELS[MILESTONE_TYPES.WEEK_STREAK],
        description: MILESTONE_DESCRIPTIONS[MILESTONE_TYPES.WEEK_STREAK],
        eligible: friendshipDays >= 7,
      },
      {
        type: MILESTONE_TYPES.MONTH_TOGETHER,
        label: MILESTONE_LABELS[MILESTONE_TYPES.MONTH_TOGETHER],
        description: MILESTONE_DESCRIPTIONS[MILESTONE_TYPES.MONTH_TOGETHER],
        eligible: friendshipDays >= 30,
      },
      {
        type: MILESTONE_TYPES.HUNDRED_REACTIONS,
        label: MILESTONE_LABELS[MILESTONE_TYPES.HUNDRED_REACTIONS],
        description: MILESTONE_DESCRIPTIONS[MILESTONE_TYPES.HUNDRED_REACTIONS],
        eligible: mutualReactions >= 100,
      },
      {
        type: MILESTONE_TYPES.FRIEND_ANNIVERSARY,
        label: MILESTONE_LABELS[MILESTONE_TYPES.FRIEND_ANNIVERSARY],
        description: MILESTONE_DESCRIPTIONS[MILESTONE_TYPES.FRIEND_ANNIVERSARY],
        eligible: friendshipDays >= 365,
      },
    ];

    const enriched = milestoneList.map((m) => ({
      ...m,
      claimed: !!claimedMap[m.type],
      onChain: claimedMap[m.type] || null,
    }));

    return res.json({ milestones: enriched });
  } catch (err) {
    console.error("Milestone check error:", err);
    return res.status(500).json({ message: "Unable to check milestones." });
  }
});

/**
 * POST /api/milestones/:friendId/claim
 * body: { milestoneType: number }
 *
 * Claims an eligible milestone — mints an NFT certificate on-chain.
 */
router.post("/:friendId/claim", requireAuth, async (req, res) => {
  const currentUserId = Number(req.user.id);
  const friendId = Number(req.params.friendId);
  const milestoneType = Number(req.body.milestoneType);

  if (currentUserId === friendId) {
    return res.status(400).json({ message: "Cannot claim a milestone with yourself." });
  }

  if (!(milestoneType in MILESTONE_LABELS)) {
    return res.status(400).json({ message: "Invalid milestone type." });
  }

  try {
    // Check already claimed in DB
    const existing = await query(
      `SELECT 1 FROM friendship_milestones
       WHERE ((user_id_a = $1 AND user_id_b = $2) OR (user_id_a = $2 AND user_id_b = $1))
         AND milestone_type = $3`,
      [currentUserId, friendId, milestoneType]
    );
    if (existing.rowCount > 0) {
      return res.status(409).json({ message: "This milestone has already been claimed." });
    }

    // Get usernames
    const usersResult = await query(
      `SELECT id, username FROM users WHERE id IN ($1, $2)`,
      [currentUserId, friendId]
    );
    const usernameMap = {};
    usersResult.rows.forEach((r) => { usernameMap[r.id] = r.username || "user"; });

    // Relayer wallet as recipient
    const relayerWallet = new ethers.Wallet(config.blockchainRelayerPrivateKey);
    const recipientAddress = relayerWallet.address;

    const result = await mintFriendshipMilestone({
      recipientAddress,
      userIdA: currentUserId,
      userIdB: friendId,
      usernameA: usernameMap[currentUserId] || "user",
      usernameB: usernameMap[friendId] || "user",
      milestoneType,
    });

    // Save to DB
    await query(
      `INSERT INTO friendship_milestones
         (user_id_a, user_id_b, milestone_type, token_id, tx_hash,
          contract_address, chain_id, block_number, minted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        currentUserId,
        friendId,
        milestoneType,
        result.tokenId,
        result.txHash,
        result.contractAddress,
        result.chainId,
        result.blockNumber,
      ]
    );

    return res.json({
      message: `Milestone "${result.milestoneName}" claimed!`,
      milestone: {
        type: milestoneType,
        label: result.milestoneName,
        tokenId: result.tokenId,
        txHash: result.txHash,
        contractAddress: result.contractAddress,
        chainId: result.chainId,
        blockNumber: result.blockNumber,
        explorerUrl:
          result.chainId === 11155111
            ? `https://sepolia.etherscan.io/tx/${result.txHash}`
            : "",
      },
    });
  } catch (err) {
    console.error("Milestone claim error:", err);
    return res.status(500).json({ message: err.message || "Unable to claim milestone." });
  }
});

module.exports = router;
