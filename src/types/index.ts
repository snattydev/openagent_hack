/** Market sentiment direction. */
export type Sentiment = 'bullish' | 'bearish' | 'neutral';

/** Stages in the agentic decision cycle. */
export enum CycleStep {
  SENSE = 'SENSE',
  REMEMBER = 'REMEMBER',
  REASON = 'REASON',
  VALIDATE = 'VALIDATE',
  EXECUTE = 'EXECUTE',
  LOG = 'LOG',
}

/** A decision produced by the LLM after analysing market data. */
export interface LLMDecision {
  sentiment: Sentiment;
  /** Confidence level between 0 and 1 (inclusive). */
  confidence: number;
  /** Human-readable reasoning. Should not exceed ~200 characters. */
  reasoning: string;
  /** Desired portfolio allocation expressed as weights (may not sum to 1). */
  target_allocation: { WETH: number; USDC: number };
  /** Key signals that influenced this decision. */
  key_signals: string[];
}

/** Runtime state of the agent at a given point in the cycle. */
export interface AgentState {
  last_decision: LLMDecision | null;
  portfolio_history: PortfolioState[];
  reasoning: string;
  /** Unix timestamp (ms) when this state was captured. */
  timestamp: number;
  /** How many full cycles have been completed. */
  cycle_count: number;
}

/** Balance of a single token held by the agent. */
export interface TokenBalance {
  token: string;
  amount: number;
  decimals: number;
  /** USD price of one token (optional – may not be available for every asset). */
  price_usd?: number;
}

/** Snapshot of the portfolio at a given moment. */
export interface PortfolioState {
  balances: TokenBalance[];
  total_value_usd: number;
  current_allocation: { WETH: number; USDC: number };
  target_allocation: { WETH: number; USDC: number };
  /** Unix timestamp (ms) when this snapshot was taken. */
  timestamp: number;
}

/** A trade order ready for execution. */
export interface TradeOrder {
  from_token: string;
  to_token: string;
  /** Raw wei amount as a string (to preserve precision for big integers). */
  amount: string;
  expected_output: string;
  /** Slippage tolerance represented as a decimal (e.g. 0.005 = 0.5 %). */
  slippage: number;
  /** Arbitrary routing / DEX metadata. */
  route_data: any;
}

/** Outcome of a trade validation check. */
export interface ValidationResult {
  valid: boolean;
  /** Reason for rejection when `valid` is false. */
  reason?: string;
  /** Adjusted amount after validation corrections (raw wei string). */
  adjusted_amount?: string;
}

/** A news item fetched from an external source (e.g. CryptoPanic). */
export interface NewsItem {
  title: string;
  source: string;
  published_at: string;
  sentiment_vote: {
    positive: number;
    negative: number;
    important: number;
  };
  /** Currencies mentioned in the article (e.g. ["BTC", "ETH"]). */
  currencies: string[];
}

/** Typed application configuration derived from environment variables. */
export interface ServiceConfig {
  chainId: number;
  rpcUrl: string;
  privateKey: string;
  zeroGEndpoint: string;
  zeroGApiKey: string;
  keeperHubApiKey: string;
  uniswapApiKey: string;
  llmApiKey: string;
  llmModel: string;
  llmBaseUrl: string;
  cryptopanicApiKey: string;
  pollingIntervalMs: number;
  port: number;
  dryRun: boolean;
  useMockServices: boolean;
}

/** Result metadata for a single step in the decision cycle. */
export interface CycleResult {
  step: CycleStep;
  /** Unix timestamp (ms) when this step completed. */
  timestamp: number;
  /** Arbitrary payload produced by the step. */
  data: any;
  /** Whether the step completed without error. */
  success: boolean;
  /** Error message if `success` is false. */
  error?: string;
}
