const express = require("express");
const config = require("../config");
const { query } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { serializeUser } = require("../utils/serializers");
const { saveResizedImage, upload, deleteCloudinaryImage } = require("../utils/uploads");

const router = express.Router();

const baseProfileSelect = `
  SELECT
    u.id,
    u.email,
    u.username,
    u.bio,
    u.avatar_url,
    u.role,
    u.created_at,
    (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS friend_count,
    (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS post_count
  FROM users u
  WHERE u.id = $1
`;

function serializeProfileWithFriendState(row) {
  return {
    ...serializeUser(row),
    isFriend: Boolean(row.is_friend),
  };
}

async function removeExistingAvatar(avatarUrl) {
  await deleteCloudinaryImage(avatarUrl);
}

router.get("/me", requireAuth, async (request, response) => {
  const profile = await query(baseProfileSelect, [request.user.id]);
  return response.json({
    profile: serializeUser(profile.rows[0]),
  });
});

router.get("/", requireAuth, async (request, response) => {
  const searchQuery = String(request.query.q || "").trim();
  const searchPattern = `%${searchQuery}%`;

  const profiles = await query(
    `
      SELECT
        u.id,
        u.email,
        u.username,
        u.bio,
        u.avatar_url,
        u.created_at,
        (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS friend_count,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS post_count,
        EXISTS(
          SELECT 1
          FROM follows
          WHERE follower_id = $1 AND following_id = u.id
        ) AS is_friend
      FROM users u
      WHERE u.id <> $1
        AND u.username IS NOT NULL
        AND ($2 = '' OR u.username ILIKE $3)
      ORDER BY is_friend DESC, u.created_at DESC
      LIMIT 18
    `,
    [request.user.id, searchQuery, searchPattern]
  );

  return response.json({
    profiles: profiles.rows.map(serializeProfileWithFriendState),
  });
});

router.put(
  "/me",
  requireAuth,
  upload.single("avatar"),
  async (request, response) => {
    const username = String(request.body.username || "").trim();
    const bio = String(request.body.bio || "").trim();

    if (!username) {
      return response.status(400).json({
        message: "Username is required.",
      });
    }

    if (username.length < 3) {
      return response.status(400).json({
        message: "Username must be at least 3 characters.",
      });
    }

    const existingProfile = await query(
      `SELECT avatar_url FROM users WHERE id = $1`,
      [request.user.id]
    );

    let nextAvatarUrl = existingProfile.rows[0]?.avatar_url || "";

    if (request.file) {
      await removeExistingAvatar(nextAvatarUrl);
      const resizedAvatar = await saveResizedImage(request.file, {
        prefix: "avatar",
        width: 512,
        height: 512,
        fit: "cover",
        position: "centre",
        quality: 84,
      });
      nextAvatarUrl = resizedAvatar.publicUrl;
    }

    try {
      await query(
        `
          UPDATE users
          SET username = $1,
              bio = $2,
              avatar_url = $3
          WHERE id = $4
        `,
        [username, bio, nextAvatarUrl, request.user.id]
      );
    } catch (error) {
      if (error.code === "23505") {
        return response.status(409).json({
          message: "This username is already taken.",
        });
      }

      return response.status(500).json({
        message: "Unable to save your profile right now.",
      });
    }

    const updatedProfile = await query(baseProfileSelect, [request.user.id]);

    return response.json({
      profile: serializeUser(updatedProfile.rows[0]),
    });
  }
);

router.get("/:id", requireAuth, async (request, response) => {
  const profile = await query(baseProfileSelect, [request.params.id]);

  if (profile.rowCount === 0) {
    return response.status(404).json({
      message: "Profile not found.",
    });
  }

  const friendState = await query(
    `
      SELECT EXISTS(
        SELECT 1
        FROM follows
        WHERE follower_id = $1 AND following_id = $2
      ) AS is_friend
    `,
    [request.user.id, request.params.id]
  );

  return response.json({
    profile: serializeProfileWithFriendState({
      ...profile.rows[0],
      is_friend: friendState.rows[0].is_friend,
    }),
  });
});

router.post("/:id/friend", requireAuth, async (request, response) => {
  const targetId = Number(request.params.id);

  if (targetId === request.user.id) {
    return response.status(400).json({
      message: "You cannot add yourself as a friend.",
    });
  }

  const targetUser = await query(`SELECT id FROM users WHERE id = $1`, [targetId]);

  if (targetUser.rowCount === 0) {
    return response.status(404).json({
      message: "Profile not found.",
    });
  }

  await query(
    `
      INSERT INTO follows (follower_id, following_id)
      VALUES ($1, $2), ($2, $1)
      ON CONFLICT DO NOTHING
    `,
    [request.user.id, targetId]
  );

  return response.status(204).send();
});

