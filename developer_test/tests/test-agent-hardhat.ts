import { ethers } from 'ethers';
import { Engine } from '../../src/logic/engine.js';
import type { PortfolioState, AgentState, NewsItem, LLMDecision, TokenBalance } from '../../src/types/index.js';

const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const RPC_URL = 'http://127.0.0.1:8545';

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
  console.log('=== CapyMate Agent + Hardhat Blockchain Integration Test ===\n');

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const network = await provider.getNetwork();
  const blockNumber = await provider.getBlockNumber();

  console.log(`Connected to local Hardhat node:`);
  console.log(`  Chain ID: ${network.chainId}`);
  console.log(`  Block: ${blockNumber}`);
  console.log(`  Contract: ${CONTRACT_ADDRESS}\n`);

  const config = {
    chainId: 31337,
    rpcUrl: RPC_URL,
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

  console.log('Running full agent cycle...\n');
  const results = await engine.runCycle();

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

  console.log('[1] Cycle completed all 6 steps');
  check('6 results returned', results.length === 6, `got ${results.length}`);

  console.log('\n[2] All steps succeeded');
  const allSuccess = results.every((r) => r.success);
  check('no failures', allSuccess, results.filter((r) => !r.success).map((r) => `${r.step}: ${r.error}`).join(', '));

  console.log('\n[3] Step order validation');
  const steps = results.map((r) => r.step);
  check('SENSE first', steps[0] === 'SENSE');
  check('REMEMBER second', steps[1] === 'REMEMBER');
  check('REASON third', steps[2] === 'REASON');
  check('VALIDATE fourth', steps[3] === 'VALIDATE');
  check('EXECUTE fifth', steps[4] === 'EXECUTE');
  check('LOG sixth', steps[5] === 'LOG');

  console.log('\n[4] Step data validation');
  const senseData = results.find((r) => r.step === 'SENSE')?.data;
  check('SENSE has news', Array.isArray(senseData?.news));
  check('SENSE has balances', senseData?.balances != null);

  const reasonData = results.find((r) => r.step === 'REASON')?.data;
  check('REASON has sentiment', ['bullish', 'bearish', 'neutral'].includes(reasonData?.sentiment));
  check('REASON has allocation', reasonData?.target_allocation != null);

  const validateData = results.find((r) => r.step === 'VALIDATE')?.data;
  check('VALIDATE has result', validateData?.valid !== undefined);

  const logData = results.find((r) => r.step === 'LOG')?.data;
  check('LOG has cycle_count', typeof logData?.cycle_count === 'number');

  console.log('\n[5] Blockchain connectivity');
  const code = await provider.getCode(CONTRACT_ADDRESS);
  check('contract has bytecode', code.length > 2, `bytecode length: ${code.length}`);

  console.log('\n[6] State persistence');
  const status = engine.getStatus();
  check('cycleCount incremented', status.cycleCount >= 1, `got ${status.cycleCount}`);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
