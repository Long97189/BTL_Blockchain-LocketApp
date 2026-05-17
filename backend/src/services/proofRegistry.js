const { ethers } = require("ethers");
const config = require("../config");
const proofRegistryAbi = require("../blockchain/proofRegistryAbi");

function assertProofRegistryConfig() {
  if (!config.blockchainRpcUrl) {
    throw new Error("Missing BLOCKCHAIN_RPC_URL or SEPOLIA_RPC_URL for proof relayer.");
  }

  if (!config.blockchainRelayerPrivateKey) {
    throw new Error("Missing BLOCKCHAIN_RELAYER_PRIVATE_KEY or PRIVATE_KEY for proof relayer.");
  }

  if (!config.proofRegistryAddress) {
    throw new Error("Missing PROOF_REGISTRY_ADDRESS for proof relayer.");
  }
}

function getProofRegistryContract() {
  assertProofRegistryConfig();
  const provider = new ethers.JsonRpcProvider(config.blockchainRpcUrl);
  const relayerWallet = new ethers.Wallet(config.blockchainRelayerPrivateKey, provider);
  return new ethers.Contract(config.proofRegistryAddress, proofRegistryAbi, relayerWallet);
}

async function recordPostProofOnChain({
  appPostId,
  authorUserId,
  authorUsername,
  imageHash,
  contentHash,
  imageUrl,
  appCreatedAt,
}) {
  const contract = getProofRegistryContract();
  const transaction = await contract.recordPostProof(
    appPostId,
    authorUserId,
    authorUsername,
    imageHash,
    contentHash,
    imageUrl,
    appCreatedAt
  );
  const receipt = await transaction.wait();

  return {
    txHash: transaction.hash,
    blockNumber: Number(receipt.blockNumber),
    contractAddress: await contract.getAddress(),
    attestedBy: await contract.runner.getAddress(),
    chainId: config.proofChainId,
  };
}

module.exports = {
  recordPostProofOnChain,
};
