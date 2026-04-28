import { getConfig } from '../src/config/constants.js';
import { BalanceService } from '../src/services/balanceService.js';
import { ZeroGService } from '../src/services/0gService.js';
import { NewsService } from '../src/services/newsService.js';
import { LLMService } from '../src/services/llmService.js';
import { UniswapService } from '../src/services/uniswapService.js';
import { KeeperService } from '../src/services/keeperService.js';
import { Engine } from '../src/logic/engine.js';
import { NewsItem, CycleStep, LLMDecision, AgentState, TokenBalance } from '../src/types/index.js';

class DemoNewsService extends NewsService {
  private customNews: NewsItem[] | null = null;

  setCustomNews(news: NewsItem[]) {
    this.customNews = news;
  }

  async fetchNews(currencies: string[]): Promise<NewsItem[]> {
    if (this.customNews) {
      return this.customNews;
    }
    return super.fetchNews(currencies);
  }
}

class DemoLLMService extends LLMService {
  private customDecision: LLMDecision | null = null;

  setCustomDecision(decision: LLMDecision) {
    this.customDecision = decision;
  }

  async analyzeSentiment(
    news: NewsItem[],
    currentState: AgentState,
    prices: TokenBalance[],
  ): Promise<LLMDecision> {
    if (this.customDecision) {
      return this.customDecision;
    }
    return super.analyzeSentiment(news, currentState, prices);
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
  if (!config.useMockServices) {
    console.warn('Forcing USE_MOCK_SERVICES=true for safety');
    config.useMockServices = true;
  }
  console.log('Config loaded. Mock mode:', config.useMockServices);

  const balanceService = new BalanceService({ mock: true });
  const zeroGService = new ZeroGService({ mock: true });
  const newsService = new DemoNewsService({ mock: true });
  const llmService = new DemoLLMService({ mock: true });
  const uniswapService = new UniswapService({ mock: true });
  const keeperService = new KeeperService({ mock: true, dryRun: true });

  const engine = new Engine({
    balanceService,
    zeroGService,
    newsService,
    llmService,
    uniswapService,
    keeperService,
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
  console.log('Demo complete. Check data/agent-state.json for persisted state.');
  printSeparator();
}

main().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
