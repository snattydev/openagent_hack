import { createApp } from '../src/api/server.js';
import { Engine } from '../src/logic/engine.js';
import { BalanceService } from '../src/services/balanceService.js';
import { ZeroGService } from '../src/services/0gService.js';
import { NewsService } from '../src/services/newsService.js';
import { LLMService } from '../src/services/llmService.js';
import { UniswapService } from '../src/services/uniswapService.js';
import { KeeperService } from '../src/services/keeperService.js';
import type { ServiceConfig } from '../src/types/index.js';

const config: ServiceConfig = {
  chainId: 84532,
  rpcUrl: '',
  privateKey: '',
  zeroGEndpoint: '',
  zeroGApiKey: '',
  keeperHubApiKey: '',
  llmApiKey: '',
  llmModel: 'gpt-4o-mini',
  cryptopanicApiKey: '',
  pollingIntervalMs: 300000,
  port: 3456,
  dryRun: true,
  useMockServices: true,
};

const engine = new Engine(
  new BalanceService({ mock: true }),
  new ZeroGService({ mock: true }),
  new NewsService({ mock: true }),
  new LLMService({ apiKey: '', model: 'gpt-4o-mini', mock: true }),
  new UniswapService({ mock: true }),
  new KeeperService({ mock: true }),
  config,
);

const app = createApp(engine);
const server = app.listen(3456, async () => {
  try {
    const res = await fetch('http://localhost:3456/api/health');
    const body = await res.json() as { status: string; timestamp: number };
    if (res.status === 200 && body.status === 'ok' && typeof body.timestamp === 'number') {
      console.log('✅ Smoke test passed');
      server.close(() => process.exit(0));
    } else {
      console.error('❌ Smoke test failed: unexpected response', body);
      server.close(() => process.exit(1));
    }
  } catch (err) {
    console.error('❌ Smoke test failed:', err);
    server.close(() => process.exit(1));
  }
});