router.delete("/:id/friend", requireAuth, async (request, response) => {
  await query(
    `
      DELETE FROM follows
      WHERE (follower_id = $1 AND following_id = $2)
         OR (follower_id = $2 AND following_id = $1)
    `,
    [request.user.id, request.params.id]
  );

  return response.status(204).send();
});

/**
 * GET /api/profiles/:id/achievements
 * Returns all blockchain achievements for a user:
 *   - Friendship milestones (NFT certificates)
 *   - Collectible moment NFTs (minted posts)
 */
router.get("/:id/achievements", requireAuth, async (request, response) => {
  const userId = Number(request.params.id);

  try {
    // 1. Friendship milestones where this user is involved
    const milestoneRows = await query(
      `SELECT
         fm.milestone_type,
         fm.token_id,
         fm.tx_hash,
         fm.contract_address,
         fm.chain_id,
         fm.block_number,
         fm.minted_at,
         fm.user_id_a,
         fm.user_id_b,
         ua.username AS username_a,
         ub.username AS username_b
       FROM friendship_milestones fm
       JOIN users ua ON ua.id = fm.user_id_a
       JOIN users ub ON ub.id = fm.user_id_b
       WHERE fm.user_id_a = $1 OR fm.user_id_b = $1
       ORDER BY fm.minted_at DESC`,
      [userId]
    );

    const milestoneLabels = {
      0: "First Friend 🤝",
      1: "First Photo Together 📸",
      2: "7-Day Streak 🔥",
      3: "30 Days Together 🎉",
      4: "100 Reactions 💯",
      5: "Friend Anniversary 🎂",
    };

    const milestones = milestoneRows.rows.map((r) => {
      const friendId = Number(r.user_id_a) === userId ? r.user_id_b : r.user_id_a;
      const friendName = Number(r.user_id_a) === userId ? r.username_b : r.username_a;
      const chainId = r.chain_id ? Number(r.chain_id) : null;
      return {
        type: "milestone",
        milestoneType: r.milestone_type,
        label: milestoneLabels[r.milestone_type] || `Milestone #${r.milestone_type}`,
        tokenId: r.token_id ? Number(r.token_id) : null,
        txHash: r.tx_hash || "",
        contractAddress: r.contract_address || "",
        chainId,
        blockNumber: r.block_number ? Number(r.block_number) : null,
        mintedAt: r.minted_at,
        friendId: Number(friendId),
        friendName: friendName || "user",
        explorerUrl:
          chainId === 11155111 && r.tx_hash
            ? `https://sepolia.etherscan.io/tx/${r.tx_hash}`
            : "",
      };
    });

    // 2. Collectible Moment NFTs (minted posts by this user)
    const nftRows = await query(
      `SELECT
         p.id AS post_id,
         p.caption,
         p.image_url,
         p.nft_token_id,
         p.nft_tx_hash,
         p.nft_contract_address,
         p.nft_chain_id,
         p.nft_block_number,
         p.nft_minted_at
       FROM posts p
       WHERE p.user_id = $1 AND p.is_minted_nft = TRUE
       ORDER BY p.nft_minted_at DESC`,
      [userId]
    );

    const collectibles = nftRows.rows.map((r) => {
      const chainId = r.nft_chain_id ? Number(r.nft_chain_id) : null;
      return {
        type: "collectible",
        postId: Number(r.post_id),
        caption: r.caption || "",
        imageUrl: r.image_url || "",
        tokenId: r.nft_token_id ? Number(r.nft_token_id) : null,
        txHash: r.nft_tx_hash || "",
        contractAddress: r.nft_contract_address || "",
        chainId,
        blockNumber: r.nft_block_number ? Number(r.nft_block_number) : null,
        mintedAt: r.nft_minted_at,
        explorerUrl:
          chainId === 11155111 && r.nft_tx_hash
            ? `https://sepolia.etherscan.io/tx/${r.nft_tx_hash}`
            : "",
      };
    });

    return response.json({
      achievements: {
        milestones,
        collectibles,
        totalCount: milestones.length + collectibles.length,
      },
    });
  } catch (err) {
    console.error("Achievements fetch error:", err);
    return response.status(500).json({ message: "Unable to load achievements." });
  }
});

module.exports = router;
