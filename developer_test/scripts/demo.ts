import { getConfig } from '../../src/config/constants.js';
import { Engine } from '../../src/logic/engine.js';
import { CycleStep } from '../../src/types/index.js';
import type { NewsItem, LLMDecision, AgentState, PortfolioState, TokenBalance } from '../../src/types/index.js';

class DemoBalanceService {
  async getWalletBalances(): Promise<PortfolioState> {
    return {
      balances: [
        { token: 'WETH', amount: 1.5, decimals: 18, price_usd: 2000 },
        { token: 'USDC', amount: 3000, decimals: 6, price_usd: 1 },
      ],
      total_value_usd: 6000,
      current_allocation: { WETH: 0.5, USDC: 0.5 },
      target_allocation: { WETH: 0.5, USDC: 0.5 },
      timestamp: Date.now(),
    };
  }
}

class Demo0GService {
  private storage: Record<string, AgentState> = {};

  async loadState(agentId: string): Promise<AgentState | null> {
    return this.storage[agentId] ?? null;
  }

  async saveState(agentId: string, state: AgentState): Promise<void> {
    this.storage[agentId] = state;
  }
}

class DemoNewsService {
  private customNews: NewsItem[] | null = null;

  setCustomNews(news: NewsItem[]) {
    this.customNews = news;
  }

  async fetchNews(): Promise<NewsItem[]> {
    return this.customNews ?? [];
  }
}

class DemoLLMService {
  private customDecision: LLMDecision | null = null;

  setCustomDecision(decision: LLMDecision) {
    this.customDecision = decision;
  }

  async analyzeSentiment(): Promise<LLMDecision> {
    if (this.customDecision) {
      return this.customDecision;
    }
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      reasoning: 'Default fallback',
      target_allocation: { WETH: 0.5, USDC: 0.5 },
      key_signals: [],
    };
  }
}

class DemoUniswapService {
  async getQuote(fromToken: string, _toToken: string, amount: string) {
    return {
      from_token: fromToken,
      to_token: fromToken === 'WETH' ? 'USDC' : 'WETH',
      amount,
      expected_output: '0',
      slippage: 0.005,
      route_data: { mock: true },
    };
  }

  async getSwapCalldata() {
    return {
      to: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4',
      data: '0xc04...',
      value: '0',
    };
  }
}

class DemoKeeperService {
  async submitTransaction() {
    const hex = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
    return `0x${hex}`;
  }
}

function printSeparator() {
  console.log('\n' + '='.repeat(60) + '\n');
}

function printSubSeparator() {
  console.log('-'.repeat(40));
}

function nowIso(): string {
  return new Date().toISOString();
}

