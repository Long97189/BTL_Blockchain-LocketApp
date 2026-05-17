const express = require("express");
const { query } = require("../db");
const { requireAuth } = require("../middleware/auth");
const { serializePost } = require("../utils/serializers");

const router = express.Router();

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

router.get("/", requireAuth, async (request, response) => {
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
          FROM follows direct_follow
          WHERE direct_follow.follower_id = $1
            AND direct_follow.following_id = u.id
        ) AS is_friend_author,
        ${reactionTotalsSelect},
        ${currentUserReactionsSelect}
      FROM posts p
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id = $1
         OR EXISTS(
           SELECT 1
           FROM follows feed_follow
           WHERE feed_follow.follower_id = $1
             AND feed_follow.following_id = p.user_id
         )
      ORDER BY p.created_at DESC
      LIMIT 50
    `,
    [request.user.id]
  );

  return response.json({
    posts: posts.rows.map(serializePost),
  });
});

module.exports = router;
