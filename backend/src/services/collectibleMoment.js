const { ethers } = require("ethers");
const config = require("../config");
const collectibleMomentAbi = require("../blockchain/collectibleMomentAbi");

function assertCollectibleMomentConfig() {
  if (!config.blockchainRpcUrl) {
    throw new Error("Missing BLOCKCHAIN_RPC_URL for collectible moment.");
  }

  if (!config.blockchainRelayerPrivateKey) {
    throw new Error("Missing BLOCKCHAIN_RELAYER_PRIVATE_KEY for collectible moment.");
  }

  if (!config.collectibleMomentAddress) {
    throw new Error("Missing COLLECTIBLE_MOMENT_ADDRESS for collectible moment.");
  }
}

function getCollectibleMomentContract() {
  assertCollectibleMomentConfig();
  const provider = new ethers.JsonRpcProvider(config.blockchainRpcUrl);
  const relayerWallet = new ethers.Wallet(config.blockchainRelayerPrivateKey, provider);
  return new ethers.Contract(config.collectibleMomentAddress, collectibleMomentAbi, relayerWallet);
}

/**
 * Mints a Collectible Moment NFT for a post.
 * The relayer wallet pays the gas — the user never needs a wallet.
 *
 * @param {Object} params
 * @param {string} params.recipientAddress - Wallet address to receive the NFT (platform-assigned).
 * @param {number} params.appPostId       - Database post id.
 * @param {number} params.authorUserId    - Database user id of the post author.
 * @param {string} params.imageUrl        - Off-chain image URL.
 * @param {string} params.caption         - Post caption text.
 * @param {string} params.contentHash     - 0x-prefixed SHA-256 hash of the post payload.
 * @returns {Promise<Object>} On-chain receipt details.
 */
async function mintCollectibleMoment({
  recipientAddress,
  appPostId,
  authorUserId,
  imageUrl,
  caption,
  contentHash,
}) {
  const contract = getCollectibleMomentContract();

  const transaction = await contract.mintMoment(
    recipientAddress,
    appPostId,
    authorUserId,
    imageUrl,
    caption || "",
    contentHash
  );

  const receipt = await transaction.wait();

  // Parse MomentMinted event to get tokenId
  let tokenId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog({
        topics: log.topics,
        data: log.data,
      });
      if (parsed && parsed.name === "MomentMinted") {
        tokenId = Number(parsed.args.tokenId);
        break;
      }
    } catch (_) {
      // skip non-matching logs
    }
  }

  return {
    tokenId,
    txHash: transaction.hash,
    blockNumber: Number(receipt.blockNumber),
    contractAddress: await contract.getAddress(),
    chainId: config.proofChainId,
  };
}

module.exports = {
  mintCollectibleMoment,
};