async function main() {
  printSeparator();
  console.log('=== CAPYMATE HACKATHON DEMO ===');
  printSeparator();

  const config = getConfig();
  config.privateKey = '0x' + '1'.repeat(64);
  config.dryRun = true;
  console.log('Config loaded. DRY_RUN:', config.dryRun);

  const balanceService = new DemoBalanceService();
  const zeroGService = new Demo0GService();
  const newsService = new DemoNewsService();
  const llmService = new DemoLLMService();
  const uniswapService = new DemoUniswapService();
  const keeperService = new DemoKeeperService();

  const engine = new Engine({
    balanceService: balanceService as any,
    zeroGService: zeroGService as any,
    newsService: newsService as any,
    llmService: llmService as any,
    uniswapService: uniswapService as any,
    keeperService: keeperService as any,
    config,
  });

  printSeparator();
  console.log('SCENARIO A: BULLISH MARKET');
  printSubSeparator();

  const bullishHeadlines: NewsItem[] = [
    {
      title: 'ETH ETF approved',
      source: 'demo',
      published_at: nowIso(),
      sentiment_vote: { positive: 100, negative: 0, important: 50 },
      currencies: ['ETH'],
    },
    {
      title: 'Ethereum surges 20%',
      source: 'demo',
      published_at: nowIso(),
      sentiment_vote: { positive: 95, negative: 2, important: 40 },
      currencies: ['ETH'],
    },
  ];

  newsService.setCustomNews(bullishHeadlines);
  llmService.setCustomDecision({
    sentiment: 'bullish',
    confidence: 0.85,
    reasoning: 'Bullish signals: ETH ETF approved, Ethereum surges 20%',
    target_allocation: { WETH: 0.58, USDC: 0.42 },
    key_signals: ['ETH ETF approved', 'Ethereum surges 20%'],
  });

  const bullishResults = await engine.runCycle();

  const bullishDecision = bullishResults.find(
    (r) => r.step === CycleStep.REASON && r.success,
  );
  const bullishValidation = bullishResults.find(
    (r) => r.step === CycleStep.VALIDATE && r.success,
  );
  const bullishExecute = bullishResults.find(
    (r) => r.step === CycleStep.EXECUTE && r.success,
  );

  console.log('LLM Decision:');
  console.log('  Sentiment:', bullishDecision?.data?.sentiment);
  console.log('  Confidence:', bullishDecision?.data?.confidence);
  console.log('  Reasoning:', bullishDecision?.data?.reasoning);
  console.log('  Target Allocation:', JSON.stringify(bullishDecision?.data?.target_allocation));

  console.log('Validation:');
  console.log('  Valid:', bullishValidation?.data?.valid);
  console.log('  Reason:', bullishValidation?.data?.reason);

  console.log('Trade Execution:');
  console.log('  TX Hash:', bullishExecute?.data?.txHash ?? 'N/A');
  console.log('  Skipped:', bullishExecute?.data?.skipped ?? false);
  console.log('  Reason:', bullishExecute?.data?.reason ?? 'N/A');

  Reflect.set(engine, 'dailyTradeCount', 0);
  Reflect.set(engine, 'lastTradeTime', 0);

  printSeparator();
  console.log('SCENARIO B: BEARISH MARKET');
  printSubSeparator();

  const bearishHeadlines: NewsItem[] = [
    {
      title: 'Major exchange hacked',
      source: 'demo',
      published_at: nowIso(),
      sentiment_vote: { positive: 0, negative: 100, important: 50 },
      currencies: ['ETH'],
    },
    {
      title: 'Crypto market crashes',
      source: 'demo',
      published_at: nowIso(),
      sentiment_vote: { positive: 2, negative: 95, important: 40 },
      currencies: ['ETH'],
    },
  ];

  newsService.setCustomNews(bearishHeadlines);
  llmService.setCustomDecision({
    sentiment: 'bearish',
    confidence: 0.82,
    reasoning: 'Bearish signals: Major exchange hacked, Crypto market crashes',
    target_allocation: { WETH: 0.42, USDC: 0.58 },
    key_signals: ['Major exchange hacked', 'Crypto market crashes'],
  });

  const bearishResults = await engine.runCycle();

  const bearishDecision = bearishResults.find(
    (r) => r.step === CycleStep.REASON && r.success,
  );
  const bearishValidation = bearishResults.find(
    (r) => r.step === CycleStep.VALIDATE && r.success,
  );
  const bearishExecute = bearishResults.find(
    (r) => r.step === CycleStep.EXECUTE && r.success,
  );

  console.log('LLM Decision:');
  console.log('  Sentiment:', bearishDecision?.data?.sentiment);
  console.log('  Confidence:', bearishDecision?.data?.confidence);
  console.log('  Reasoning:', bearishDecision?.data?.reasoning);
  console.log('  Target Allocation:', JSON.stringify(bearishDecision?.data?.target_allocation));

  console.log('Validation:');
  console.log('  Valid:', bearishValidation?.data?.valid);
  console.log('  Reason:', bearishValidation?.data?.reason);

  console.log('Trade Execution:');
  console.log('  TX Hash:', bearishExecute?.data?.txHash ?? 'N/A');
  console.log('  Skipped:', bearishExecute?.data?.skipped ?? false);
  console.log('  Reason:', bearishExecute?.data?.reason ?? 'N/A');

  printSeparator();
  console.log('MEMORY PERSISTENCE DEMO');
  printSubSeparator();

  const savedState = await zeroGService.loadState('capymate-v1');
  if (savedState) {
    console.log(`Agent remembers ${savedState.cycle_count} previous cycles`);
    console.log('Last decision sentiment:', savedState.last_decision?.sentiment);
  } else {
    console.log('No persisted state found');
  }

  printSeparator();
  console.log('Demo complete.');
  printSeparator();
}

main().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
