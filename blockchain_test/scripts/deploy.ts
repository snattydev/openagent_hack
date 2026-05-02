import { ethers } from 'ethers';
import hardhat from 'hardhat';

async function main() {
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const [deployer] = await provider.listAccounts();
  console.log('Deploying contracts with the account:', deployer.address);

  const artifact = await hardhat.artifacts.readArtifact('MockPortfolioTracker');
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
  const tracker = await factory.deploy();
  await tracker.waitForDeployment();

  const address = await tracker.getAddress();
  console.log('MockPortfolioTracker deployed to:', address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
