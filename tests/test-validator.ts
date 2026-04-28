// ---------------------------------------------------------------------------
// Smoke tests for validateRebalance — one test per safety rule
// ---------------------------------------------------------------------------

import { validateRebalance } from '../src/logic/validator.js';
import type { PortfolioState, LLMDecision } from '../src/types/index.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, details?: string): void {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.error(`  ❌ ${label}`);
    if (details) console.error(`     ${details}`);
  }
}

function makePortfolio(overrides?: Partial<PortfolioState>): PortfolioState {
  return {
    balances: [],
    total_value_usd: 1000,
    current_allocation: { WETH: 0.5, USDC: 0.5 },
    target_allocation: { WETH: 0.5, USDC: 0.5 },
    ...overrides,
  };
}

function makeDecision(
  overrides?: Partial<LLMDecision>,
): LLMDecision {
  return {
    sentiment: 'neutral',
    confidence: 0.5,
    reasoning: 'test',
    target_allocation: { WETH: 0.5, USDC: 0.5 },
    key_signals: [],
    ...overrides,
  };
}

// ── Test 1: Valid rebalance (WETH changes by 10 %) ──────────────────────
{
  console.log('\nTest 1: Valid rebalance (WETH 0.5 → 0.6, change = 10%)');
  const result = validateRebalance(
    makePortfolio({ current_allocation: { WETH: 0.5, USDC: 0.5 } }),
    makeDecision({ target_allocation: { WETH: 0.6, USDC: 0.4 } }),
    0,
    Date.now() - 20 * 60 * 1000,
  );
  assert(result.valid, 'Should be valid', JSON.stringify(result));
}

// ── Test 2: Fail — token whitelist violation (includes BTC) ─────────────
{
  console.log('\nTest 2: Fail whitelist (target includes BTC)');
  const badDecision = {
    ...makeDecision(),
    target_allocation: { WETH: 0.5, USDC: 0.3, BTC: 0.2 } as any,
  };
  const result = validateRebalance(
    makePortfolio(),
    badDecision as LLMDecision,
    0,
    Date.now() - 20 * 60 * 1000,
  );
  assert(
    !result.valid,
    'Should be invalid',
    `reason: ${result.reason}`,
  );
  assert(
    result.reason?.includes('whitelist') ?? false,
    'Reason should mention whitelist',
    result.reason,
  );
}

// ── Test 3: Fail — min rebalance threshold (WETH change = 1 %) ──────────
{
  console.log('\nTest 3: Fail threshold (WETH 0.5 → 0.51, change = 1%)');
  const result = validateRebalance(
    makePortfolio({ current_allocation: { WETH: 0.5, USDC: 0.5 } }),
    makeDecision({ target_allocation: { WETH: 0.51, USDC: 0.49 } }),
    0,
    Date.now() - 20 * 60 * 1000,
  );
  assert(!result.valid, 'Should be invalid (below 2% threshold)', JSON.stringify(result));
}

// ── Test 4: Fail — max single trade (trade > 10 % of portfolio) ─────────
{
  console.log('\nTest 4: Fail max trade (WETH 0.5 → 0.7, change = 20% > 10%)');
  const result = validateRebalance(
    makePortfolio({
      total_value_usd: 1000,
      current_allocation: { WETH: 0.5, USDC: 0.5 },
    }),
    makeDecision({ target_allocation: { WETH: 0.7, USDC: 0.3 } }),
    0,
    Date.now() - 20 * 60 * 1000,
  );
  assert(!result.valid, 'Should be invalid (exceeds 10% max)', JSON.stringify(result));
}

// ── Test 5: Fail — cooldown (last trade 5 min ago) ──────────────────────
{
  console.log('\nTest 5: Fail cooldown (last trade 5 min ago, need 15 min)');
  const result = validateRebalance(
    makePortfolio({
      current_allocation: { WETH: 0.5, USDC: 0.5 },
    }),
    makeDecision({ target_allocation: { WETH: 0.6, USDC: 0.4 } }),
    0,
    Date.now() - 5 * 60 * 1000,
  );
  assert(!result.valid, 'Should be invalid (cooldown active)', JSON.stringify(result));
  assert(
    result.reason?.toLowerCase().includes('cooldown') ?? false,
    'Reason should mention cooldown',
    result.reason,
  );
}

// ── Test 6: Fail — max daily trades (count = 6) ─────────────────────────
{
  console.log('\nTest 6: Fail max daily trades (count = 6, limit = 6)');
  const result = validateRebalance(
    makePortfolio({
      current_allocation: { WETH: 0.5, USDC: 0.5 },
    }),
    makeDecision({ target_allocation: { WETH: 0.6, USDC: 0.4 } }),
    6,
    Date.now() - 20 * 60 * 1000,
  );
  assert(!result.valid, 'Should be invalid (daily limit reached)', JSON.stringify(result));
}

// ── Test 7: Edge case — zero portfolio value ────────────────────────────
{
  console.log('\nTest 7: Edge case — zero portfolio value');
  const result = validateRebalance(
    makePortfolio({ total_value_usd: 0 }),
    makeDecision(),
    0,
    0,
  );
  assert(result.valid, 'Should be valid (let zero-value pass)', JSON.stringify(result));
}

// ── Test 8: Edge case — lastTradeTime = 0 (no prior trade, skip cooldown)
{
  console.log('\nTest 8: Edge case — lastTradeTime = 0 (no prior trade)');
  const result = validateRebalance(
    makePortfolio({
      current_allocation: { WETH: 0.5, USDC: 0.5 },
    }),
    makeDecision({ target_allocation: { WETH: 0.6, USDC: 0.4 } }),
    0,
    0,
  );
  assert(result.valid, 'Should be valid (cooldown skipped for first trade)', JSON.stringify(result));
}

// ── Summary ─────────────────────────────────────────────────────────────
console.log(`\n${'='.repeat(50)}`);
console.log(`Passed: ${passed} | Failed: ${failed}`);
if (failed > 0) process.exit(1);
