import { getConfig } from '../../src/config/constants.js';
import { Engine } from '../../src/logic/engine.js';
import { CycleStep } from '../../src/types/index.js';
import type { NewsItem, LLMDecision, AgentState, PortfolioState } from '../../src/types/index.js';
import { createApp } from '../../src/api/server.js';

let cycleIndex = 0;

class VaryingBalanceService {
  async getWalletBalances(): Promise<PortfolioState> {
    const variations = [5800, 6150, 5920, 6380, 6050];
    const baseValue = variations[cycleIndex % variations.length];
    const wethAmount = baseValue * 0.5 / 2000;
    const usdcAmount = baseValue * 0.5;

    return {
      balances: [
        { token: 'WETH', amount: wethAmount, decimals: 18, price_usd: 2000 },
        { token: 'USDC', amount: usdcAmount, decimals: 6, price_usd: 1 },
      ],
      total_value_usd: baseValue,
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
  async fetchNews(): Promise<NewsItem[]> {
    return [
      {
        title: 'ETH ETF approved by SEC',
        source: 'demo',
        published_at: new Date().toISOString(),
        sentiment_vote: { positive: 100, negative: 0, important: 50 },
        currencies: ['ETH'],
      },
      {
        title: 'Ethereum network upgrade live',
        source: 'demo',
        published_at: new Date().toISOString(),
        sentiment_vote: { positive: 95, negative: 2, important: 40 },
        currencies: ['ETH'],
      },
    ];
  }
}

class DemoLLMService {
  async analyzeSentiment(): Promise<LLMDecision> {
    const decisions: LLMDecision[] = [
      {
        sentiment: 'bullish',
        confidence: 0.85,
        reasoning: 'ETF approval signals strong institutional adoption',
        target_allocation: { WETH: 0.58, USDC: 0.42 },
        key_signals: ['ETH ETF approved by SEC'],
      },
      {
        sentiment: 'bearish',
        confidence: 0.72,
        reasoning: 'Market correction expected after rapid gains',
        target_allocation: { WETH: 0.42, USDC: 0.58 },
        key_signals: ['Profit taking detected'],
      },
      {
        sentiment: 'neutral',
        confidence: 0.6,
        reasoning: 'Mixed signals, hold current allocation',
        target_allocation: { WETH: 0.5, USDC: 0.5 },
        key_signals: ['Consolidation phase'],
      },
    ];
    return decisions[cycleIndex % decisions.length];
  }
}

class DemoUniswapService {
  async getQuote(fromToken: string, _toToken: string, amount: string) {
    return {
      from_token: fromToken,
      to_token: fromToken === 'WETH' ? 'USDC' : 'WETH',
      amount,
      expected_output: String(Number(amount) * 1800),
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

class DemoKeeperService {
  async submitTransaction() {
    return '0x' + Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
  }
}

async function main() {
  console.log('=== CAPYMATE DASHBOARD DEMO ===');
  console.log('Running cycles with varying portfolio values...\n');

  const config = getConfig();
  config.privateKey = '0x' + '1'.repeat(64);
  config.dryRun = true;

  const balanceService = new VaryingBalanceService();
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

  for (let i = 0; i < 5; i++) {
    cycleIndex = i;
    console.log(`\n--- Cycle ${i + 1} ---`);
    const results = await engine.runCycle();

    const decision = results.find((r) => r.step === CycleStep.REASON && r.success)?.data;
    const validation = results.find((r) => r.step === CycleStep.VALIDATE && r.success)?.data;
    const execute = results.find((r) => r.step === CycleStep.EXECUTE && r.success)?.data;

    console.log(`  Portfolio: $${engine.state.portfolio_history.at(-1)?.total_value_usd}`);
    console.log(`  Sentiment: ${decision?.sentiment} (${decision?.confidence})`);
    console.log(`  Valid: ${validation?.valid}`);
    console.log(`  TX: ${execute?.txHash ? execute.txHash.slice(0, 20) + '...' : 'skipped'}`);

    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log('\n--- Starting API server for dashboard ---');
  const app = createApp(engine);
  app.listen(3000, () => {
    console.log('API server: http://localhost:3000');
    console.log('Dashboard:  cd dashboard && npm run dev');
    console.log('\nAvailable endpoints:');
    console.log('  GET  /api/health');
    console.log('  GET  /api/state');
    console.log('  GET  /api/status');
    console.log('  POST /api/trigger');
    console.log('  POST /api/sense');
    console.log('  POST /api/decide');
    console.log('\nPress Ctrl+C to stop');
  });
}

main().catch((err) => {
  console.error('Demo failed:', err);
  process.exit(1);
});
