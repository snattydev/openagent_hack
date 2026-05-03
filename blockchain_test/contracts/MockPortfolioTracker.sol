// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockPortfolioTracker
 * @dev Minimal on-chain state proxy for gas-efficient agent memory.
 *      In production the agent would persist a hash or Merkle root here
 *      while keeping the bulk of history on 0G.
 */
contract MockPortfolioTracker {
    struct State {
        uint256 cycleCount;
        bytes32 lastDecisionHash;
        uint256 timestamp;
    }

    mapping(address => State) public states;

    event StateUpdated(
        address indexed agent,
        uint256 cycleCount,
        bytes32 lastDecisionHash,
        uint256 timestamp
    );

    function updateState(uint256 _cycleCount, bytes32 _lastDecisionHash) external {
        states[msg.sender] = State({
            cycleCount: _cycleCount,
            lastDecisionHash: _lastDecisionHash,
            timestamp: block.timestamp
        });
        emit StateUpdated(msg.sender, _cycleCount, _lastDecisionHash, block.timestamp);
    }

    function getState(address _agent) external view returns (State memory) {
        return states[_agent];
    }
}
