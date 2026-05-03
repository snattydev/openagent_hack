import { Engine } from '../../src/logic/engine.js';
import { CycleStep } from '../../src/types/index.js';
import type { NewsItem, LLMDecision, AgentState, PortfolioState, TokenBalance } from '../../src/types/index.js';

class TestBalanceService {
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

class Test0GService {
  private storage: Record<string, AgentState> = {};

  async loadState(agentId: string): Promise<AgentState | null> {
    return this.storage[agentId] ?? null;
  }

  async saveState(agentId: string, state: AgentState): Promise<void> {
    this.storage[agentId] = state;
  }
}

class TestNewsService {
  async fetchNews(): Promise<NewsItem[]> {
    return [
      {
        title: 'ETH ETF approved',
        source: 'test',
        published_at: new Date().toISOString(),
        sentiment_vote: { positive: 100, negative: 0, important: 50 },
        currencies: ['ETH'],
      },
    ];
  }
}

class TestLLMService {
  async analyzeSentiment(): Promise<LLMDecision> {
    return {
      sentiment: 'bullish',
      confidence: 0.85,
      reasoning: 'Bullish test signal',
      target_allocation: { WETH: 0.6, USDC: 0.4 },
      key_signals: ['ETH ETF approved'],
    };
  }
}

class TestUniswapService {
  async getQuote(fromToken: string, _toToken: string, amount: string) {
    return {
      from_token: fromToken,
      to_token: fromToken === 'WETH' ? 'USDC' : 'WETH',
      amount,
      expected_output: '1000000000',
      slippage: 0.005,
      route_data: { test: true },
    };
  }

  async getSwapCalldata() {
    return {
      to: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4',
      data: '0x0',
      value: '0',
    };
  }
}

class TestKeeperService {
  async submitTransaction() {
    return '0x' + '1'.repeat(64);
  }
}

async function main() {
  const config = {
    chainId: 84532,
    rpcUrl: '',
    privateKey: '0x' + '1'.repeat(64),
    zeroGEndpoint: '',
    zeroGApiKey: '',
    keeperHubApiKey: '',
    uniswapApiKey: '',
    llmApiKey: '',
    llmModel: 'gpt-4o-mini',
    llmBaseUrl: 'https://api.openai.com/v1',
    cryptopanicApiKey: '',
    pollingIntervalMs: 300000,
    port: 3000,
    dryRun: true,
  };

  const engine = new Engine({
    balanceService: new TestBalanceService() as any,
    zeroGService: new Test0GService() as any,
    newsService: new TestNewsService() as any,
    llmService: new TestLLMService() as any,
    uniswapService: new TestUniswapService() as any,
    keeperService: new TestKeeperService() as any,
    config,
  });

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

  console.log('\n[1] runCycle returns 6 CycleResult objects');
  const results = await engine.runCycle();
  check('results array has 6 items', results.length === 6, `got ${results.length}`);

  console.log('\n[2] All results have success: true');
  const allSuccess = results.every((r) => r.success === true);
  check('all steps succeeded', allSuccess, results.filter((r) => !r.success).map((r) => `${r.step}: ${r.error}`).join(', '));

  console.log('\n[3] Each step type present in order');
  const expectedSteps = [
    CycleStep.SENSE,
    CycleStep.REMEMBER,
    CycleStep.REASON,
    CycleStep.VALIDATE,
    CycleStep.EXECUTE,
    CycleStep.LOG,
  ];
  const actualSteps = results.map((r) => r.step);
  const stepsMatch = expectedSteps.every((s, i) => actualSteps[i] === s);
  check('steps are in correct order', stepsMatch, `expected ${expectedSteps.join(',')} got ${actualSteps.join(',')}`);

  console.log('\n[4] Step data is populated');
  const senseData = results.find((r) => r.step === CycleStep.SENSE)?.data;
  check('SENSE data has news', Array.isArray(senseData?.news), `news is ${typeof senseData?.news}`);
  check('SENSE data has balances', senseData?.balances != null, `balances is ${typeof senseData?.balances}`);

  const reasonData = results.find((r) => r.step === CycleStep.REASON)?.data;
  check('REASON data has sentiment', reasonData?.sentiment != null, `sentiment is ${reasonData?.sentiment}`);
  check('REASON data has target_allocation', reasonData?.target_allocation != null);

  const validateData = results.find((r) => r.step === CycleStep.VALIDATE)?.data;
  check('VALIDATE data has valid field', validateData?.valid !== undefined);

  const logData = results.find((r) => r.step === CycleStep.LOG)?.data;
  check('LOG data has cycle_count', logData?.cycle_count !== undefined);

  console.log('\n[5] isRunning is false after cycle completes');
  const status1 = engine.getStatus();
  check('isRunning is false', status1.isRunning === false, `got ${status1.isRunning}`);

  console.log('\n[6] getStatus() returns cycleCount >= 1');
  check('cycleCount >= 1', status1.cycleCount >= 1, `got ${status1.cycleCount}`);

  console.log('\n[7] Concurrency guard prevents overlapping cycles');
  engine['isRunning'] = true;
  const blockedResults = await engine.runCycle();
  engine['isRunning'] = false;
  check('concurrent cycle returns empty array', blockedResults.length === 0, `got ${blockedResults.length}`);

  console.log('\n[8] Multiple cycles increment cycleCount');
  const beforeCount = engine.getStatus().cycleCount;
  await engine.runCycle();
  const afterCount = engine.getStatus().cycleCount;
  check('cycleCount increased', afterCount > beforeCount, `before=${beforeCount} after=${afterCount}`);

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
