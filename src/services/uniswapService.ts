import { TradeOrder } from '../types/index.js';
import {
  SAFETY_CONFIG,
  NETWORK_CONFIG,
  CONTRACT_ADDRESSES,
  SERVICE_ENDPOINTS,
} from '../config/constants.js';

/** Mapping of token symbols to their on-chain addresses. */
const TOKEN_ADDRESS_MAP: Record<string, string> = {
  WETH: NETWORK_CONFIG.WETH_ADDRESS,
  USDC: NETWORK_CONFIG.USDC_ADDRESS,
};

/** Configuration options for the Uniswap service. */
export interface UniswapServiceOptions {
  /** Uniswap Trading API key (optional). */
  apiKey?: string;
  /** Chain ID to target (defaults to Base Sepolia). */
  chainId?: number;
  /** When true, return deterministic mock data instead of hitting the API. */
  mock?: boolean;
}

/**
 * Service for fetching swap quotes and generating calldata via the
 * Uniswap Trading API (https://trade-api.gateway.uniswap.org/v1).
 *
 * For the hackathon milestone this is **mock-first**: when `mock` is `true`
 * all methods return deterministic fake data so the rest of the agentic
 * pipeline can be exercised without live API credentials.
 */
export class UniswapService {
  private readonly apiKey?: string;
  private readonly chainId: number;
  private readonly mock: boolean;

  constructor(options: UniswapServiceOptions = {}) {
    this.apiKey = options.apiKey;
    this.chainId = options.chainId ?? NETWORK_CONFIG.CHAIN_ID;
    this.mock = options.mock ?? false;
  }

  /**
   * Fetch a swap quote for `fromToken` → `toToken`.
   *
   * @param fromToken – Symbol of the token to sell (e.g. `"WETH"`).
   * @param toToken   – Symbol of the token to buy (e.g. `"USDC"`).
   * @param amount    – Raw wei amount as a string (e.g. `"1000000000000000000"`).
   * @returns A {@link TradeOrder} or `null` on error / unsupported mode.
   */
  async getQuote(
    fromToken: string,
    toToken: string,
    amount: string,
  ): Promise<TradeOrder | null> {
    try {
      if (this.mock) {
        return this.getMockQuote(fromToken, toToken, amount);
      }

      // ------------------------------------------------------------------
      // Real-mode integration is intentionally left as a TODO for the
      // post-hackathon phase.  The intended Uniswap Trading API flow is:
      //
      // 1. Resolve token symbols → contract addresses via TOKEN_ADDRESS_MAP.
      // 2. POST to `${SERVICE_ENDPOINTS.UNISWAP_TRADE_API}/quote` with:
      //    { type: 'exactIn', chainId: this.chainId, amount,
      //      tokenIn: <fromAddress>, tokenOut: <toAddress> }
      //    Include header `x-api-key: this.apiKey` when available.
      // 3. Validate the JSON response (expected_output, slippage, route_data).
      // 4. Return a populated TradeOrder object.
      //
      // DO NOT implement the full API integration until API keys are
      // provisioned and the backend is whitelisted.
      // ------------------------------------------------------------------

      console.warn(
        '[UniswapService] Live Uniswap Trading API integration is pending. ' +
          'Set mock:true to use deterministic fake quotes.',
      );
      return null;
    } catch (err) {
      console.error('[UniswapService] getQuote error:', err);
      return null;
    }
  }

  /**
   * Generate the on-chain calldata required to execute the swap described
   * by `tradeOrder`.
   *
   * @param tradeOrder – A valid quote previously returned by {@link getQuote}.
   * @returns Transaction payload `{ to, data, value }` or `null` on error.
   */
  async getSwapCalldata(
    tradeOrder: TradeOrder,
  ): Promise<{ to: string; data: string; value: string } | null> {
    try {
      if (this.mock) {
        return {
          to: CONTRACT_ADDRESSES.SWAP_ROUTER_02,
          data: '0xc04...',
          value: '0',
        };
      }

      // ------------------------------------------------------------------
      // Real-mode integration is intentionally left as a TODO.  The intended
      // flow for the Uniswap Trading API is:
      //
      // 1. POST to `${SERVICE_ENDPOINTS.UNISWAP_TRADE_API}/swap` with the
      //    quote ID / route data received from the `/quote` step.
      // 2. The API returns `to`, `data`, and `value` fields ready for
      //    `ethers.TransactionRequest`.
      // 3. Return those fields verbatim to the caller (execution service).
      //
      // DO NOT implement the full API integration until API keys are
      // provisioned.
      // ------------------------------------------------------------------

      console.warn(
        '[UniswapService] Live swap calldata generation is pending. ' +
          'Set mock:true to use deterministic fake calldata.',
      );
      return null;
    } catch (err) {
      console.error('[UniswapService] getSwapCalldata error:', err);
      return null;
    }
  }

  /** Build a deterministic mock {@link TradeOrder}. */
  private getMockQuote(
    fromToken: string,
    toToken: string,
    amount: string,
  ): TradeOrder {
    const fromAddress = TOKEN_ADDRESS_MAP[fromToken];
    const toAddress = TOKEN_ADDRESS_MAP[toToken];

    // For the hackathon demo we hard-code a WETH/USDC price of $2000.
    const MOCK_PRICE_USD = 2000;

    // 1 WETH = 1e18 wei.  USDC has 6 decimals, so 2000 USDC = 2000 * 1e6.
    const expectedOutput =
      fromToken === 'WETH' && toToken === 'USDC'
        ? String(BigInt(MOCK_PRICE_USD) * BigInt(1_000_000))
        : '0';

    return {
      from_token: fromAddress ?? fromToken,
      to_token: toAddress ?? toToken,
      amount,
      expected_output: expectedOutput,
      slippage: SAFETY_CONFIG.MAX_SLIPPAGE,
      route_data: { mock: true, price: MOCK_PRICE_USD },
    };
  }
}
