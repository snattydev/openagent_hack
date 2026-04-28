// ---------------------------------------------------------------------------
// Smoke test: Engine full cycle (mock mode)
// Run: USE_MOCK_SERVICES=true npx tsx test-engine.ts
// ---------------------------------------------------------------------------

import { Engine } from '../src/logic/engine.js';
import { BalanceService } from '../src/services/balanceService.js';
import { ZeroGService } from '../src/services/0gService.js';
import { NewsService } from '../src/services/newsService.js';
import { LLMService } from '../src/services/llmService.js';
import { UniswapService } from '../src/services/uniswapService.js';
import { KeeperService } from '../src/services/keeperService.js';
import { getConfig } from '../src/config/constants.js';
import { CycleStep } from '../src/types/index.js';

async function main() {
  const config = getConfig();

  const engine = new Engine({
    balanceService: new BalanceService({ mock: true }),
    zeroGService: new ZeroGService({ mock: true }),
    newsService: new NewsService({ mock: true }),
    llmService: new LLMService({ mock: true }),
    uniswapService: new UniswapService({ mock: true }),
    keeperService: new KeeperService({ mock: true }),
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

  // ── Test 1: runCycle returns 6 CycleResult objects ────────────────
  console.log('\n[1] runCycle returns 6 CycleResult objects');
  const results = await engine.runCycle();
  check('results array has 6 items', results.length === 6, `got ${results.length}`);

  // ── Test 2: All results have success: true ────────────────────────
  console.log('\n[2] All results have success: true');
  const allSuccess = results.every((r) => r.success === true);
  check('all steps succeeded', allSuccess, results.filter((r) => !r.success).map((r) => `${r.step}: ${r.error}`).join(', '));

  // ── Test 3: Each step type present ────────────────────────────────
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

  // ── Test 4: Step data is populated ────────────────────────────────
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

  // ── Test 5: isRunning is false after cycle ────────────────────────
  console.log('\n[5] isRunning is false after cycle completes');
  const status1 = engine.getStatus();
  check('isRunning is false', status1.isRunning === false, `got ${status1.isRunning}`);

  // ── Test 6: cycleCount >= 1 ───────────────────────────────────────
  console.log('\n[6] getStatus() returns cycleCount >= 1');
  check('cycleCount >= 1', status1.cycleCount >= 1, `got ${status1.cycleCount}`);

  // ── Test 7: Concurrency guard works ────────────────────────────────
  console.log('\n[7] Concurrency guard prevents overlapping cycles');
  engine['isRunning'] = true; // simulate another cycle in progress
  const blockedResults = await engine.runCycle();
  engine['isRunning'] = false;
  check('concurrent cycle returns empty array', blockedResults.length === 0, `got ${blockedResults.length}`);

  // ── Test 8: Multiple cycles increment counter ─────────────────────
  console.log('\n[8] Multiple cycles increment cycleCount');
  const beforeCount = engine.getStatus().cycleCount;
  await engine.runCycle();
  const afterCount = engine.getStatus().cycleCount;
  check('cycleCount increased', afterCount > beforeCount, `before=${beforeCount} after=${afterCount}`);

  // ── Summary ───────────────────────────────────────────────────────
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
