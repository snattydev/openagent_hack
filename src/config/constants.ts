// ---------------------------------------------------------------------------
// CapyMate – Configuration constants
// ---------------------------------------------------------------------------

import dotenv from 'dotenv';
import { ServiceConfig } from '../types/index.js';

// ── Safety thresholds ──────────────────────────────────────────────────────
export const SAFETY_CONFIG = {
  ALLOWED_TOKENS: ['WETH', 'USDC'] as const,
  MIN_REBALANCE_THRESHOLD: 0.02,
  MAX_SINGLE_TRADE_PERCENT: 0.10,
  MAX_SLIPPAGE: 0.005,
  COOLDOWN_MINUTES: 15,
  MAX_DAILY_TRADES: 6,
  SENTIMENT_CACHE_MINUTES: 10,
} as const;

// ── Storage configuration ───────────────────────────────────────────────────

export const STORAGE_CONFIG = {
  /** Maximum portfolio history entries to persist (bounds 0G payload size). */
  MAX_PERSISTED_HISTORY_ENTRIES: 20,
} as const;

// ── Network configuration ───────────────────────────────────────────────────

export const NETWORK_CONFIG = {
  CHAIN_ID: 84532,
  RPC_URL: process.env.RPC_URL ?? '',
  WETH_ADDRESS: '0x4200000000000000000000000000000000000006',
  /** Circle-issued USDC on Base Sepolia (FiatTokenV2_2 proxy, 6 decimals).
   *  Verified 2026-04-28 via Circle docs & BaseScan Sepolia.
   *  Source: https://sepolia.basescan.org/token/0x036cbd53842c5426634e7929541ec2318f3dcf7e */
  USDC_ADDRESS: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
} as const;

// ── Contract addresses ──────────────────────────────────────────────────────

export const CONTRACT_ADDRESSES = {
  SWAP_ROUTER_02: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4',
  ZERO_G_FLOW_CONTRACT: '0x22E03a6A89B950F1c82ec5e74F8ECa321a105296',
} as const;

// ── External service endpoints ──────────────────────────────────────────────

export const SERVICE_ENDPOINTS = {
  CRYPTOPANIC_BASE_URL: 'https://cryptopanic.com/api/v1',
  ZERO_G_INDEXER: process.env.ZERO_G_ENDPOINT ?? 'https://indexer-storage-testnet-turbo.0g.ai',
  UNISWAP_TRADE_API: 'https://trade-api.gateway.uniswap.org/v1',
} as const;

// ── Default portfolio allocation ────────────────────────────────────────────

export const DEFAULT_ALLOCATION = {
  WETH: 0.5,
  USDC: 0.5,
} as const;

// ── Configuration loader ────────────────────────────────────────────────────

/**
 * Load environment variables via dotenv and return a fully-typed
 * {@link ServiceConfig} object.
 *
 * Sensible defaults are provided for non-sensitive values so that the
 * application can run in demo / mock mode with minimal configuration.
 *
 * @throws {Error} If `PRIVATE_KEY` is missing while `USE_MOCK_SERVICES` is
 *   explicitly set to `false` or not set.
 */
export function getConfig(): ServiceConfig {
  dotenv.config();

  const useMockServices = process.env.USE_MOCK_SERVICES !== 'false';

  const privateKey = process.env.PRIVATE_KEY ?? '';

  if (!privateKey && !useMockServices) {
    throw new Error(
      'PRIVATE_KEY is required when USE_MOCK_SERVICES is false. ' +
        'Set PRIVATE_KEY in your .env file, or set USE_MOCK_SERVICES=true ' +
        'to run in demo mode without real wallet credentials.',
    );
  }

  return {
    chainId: Number(process.env.CHAIN_ID) || 84532,
    rpcUrl: process.env.RPC_URL ?? '',
    privateKey,
    zeroGEndpoint: process.env.ZERO_G_ENDPOINT ?? 'https://indexer-storage-testnet-turbo.0g.ai',
    zeroGApiKey: process.env.ZERO_G_API_KEY ?? '',
    keeperHubApiKey: process.env.KEEPER_HUB_API_KEY ?? '',
    uniswapApiKey: process.env.UNISWAP_API_KEY ?? '',
    llmApiKey: process.env.LLM_API_KEY ?? '',
    llmModel: process.env.LLM_MODEL ?? 'gpt-4o-mini',
    llmBaseUrl: process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1',
    cryptopanicApiKey: process.env.CRYPTOPANIC_API_KEY ?? '',
    pollingIntervalMs: Number(process.env.POLLING_INTERVAL_MS) || 300000,
    port: Number(process.env.PORT) || 3000,
    dryRun: process.env.DRY_RUN !== 'false',
    useMockServices,
  };
}
