const hre = require("hardhat");

async function main() {
  const collectibleMoment = await hre.ethers.deployContract("CollectibleMoment");
  await collectibleMoment.waitForDeployment();

  const contractAddress = await collectibleMoment.getAddress();

  console.log("CollectibleMoment deployed to:", contractAddress);
  console.log("Copy this address to COLLECTIBLE_MOMENT_ADDRESS in .env");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
