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
  /** Uniswap Trading API key (optional but recommended). */
  apiKey?: string;
  /** Chain ID to target (defaults to Base Sepolia). */
  chainId?: number;
  /** When true, return deterministic mock data instead of hitting the API. */
  mock?: boolean;
}

interface UniswapQuoteRequest {
  type: 'exactIn';
  chainId: number;
  amount: string;
  tokenIn: string;
  tokenOut: string;
}

interface UniswapQuoteResponse {
  quoteId?: string;
  amountOut: string;
  route: unknown;
  gasPriceWei?: string;
}

interface UniswapSwapRequest {
  quote: unknown;
  recipient: string;
  slippageTolerance: string;
}

interface UniswapSwapResponse {
  to: string;
  data: string;
  value: string;
  gasLimit?: string;
}

/**
 * Service for fetching swap quotes and generating calldata via the
 * Uniswap Trading API (https://trade-api.gateway.uniswap.org/v1).
 *
 * Supports both mock mode (deterministic fake data) and real mode
 * (live API calls to Uniswap's routing infrastructure).
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
   * @returns A {@link TradeOrder} or `null` on error.
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

      const fromAddress = TOKEN_ADDRESS_MAP[fromToken];
      const toAddress = TOKEN_ADDRESS_MAP[toToken];

      if (!fromAddress || !toAddress) {
        console.error(`[UniswapService] Unknown token pair: ${fromToken} → ${toToken}`);
        return null;
      }

      const requestBody: UniswapQuoteRequest = {
        type: 'exactIn',
        chainId: this.chainId,
        amount,
        tokenIn: fromAddress,
        tokenOut: toAddress,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey;
      }

      const response = await fetch(`${SERVICE_ENDPOINTS.UNISWAP_TRADE_API}/quote`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[UniswapService] Quote failed: ${response.status} ${errorText}`);
        return null;
      }

      const data = (await response.json()) as UniswapQuoteResponse;

      return {
        from_token: fromAddress,
        to_token: toAddress,
        amount,
        expected_output: data.amountOut,
        slippage: SAFETY_CONFIG.MAX_SLIPPAGE,
        route_data: data,
      };
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
    recipient: string,
  ): Promise<{ to: string; data: string; value: string } | null> {
    try {
      if (this.mock) {
        return {
          to: CONTRACT_ADDRESSES.SWAP_ROUTER_02,
          data: '0xc04...',
          value: '0',
        };
      }

      if (!tradeOrder.route_data) {
        console.error('[UniswapService] No route data in trade order');
        return null;
      }

      const requestBody: UniswapSwapRequest = {
        quote: tradeOrder.route_data,
        recipient: recipient ?? CONTRACT_ADDRESSES.SWAP_ROUTER_02,
        slippageTolerance: String(SAFETY_CONFIG.MAX_SLIPPAGE * 100),
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.apiKey) {
        headers['x-api-key'] = this.apiKey;
      }

      const response = await fetch(`${SERVICE_ENDPOINTS.UNISWAP_TRADE_API}/swap`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[UniswapService] Swap calldata failed: ${response.status} ${errorText}`);
        return null;
      }

      const data = (await response.json()) as UniswapSwapResponse;

      return {
        to: data.to,
        data: data.data,
        value: data.value ?? '0',
      };
    } catch (err) {
      console.error('[UniswapService] getSwapCalldata error:', err);
      return null;
    }
  }

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
