import { JsonRpcProvider } from 'ethers';
import http from 'http';
import { getConfig } from './config/constants.js';
import { BalanceService } from './services/balanceService.js';
import { ZeroGService } from './services/0gService.js';
import { NewsService } from './services/newsService.js';
import { LLMService } from './services/llmService.js';
import { UniswapService } from './services/uniswapService.js';
import { KeeperService } from './services/keeperService.js';
import { Engine } from './logic/engine.js';
import { startServer } from './api/server.js';

/**
 * Initialise all services and start the agent.
 * Exported for testability.
 */
export async function main(): Promise<http.Server> {
  const config = getConfig();

  const provider = config.rpcUrl ? new JsonRpcProvider(config.rpcUrl) : undefined;

  const balanceService = new BalanceService({
    provider,
    mock: config.useMockServices,
  });

  const zeroGService = new ZeroGService({
    indexerUrl: config.zeroGEndpoint,
    apiKey: config.zeroGApiKey,
    mock: config.useMockServices,
  });

  const newsService = new NewsService({
    apiKey: config.cryptopanicApiKey,
    mock: config.useMockServices,
  });

  const llmService = new LLMService({
    apiKey: config.llmApiKey,
    model: config.llmModel,
    baseUrl: config.llmBaseUrl,
    mock: config.useMockServices,
  });

  const uniswapService = new UniswapService({
    apiKey: config.uniswapApiKey,
    chainId: config.chainId,
    mock: config.useMockServices,
  });

  const keeperService = new KeeperService({
    rpcUrl: config.rpcUrl,
    privateKey: config.privateKey,
    keeperHubApiKey: config.keeperHubApiKey,
    chainId: config.chainId,
    mock: config.useMockServices,
    dryRun: config.dryRun,
  });

  const engine = new Engine({
    balanceService,
    zeroGService,
    newsService,
    llmService,
    uniswapService,
    keeperService,
    config,
  });

  const server = startServer(engine, config.port);

  console.log(
    `CapyMate agent started on port ${config.port} [mock=${config.useMockServices}, dryRun=${config.dryRun}]`,
  );

  if (!config.useMockServices) {
    setInterval(() => { engine.runCycle().catch((err) => console.error('[Polling] Cycle error:', err)); }, config.pollingIntervalMs);
  }

  const shutdown = (): void => {
    console.log('Shutting down...');
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}

// Run when executed directly
main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
