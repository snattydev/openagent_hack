import { expect } from 'chai';
import { ethers } from 'ethers';
import hardhat from 'hardhat';

describe('MockPortfolioTracker', function () {
  let tracker: any;
  let owner: any;

  beforeEach(async function () {
    // Hardhat v3: getOrCreate() returns the in-memory EDR network (no external node required)
    const network = await hardhat.network.getOrCreate();
    const provider = new ethers.BrowserProvider(network.provider);
    const accounts = await provider.listAccounts();
    owner = accounts[0];

    const artifact = await hardhat.artifacts.readArtifact('MockPortfolioTracker');
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, owner);
    tracker = await factory.deploy();
    await tracker.waitForDeployment();
  });

  it('should update and retrieve state', async function () {
    const tx = await tracker.updateState(1, ethers.encodeBytes32String('bullish'));
    await tx.wait();

    const state = await tracker.getState(owner.address);
    expect(state.cycleCount).to.equal(1n);
    expect(state.lastDecisionHash).to.equal(ethers.encodeBytes32String('bullish'));
    expect(Number(state.timestamp)).to.be.greaterThan(0);
  });
});
