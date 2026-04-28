// ---------------------------------------------------------------------------
// Smoke test: Zod validation fallback
// Run: npx tsx test-llm-zod.ts
// ---------------------------------------------------------------------------
// This test verifies that when Zod validation fails (e.g., malformed JSON from
// an LLM), the LLMService gracefully falls back instead of crashing.
// We inject a mock that returns invalid data to trigger the Zod path.
// ---------------------------------------------------------------------------

import { LLMService } from '../src/services/llmService.js';
import type { LLMDecision, AgentState, TokenBalance } from '../src/types/index.js';
import { DEFAULT_ALLOCATION } from '../src/config/constants.js';

function makeState(
  lastDecision: LLMDecision | null = null,
  timestamp?: number,
): AgentState {
  return {
    last_decision: lastDecision,
    portfolio_history: [],
    reasoning: '',
    timestamp: timestamp ?? 0,
    cycle_count: 0,
  };
}

function makePrices(): TokenBalance[] {
  return [
    { token: 'WETH', amount: 0.5, decimals: 18, price_usd: 3000 },
    { token: 'USDC', amount: 1000, decimals: 6, price_usd: 1 },
  ];
}

async function main() {
  let passed = 0;
  let failed = 0;

  function check(name: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`  PASS: ${name}`);
      passed++;
    } else {
      console.log(`  FAIL: ${name}${detail ? ' — ' + detail : ''}`);
      failed++;
    }
  }

  const prices = makePrices();

  // ── Scenario 1: Invalid data, no prior decision → DEFAULT_ALLOCATION ──
  console.log('\n[1] Zod failure → fallback to DEFAULT_ALLOCATION');
  const svc = new LLMService({ mock: true });
  // Monkey-patch mockAnalyze to return invalid shape (wrong types)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (svc as any).mockAnalyze = () => ({
    sentiment: 'INVALID_SENTIMENT',
    confidence: 'not_a_number',
    reasoning: 123,
    target_allocation: { WETH: 'oops', USDC: null },
    key_signals: 'not_an_array',
  });

  const result1 = await svc.analyzeSentiment(
    [{ title: 'anything', source: 'test', published_at: new Date().toISOString(), sentiment_vote: { positive: 0, negative: 0, important: 0 }, currencies: ['ETH'] }],
    makeState(null),
    prices,
  );
  check('falls back to DEFAULT_ALLOCATION', result1.target_allocation.WETH === DEFAULT_ALLOCATION.WETH && result1.target_allocation.USDC === DEFAULT_ALLOCATION.USDC);
  check('neutral sentiment', result1.sentiment === 'neutral');
  check('reasoning mentions fallback', result1.reasoning.includes('Fallback'));

  // ── Scenario 2: Invalid data, but prior decision exists → last_decision ──
  console.log('\n[2] Zod failure → fallback to last_decision');
  const priorDecision: LLMDecision = {
    sentiment: 'bearish',
    confidence: 0.88,
    reasoning: 'previous crash analysis',
    target_allocation: { WETH: 0.2, USDC: 0.8 },
    key_signals: ['previous signal'],
  };

  const result2 = await svc.analyzeSentiment(
    [{ title: 'anything', source: 'test', published_at: new Date().toISOString(), sentiment_vote: { positive: 0, negative: 0, important: 0 }, currencies: ['ETH'] }],
    makeState(priorDecision),
    prices,
  );
  check('returns last_decision', result2.reasoning === 'previous crash analysis');
  check('sentiment preserved', result2.sentiment === 'bearish');
  check('allocation preserved', result2.target_allocation.WETH === 0.2 && result2.target_allocation.USDC === 0.8);

  // ── Summary ─────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
