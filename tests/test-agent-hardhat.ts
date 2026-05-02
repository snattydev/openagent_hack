// ---------------------------------------------------------------------------
// Integration Test: CapyMate Agent + Hardhat Local Blockchain
// This test runs the full agent cycle against a local Hardhat node with the
// MockPortfolioTracker contract deployed.
//
// For REAL LLM mode (DeepSeek V4 flash), set in .env:
//   LLM_API_KEY=sk-your-key
//   LLM_BASE_URL=https://api.deepseek.com/v1
//   LLM_MODEL=deepseek-chat
//   USE_MOCK_SERVICES=false
//
// Run with mock LLM (no API key needed):
//   npx tsx tests/test-agent-hardhat.ts
//
// Run with real DeepSeek LLM:
//   LLM_API_KEY=sk-your-key LLM_BASE_URL=https://api.deepseek.com/v1 \
//     LLM_MODEL=deepseek-chat USE_MOCK_SERVICES=false \
//     npx tsx tests/test-agent-hardhat.ts
// ---------------------------------------------------------------------------

import { ethers } from 'ethers';
import { Engine } from '../src/logic/engine.js';
import { BalanceService } from '../src/services/balanceService.js';
import { ZeroGService } from '../src/services/0gService.js';
import { NewsService } from '../src/services/newsService.js';
import { LLMService } from '../src/services/llmService.js';
import { UniswapService } from '../src/services/uniswapService.js';
import { KeeperService } from '../src/services/keeperService.js';
import { getConfig } from '../src/config/constants.js';

const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const RPC_URL = 'http://127.0.0.1:8545';

async function main() {
  console.log('=== CapyMate Agent + Hardhat Blockchain Integration Test ===\n');

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const network = await provider.getNetwork();
  const blockNumber = await provider.getBlockNumber();

  console.log(`Connected to local Hardhat node:`);
  console.log(`  Chain ID: ${network.chainId}`);
  console.log(`  Block: ${blockNumber}`);
  console.log(`  Contract: ${CONTRACT_ADDRESS}\n`);

  const config = getConfig();
  const useMock = process.env.USE_MOCK_SERVICES !== 'false';
  const useRealLLM = !useMock && !!config.llmApiKey;

  console.log(`Mode: ${useMock ? 'MOCK' : 'REAL'}`);
  console.log(`LLM: ${useRealLLM ? 'DeepSeek V4 flash (real)' : 'Mock keyword matching'}`);
  console.log(`Blockchain: Local Hardhat (EDR simulated)\n`);

  const engine = new Engine({
    balanceService: new BalanceService({ mock: useMock }),
    zeroGService: new ZeroGService({ mock: useMock }),
    newsService: new NewsService({ mock: useMock }),
    llmService: new LLMService({
      apiKey: config.llmApiKey,
      model: config.llmModel,
      mock: useMock,
    }),
    uniswapService: new UniswapService({ mock: useMock }),
    keeperService: new KeeperService({ mock: useMock, dryRun: true }),
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

  if (useMock) {
    console.log('\nNOTE: Test ran in MOCK mode.');
    console.log('To test with REAL DeepSeek V4 flash LLM:');
    console.log('  1. Get a DeepSeek API key from https://platform.deepseek.com');
    console.log('  2. Set LLM_API_KEY=sk-your-key in .env');
    console.log('  3. Set LLM_BASE_URL=https://api.deepseek.com/v1 in .env');
    console.log('  4. Set LLM_MODEL=deepseek-chat in .env');
    console.log('  5. Set USE_MOCK_SERVICES=false in .env');
    console.log('  6. Re-run: npx tsx tests/test-agent-hardhat.ts');
  }

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
