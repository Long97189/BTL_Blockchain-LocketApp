// locket-dapp/scripts/deploy.js
const hre = require("hardhat");

async function main() {
  const locketSocial = await hre.ethers.deployContract("LocketSocial");
  await locketSocial.waitForDeployment();

  const contractAddress = await locketSocial.getAddress();

  console.log("LocketSocial deployed to:", contractAddress);
  // Copy this address to REACT_APP_CONTRACT_ADDRESS
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
