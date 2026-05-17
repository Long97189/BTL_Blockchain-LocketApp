const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const hash = await bcrypt.hash('123456', 10);
  console.log('Generated hash:', hash);

  for (const id of [16, 17, 19]) {
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, id]);
  }

  const result = await pool.query('SELECT id, email, username FROM users WHERE id = ANY($1)', [[16, 17, 19]]);
  console.log('Updated accounts:', JSON.stringify(result.rows, null, 2));

  // Verify it works
  const ok = await bcrypt.compare('123456', hash);
  console.log('Verification test (should be true):', ok);

  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
