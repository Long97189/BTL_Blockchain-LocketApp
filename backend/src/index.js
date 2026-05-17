const app = require("./app");
const config = require("./config");
const { ensureSchema, pool } = require("./db");

async function startServer() {
  try {
    await pool.query("SELECT 1");
    await ensureSchema();

    app.listen(config.port, () => {
      console.log(`API listening on port ${config.port}`);
    });
  } catch (error) {
    console.error("Unable to start API:", error);
    process.exit(1);
  }
}

startServer();
