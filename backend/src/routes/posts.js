const express = require("express");
const { query } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { recordPostProofOnChain } = require("../services/proofRegistry");
const { mintCollectibleMoment } = require("../services/collectibleMoment");
const { serializePost } = require("../utils/serializers");
const {
  buildPostProofHashes,
  createContentHash,
  toUnixTimestampSeconds,
} = require("../utils/postProofs");
const { saveResizedImage, upload } = require("../utils/uploads");

const router = express.Router();
const ALLOWED_REACTIONS = [
  "joy",
  "love",
  "yellow_heart",
  "sad",
  "wow",
  "fire",
  "like",
  "clap",
];

const reactionTotalsSelect = `
  COALESCE(
    (
      SELECT json_agg(
        json_build_object('type', grouped_reactions.reaction_type, 'count', grouped_reactions.reaction_count)
        ORDER BY grouped_reactions.reaction_count DESC, grouped_reactions.reaction_type ASC
      )
      FROM (
        SELECT
          pr.reaction_type,
          COUNT(*)::int AS reaction_count
        FROM post_reactions pr
        WHERE pr.post_id = p.id
        GROUP BY pr.reaction_type
      ) grouped_reactions
    ),
    '[]'::json
  ) AS reaction_totals
`;

const currentUserReactionsSelect = `
  COALESCE(
    (
      SELECT json_agg(pr.reaction_type ORDER BY pr.reaction_type ASC)
      FROM post_reactions pr
      WHERE pr.post_id = p.id AND pr.user_id = $1
    ),
    '[]'::json
  ) AS current_user_reactions
`;

const proofSelect = `
  p.image_hash,
  p.content_hash,
  p.is_verified_onchain,
  p.proof_tx_hash,
  p.proof_contract_address,
  p.proof_attested_by,
  p.proof_chain_id,
  p.proof_block_number,
  p.proof_recorded_at,
  p.is_minted_nft,
  p.nft_token_id,
  p.nft_tx_hash,
  p.nft_contract_address,
  p.nft_chain_id,
  p.nft_block_number,
  p.nft_minted_at,
`;

async function getPostByIdForViewer(postId, viewerId) {
  const result = await query(
    `
      SELECT
        p.id,
        p.caption,
        p.image_url,
        p.created_at,
        ${proofSelect}
        u.id AS author_id,
        u.username AS author_username,
        u.avatar_url AS author_avatar_url,
        EXISTS(
          SELECT 1
          FROM follows f
          WHERE f.follower_id = $1 AND f.following_id = u.id
        ) AS is_friend_author,
        ${reactionTotalsSelect},
        ${currentUserReactionsSelect}
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.id = $2
    `,
    [viewerId, postId]
  );

  return result.rows[0] || null;
}

router.post("/", requireAuth, upload.single("image"), async (request, response) => {
  const caption = String(request.body.caption || "").trim();

  if (!request.file) {
    return response.status(400).json({
      message: "Please choose an image to post.",
    });
  }

  const resizedPostImage = await saveResizedImage(request.file, {
    prefix: "post",
    width: 1080,
    height: 1440,
    fit: "cover",
    position: "centre",
    quality: 86,
  });
  const appCreatedAt = new Date();
  const contentHash = createContentHash({
    imageHash: resizedPostImage.imageHash,
    caption,
    authorId: request.user.id,
    createdAt: appCreatedAt,
  });

  const createdPost = await query(
    `
      INSERT INTO posts (user_id, image_url, caption, image_hash, content_hash, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `,
    [
      request.user.id,
      resizedPostImage.publicUrl,
      caption,
      resizedPostImage.imageHash,
      contentHash,
      appCreatedAt,
    ]
  );

  const post = await getPostByIdForViewer(createdPost.rows[0].id, request.user.id);

  return response.status(201).json({
    post: serializePost(post),
  });
});

router.get("/user/:id", requireAuth, async (request, response) => {
  const posts = await query(
    `
      SELECT
        p.id,
        p.caption,
        p.image_url,
        p.created_at,
        ${proofSelect}
        u.id AS author_id,
        u.username AS author_username,
        u.avatar_url AS author_avatar_url,
        EXISTS(
          SELECT 1
          FROM follows f
          WHERE f.follower_id = $1 AND f.following_id = u.id
        ) AS is_friend_author,
        ${reactionTotalsSelect},
        ${currentUserReactionsSelect}
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = $2
      ORDER BY p.created_at DESC
    `,
    [request.user.id, request.params.id]
  );

  return response.json({
    posts: posts.rows.map(serializePost),
  });
});

