const { ethers } = require("ethers");
const config = require("../config");
const friendshipMilestoneAbi = require("../blockchain/friendshipMilestoneAbi");

function getContract() {
  const provider = new ethers.JsonRpcProvider(config.blockchainRpcUrl);
  const wallet = new ethers.Wallet(config.blockchainRelayerPrivateKey, provider);
  return new ethers.Contract(config.friendshipMilestoneAddress, friendshipMilestoneAbi, wallet);
}

/**
 * Milestone type constants — keep in sync with the Solidity enum comment.
 */
const MILESTONE_TYPES = {
  FIRST_FRIEND:      0,
  FIRST_PHOTO:       1,
  WEEK_STREAK:       2,
  MONTH_TOGETHER:    3,
  HUNDRED_REACTIONS: 4,
  FRIEND_ANNIVERSARY: 5,
};

const MILESTONE_LABELS = {
  [MILESTONE_TYPES.FIRST_FRIEND]:       "First Friend 🤝",
  [MILESTONE_TYPES.FIRST_PHOTO]:        "First Photo Together 📸",
  [MILESTONE_TYPES.WEEK_STREAK]:        "7-Day Streak 🔥",
  [MILESTONE_TYPES.MONTH_TOGETHER]:     "30 Days Together 🎉",
  [MILESTONE_TYPES.HUNDRED_REACTIONS]:   "100 Reactions 💯",
  [MILESTONE_TYPES.FRIEND_ANNIVERSARY]: "Friend Anniversary 🎂",
};

const MILESTONE_DESCRIPTIONS = {
  [MILESTONE_TYPES.FIRST_FRIEND]:       "You and your friend just became friends!",
  [MILESTONE_TYPES.FIRST_PHOTO]:        "One of you shared a photo while being friends.",
  [MILESTONE_TYPES.WEEK_STREAK]:        "You've been interacting for 7 days in a row!",
  [MILESTONE_TYPES.MONTH_TOGETHER]:     "You've been friends for 30 days!",
  [MILESTONE_TYPES.HUNDRED_REACTIONS]:   "100 reactions exchanged between you two!",
  [MILESTONE_TYPES.FRIEND_ANNIVERSARY]: "One year as friends!",
};

/**
 * Mint a friendship milestone on-chain.
 */
async function mintFriendshipMilestone({
  recipientAddress,
  userIdA,
  userIdB,
  usernameA,
  usernameB,
  milestoneType,
}) {
  const contract = getContract();
  const milestoneName = MILESTONE_LABELS[milestoneType] || `Milestone #${milestoneType}`;

  const tx = await contract.mintMilestone(
    recipientAddress,
    userIdA,
    userIdB,
    usernameA,
    usernameB,
    milestoneType,
    milestoneName
  );
  const receipt = await tx.wait();

  let tokenId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog({ topics: log.topics, data: log.data });
      if (parsed && parsed.name === "MilestoneMinted") {
        tokenId = Number(parsed.args.tokenId);
        break;
      }
    } catch (_) { /* skip */ }
  }

  return {
    tokenId,
    txHash: tx.hash,
    blockNumber: Number(receipt.blockNumber),
    contractAddress: await contract.getAddress(),
    chainId: config.proofChainId,
    milestoneName,
  };
}

module.exports = {
  MILESTONE_TYPES,
  MILESTONE_LABELS,
  MILESTONE_DESCRIPTIONS,
  mintFriendshipMilestone,
};
