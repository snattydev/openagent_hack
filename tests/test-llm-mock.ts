// ---------------------------------------------------------------------------
// Smoke test: LLMService mock mode
// Run: USE_MOCK_SERVICES=true npx tsx test-llm-mock.ts
// ---------------------------------------------------------------------------

import { LLMService } from '../src/services/llmService.js';
import type { NewsItem, AgentState, TokenBalance } from '../src/types/index.js';
import { DEFAULT_ALLOCATION } from '../src/config/constants.js';

function makeNewsItem(title: string): NewsItem {
  return {
    title,
    source: 'CryptoPanic',
    published_at: new Date().toISOString(),
    sentiment_vote: { positive: 0, negative: 0, important: 0 },
    currencies: ['ETH'],
  };
}

function makeState(
  lastDecision: import('../src/types/index.js').LLMDecision | null = null,
  timestamp?: number,
): AgentState {
  return {
    last_decision: lastDecision,
    portfolio_history: [],
    reasoning: '',
    timestamp: timestamp ?? 0,  // force cache expiry
    cycle_count: 0,
  };
}

function makePrices(): TokenBalance[] {
  return [
    { token: 'WETH', amount: 0.5, decimals: 18, price_usd: 3000 },
    { token: 'USDC', amount: 1000, decimals: 6, price_usd: 1 },
  ];
}

const state = makeState();

async function main() {
  const svc = new LLMService({ mock: true });
  const prices = makePrices();

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

  // ── Test bullish detection ──────────────────────────────────────────
  console.log('\n[1] Bullish detection');
  const bullishNews = [makeNewsItem('ETH set to rally after major approval')];
  const bullishResult = await svc.analyzeSentiment(bullishNews, state, prices);
  check('sentiment === "bullish"', bullishResult.sentiment === 'bullish', `got ${bullishResult.sentiment}`);
  check('WETH allocation > 0.5', bullishResult.target_allocation.WETH > 0.5, `got ${bullishResult.target_allocation.WETH}`);
  check('confidence >= 0.7', bullishResult.confidence >= 0.7, `got ${bullishResult.confidence}`);
  check('has key_signals', bullishResult.key_signals.length > 0, `got ${bullishResult.key_signals.length}`);
  check('reasoning <= 200 chars', bullishResult.reasoning.length <= 200, `got ${bullishResult.reasoning.length} chars`);

  // ── Test bearish detection ──────────────────────────────────────────
  console.log('\n[2] Bearish detection');
  const bearishNews = [makeNewsItem('Major exchange hack causes market crash')];
  const bearishResult = await svc.analyzeSentiment(bearishNews, state, prices);
  check('sentiment === "bearish"', bearishResult.sentiment === 'bearish', `got ${bearishResult.sentiment}`);
  check('USDC allocation > 0.5', bearishResult.target_allocation.USDC > 0.5, `got ${bearishResult.target_allocation.USDC}`);
  check('WETH allocation < 0.5', bearishResult.target_allocation.WETH < 0.5, `got ${bearishResult.target_allocation.WETH}`);

  // ── Test neutral fallback ───────────────────────────────────────────
  console.log('\n[3] Neutral fallback (no keywords)');
  const neutralNews = [makeNewsItem('Markets remain stable amid economic data release')];
  const neutralResult = await svc.analyzeSentiment(neutralNews, state, prices);
  check('sentiment === "neutral"', neutralResult.sentiment === 'neutral', `got ${neutralResult.sentiment}`);
  check('WETH === 0.5', neutralResult.target_allocation.WETH === DEFAULT_ALLOCATION.WETH, `got ${neutralResult.target_allocation.WETH}`);
  check('USDC === 0.5', neutralResult.target_allocation.USDC === DEFAULT_ALLOCATION.USDC, `got ${neutralResult.target_allocation.USDC}`);
  check('key_signals is empty', neutralResult.key_signals.length === 0, `got ${neutralResult.key_signals.length}`);

  // ── Test sentiment cache ────────────────────────────────────────────
  console.log('\n[4] Sentiment cache');
  const cachedState = makeState(
    { sentiment: 'bullish', confidence: 0.9, reasoning: 'cached', target_allocation: { WETH: 0.9, USDC: 0.1 }, key_signals: ['test'] },
    Date.now(), // fresh timestamp
  );
  const cachedResult = await svc.analyzeSentiment(bullishNews, cachedState, prices);
  check('returns cached decision', cachedResult.reasoning === 'cached');

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