router.post("/:id/proof", requireAuth, async (request, response) => {
  const postResult = await query(
    `
      SELECT
        p.id,
        p.user_id,
        p.caption,
        p.image_url,
        p.created_at,
        p.image_hash,
        p.content_hash,
        p.is_verified_onchain,
        u.username AS author_username
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.id = $1
    `,
    [request.params.id]
  );

  if (postResult.rowCount === 0) {
    return response.status(404).json({
      message: "Post not found.",
    });
  }

  const selectedPost = postResult.rows[0];

  if (Number(selectedPost.user_id) !== Number(request.user.id)) {
    return response.status(403).json({
      message: "Only the original author can verify this post on-chain.",
    });
  }

  if (selectedPost.is_verified_onchain) {
    const existingPost = await getPostByIdForViewer(request.params.id, request.user.id);
    return response.json({
      message: "This post is already verified on-chain.",
      post: serializePost(existingPost),
    });
  }

  try {
    const derivedHashes = await buildPostProofHashes({
      imageUrl: selectedPost.image_url,
      caption: selectedPost.caption,
      authorId: selectedPost.user_id,
      createdAt: selectedPost.created_at,
    });
    const imageHash = selectedPost.image_hash || derivedHashes.imageHash;
    const contentHash =
      selectedPost.content_hash ||
      createContentHash({
        imageHash,
        caption: selectedPost.caption,
        authorId: selectedPost.user_id,
        createdAt: selectedPost.created_at,
      });

    const onChainProof = await recordPostProofOnChain({
      appPostId: Number(selectedPost.id),
      authorUserId: Number(selectedPost.user_id),
      authorUsername: selectedPost.author_username || "new-user",
      imageHash,
      contentHash,
      imageUrl: selectedPost.image_url,
      appCreatedAt: toUnixTimestampSeconds(selectedPost.created_at),
    });

    await query(
      `
        UPDATE posts
        SET image_hash = $2,
            content_hash = $3,
            is_verified_onchain = TRUE,
            proof_tx_hash = $4,
            proof_contract_address = $5,
            proof_attested_by = $6,
            proof_chain_id = $7,
            proof_block_number = $8,
            proof_recorded_at = NOW()
        WHERE id = $1
      `,
      [
        selectedPost.id,
        imageHash,
        contentHash,
        onChainProof.txHash,
        onChainProof.contractAddress,
        onChainProof.attestedBy,
        onChainProof.chainId,
        onChainProof.blockNumber,
      ]
    );

    const verifiedPost = await getPostByIdForViewer(request.params.id, request.user.id);

    return response.json({
      message: "Post proof recorded on-chain.",
      post: serializePost(verifiedPost),
    });
  } catch (error) {
    console.error("Unable to record post proof:", error);
    return response.status(500).json({
      message: error.message || "Unable to record blockchain proof right now.",
    });
  }
});

