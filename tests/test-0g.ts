import { ZeroGService } from '../src/services/0gService.js';
import type { AgentState } from '../src/types/index.js';

async function runSmokeTest(): Promise<void> {
  const service = new ZeroGService({ mock: true });

  const testState: AgentState = {
    last_decision: {
      sentiment: 'bullish',
      confidence: 0.85,
      reasoning: 'Strong upward momentum detected',
      target_allocation: { WETH: 0.7, USDC: 0.3 },
      key_signals: ['price_breakout', 'volume_spike'],
    },
    portfolio_history: [
      {
        balances: [
          { token: 'WETH', amount: 1.5, decimals: 18, price_usd: 3200 },
          { token: 'USDC', amount: 3000, decimals: 6, price_usd: 1 },
        ],
        total_value_usd: 7800,
        current_allocation: { WETH: 0.615, USDC: 0.385 },
        target_allocation: { WETH: 0.7, USDC: 0.3 },
      },
    ],
    reasoning: 'Rebalancing towards higher WETH exposure based on bullish sentiment',
    timestamp: Date.now(),
    cycle_count: 42,
  };

  console.log('Saving state for agent-1...');
  await service.saveState('agent-1', testState);

  console.log('Loading state for agent-1...');
  const loaded = await service.loadState('agent-1');

  if (loaded === null) {
    console.error('FAIL: Expected state for agent-1, got null');
    process.exit(1);
  }

  if (JSON.stringify(loaded) !== JSON.stringify(testState)) {
    console.error('FAIL: Loaded state does not match saved state');
    console.error('Expected:', JSON.stringify(testState, null, 2));
    console.error('Got:', JSON.stringify(loaded, null, 2));
    process.exit(1);
  }

  console.log('PASS: Round-trip save/load for agent-1 succeeded');

  console.log('Loading state for unknown-agent...');
  const unknown = await service.loadState('unknown-agent');

  if (unknown !== null) {
    console.error('FAIL: Expected null for unknown-agent, got:', unknown);
    process.exit(1);
  }

  console.log('PASS: loadState returns null for unknown agent');
  console.log('\nAll smoke tests passed!');
}

runSmokeTest().catch((err) => {
  console.error('Smoke test failed with error:', err);
  process.exit(1);
});
