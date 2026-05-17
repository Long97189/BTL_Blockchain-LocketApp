const hre = require("hardhat");

async function main() {
  const milestone = await hre.ethers.deployContract("FriendshipMilestone");
  await milestone.waitForDeployment();

  const contractAddress = await milestone.getAddress();

  console.log("FriendshipMilestone deployed to:", contractAddress);
  console.log("Copy this address to FRIENDSHIP_MILESTONE_ADDRESS in .env");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