/* ── Collectible Moment: Mint post as NFT ── */
router.post("/:id/mint", requireAuth, async (request, response) => {
  const postResult = await query(
    `
      SELECT
        p.id,
        p.user_id,
        p.caption,
        p.image_url,
        p.content_hash,
        p.is_minted_nft,
        u.username AS author_username
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.id = $1
    `,
    [request.params.id]
  );

  if (postResult.rowCount === 0) {
    return response.status(404).json({
      message: "Post not found.",
    });
  }

  const selectedPost = postResult.rows[0];

  if (Number(selectedPost.user_id) !== Number(request.user.id)) {
    return response.status(403).json({
      message: "Only the original author can mint this post as an NFT.",
    });
  }

  if (selectedPost.is_minted_nft) {
    const existingPost = await getPostByIdForViewer(request.params.id, request.user.id);
    return response.json({
      message: "This post has already been minted as an NFT.",
      post: serializePost(existingPost),
    });
  }

  try {
    // Use the relayer wallet address as the recipient (platform-managed).
    // In a production app, each user would have their own wallet.
    const { ethers } = require("ethers");
    const config = require("../config");
    const relayerWallet = new ethers.Wallet(config.blockchainRelayerPrivateKey);
    const recipientAddress = relayerWallet.address;

    // Ensure we have a content hash
    let contentHash = selectedPost.content_hash;
    if (!contentHash || contentHash === "") {
      const { createContentHash } = require("../utils/postProofs");
      contentHash = createContentHash({
        imageHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        caption: selectedPost.caption,
        authorId: selectedPost.user_id,
        createdAt: new Date(),
      });
    }

    const onChainResult = await mintCollectibleMoment({
      recipientAddress,
      appPostId: Number(selectedPost.id),
      authorUserId: Number(selectedPost.user_id),
      imageUrl: selectedPost.image_url,
      caption: selectedPost.caption || "",
      contentHash,
    });

    await query(
      `
        UPDATE posts
        SET is_minted_nft = TRUE,
            nft_token_id = $2,
            nft_tx_hash = $3,
            nft_contract_address = $4,
            nft_chain_id = $5,
            nft_block_number = $6,
            nft_minted_at = NOW()
        WHERE id = $1
      `,
      [
        selectedPost.id,
        onChainResult.tokenId,
        onChainResult.txHash,
        onChainResult.contractAddress,
        onChainResult.chainId,
        onChainResult.blockNumber,
      ]
    );

    const mintedPost = await getPostByIdForViewer(request.params.id, request.user.id);

    return response.json({
      message: "Post minted as Collectible Moment NFT!",
      post: serializePost(mintedPost),
    });
  } catch (error) {
    console.error("Unable to mint collectible moment:", error);
    return response.status(500).json({
      message: error.message || "Unable to mint NFT right now.",
    });
  }
});

router.post("/:id/reactions", requireAuth, async (request, response) => {
  const reactionType = String(request.body?.type || "").trim();

  if (!ALLOWED_REACTIONS.includes(reactionType)) {
    return response.status(400).json({
      message: "Reaction type is not supported.",
    });
  }

  const post = await query(`SELECT id FROM posts WHERE id = $1`, [request.params.id]);

  if (post.rowCount === 0) {
    return response.status(404).json({
      message: "Post not found.",
    });
  }

  const existingReaction = await query(
    `
      SELECT 1
      FROM post_reactions
      WHERE post_id = $1 AND user_id = $2 AND reaction_type = $3
    `,
    [request.params.id, request.user.id, reactionType]
  );

  if (existingReaction.rowCount > 0) {
    await query(
      `
        DELETE FROM post_reactions
        WHERE post_id = $1 AND user_id = $2 AND reaction_type = $3
      `,
      [request.params.id, request.user.id, reactionType]
    );
  } else {
    await query(
      `
        INSERT INTO post_reactions (post_id, user_id, reaction_type)
        VALUES ($1, $2, $3)
      `,
      [request.params.id, request.user.id, reactionType]
    );
  }

  const updatedPost = await getPostByIdForViewer(request.params.id, request.user.id);

  return response.json({
    post: serializePost(updatedPost),
  });
});

router.get("/:id/reactions", requireAuth, async (request, response) => {
  const post = await query(`SELECT id FROM posts WHERE id = $1`, [request.params.id]);

  if (post.rowCount === 0) {
    return response.status(404).json({
      message: "Post not found.",
    });
  }

  const reactions = await query(
    `
      SELECT
        pr.reaction_type,
        u.id AS user_id,
        u.username,
        u.avatar_url,
        pr.created_at
      FROM post_reactions pr
      JOIN users u ON u.id = pr.user_id
      WHERE pr.post_id = $1
      ORDER BY pr.reaction_type ASC, pr.created_at DESC
    `,
    [request.params.id]
  );

  const groupedReactions = reactions.rows.reduce((groups, row) => {
    const existingGroup = groups[row.reaction_type] || [];
    existingGroup.push({
      userId: row.user_id,
      username: row.username || "New user",
      avatarUrl: row.avatar_url || "",
      createdAt: row.created_at,
    });
    groups[row.reaction_type] = existingGroup;
    return groups;
  }, {});

  return response.json({
    reactions: groupedReactions,
  });
});

module.exports = router;
