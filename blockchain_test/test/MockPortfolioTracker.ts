import { expect } from 'chai';
import { ethers } from 'ethers';
import hardhat from 'hardhat';

describe('MockPortfolioTracker', function () {
  let tracker: any;
  let owner: any;

  beforeEach(async function () {
    const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
    [owner] = await provider.listAccounts();

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
