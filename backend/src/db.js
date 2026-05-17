const { Pool } = require("pg");
const config = require("./config");

const pool = new Pool({
  connectionString: config.databaseUrl,
});

async function query(text, params = []) {
  return pool.query(text, params);
}

async function getClient() {
  return pool.connect();
}

async function ensureSchema() {
  await pool.query(`
    ALTER TABLE posts
      ADD COLUMN IF NOT EXISTS image_hash VARCHAR(66) NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS content_hash VARCHAR(66) NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS is_verified_onchain BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS proof_tx_hash TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS proof_contract_address TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS proof_attested_by TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS proof_chain_id BIGINT,
      ADD COLUMN IF NOT EXISTS proof_block_number BIGINT,
      ADD COLUMN IF NOT EXISTS proof_recorded_at TIMESTAMPTZ
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS post_reactions (
      post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reaction_type VARCHAR(32) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (post_id, user_id, reaction_type)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_post_reactions_post_created_at
    ON post_reactions (post_id, created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_posts_verified_onchain
    ON posts (is_verified_onchain, created_at DESC)
  `);

  // ── Collectible Moment (NFT) columns ──
  await pool.query(`
    ALTER TABLE posts
      ADD COLUMN IF NOT EXISTS is_minted_nft BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS nft_token_id BIGINT,
      ADD COLUMN IF NOT EXISTS nft_tx_hash TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS nft_contract_address TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS nft_chain_id BIGINT,
      ADD COLUMN IF NOT EXISTS nft_block_number BIGINT,
      ADD COLUMN IF NOT EXISTS nft_minted_at TIMESTAMPTZ
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_posts_minted_nft
    ON posts (is_minted_nft, created_at DESC)
  `);

  // ── Friendship Milestone certificates ──
  await pool.query(`
    CREATE TABLE IF NOT EXISTS friendship_milestones (
      id BIGSERIAL PRIMARY KEY,
      user_id_a BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_id_b BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      milestone_type SMALLINT NOT NULL,
      token_id BIGINT,
      tx_hash TEXT NOT NULL DEFAULT '',
      contract_address TEXT NOT NULL DEFAULT '',
      chain_id BIGINT,
      block_number BIGINT,
      minted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id_a, user_id_b, milestone_type)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_friendship_milestones_pair
    ON friendship_milestones (user_id_a, user_id_b)
  `);

  // ── Role-based access control ──
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
  `);
}

module.exports = {
  pool,
  query,
  getClient,
  ensureSchema,
};
