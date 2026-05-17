const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const rootDirectory = path.resolve(__dirname, "..");
const uploadsDirectory = path.resolve(
  rootDirectory,
  process.env.UPLOAD_DIR || "uploads"
);

module.exports = {
  port: Number(process.env.PORT || 4000),
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://locket:locketpassword@localhost:5432/locketsocial",
  jwtSecret: process.env.JWT_SECRET || "locket-social-dev-secret",
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  uploadsDirectory,
  blockchainRpcUrl:
    process.env.BLOCKCHAIN_RPC_URL ||
    process.env.SEPOLIA_RPC_URL ||
    "",
  blockchainRelayerPrivateKey:
    process.env.BLOCKCHAIN_RELAYER_PRIVATE_KEY ||
    process.env.PRIVATE_KEY ||
    "",
  proofRegistryAddress: process.env.PROOF_REGISTRY_ADDRESS || "",
  proofChainId: Number(process.env.PROOF_CHAIN_ID || 11155111),
  collectibleMomentAddress: process.env.COLLECTIBLE_MOMENT_ADDRESS || "",
  friendshipMilestoneAddress: process.env.FRIENDSHIP_MILESTONE_ADDRESS || "",
};
