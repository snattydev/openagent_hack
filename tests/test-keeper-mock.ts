import { KeeperService } from '../src/services/keeperService.js';

async function main() {
  const service = new KeeperService({ mock: true, dryRun: true });

  const hash = await service.submitTransaction({
    to: '0x4200000000000000000000000000000000000006',
    data: '0x',
    value: '0',
  });

  if (!hash.startsWith('0x')) {
    throw new Error(`Hash does not start with 0x: ${hash}`);
  }

  if (hash.length !== 66) {
    throw new Error(`Hash length is not 66: ${hash.length}`);
  }

  console.log('✅ Mock mode + dryRun smoke test passed');
  console.log(`   txHash: ${hash}`);
}

main().catch((err) => {
  console.error('❌ Smoke test failed:', err);
  process.exit(1);
});
