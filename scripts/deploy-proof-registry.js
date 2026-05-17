const hre = require("hardhat");

async function main() {
  const proofRegistry = await hre.ethers.deployContract("PostProofRegistry");
  await proofRegistry.waitForDeployment();

  const contractAddress = await proofRegistry.getAddress();

  console.log("PostProofRegistry deployed to:", contractAddress);
  console.log("Copy this address to PROOF_REGISTRY_ADDRESS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
