import { TradeOrder } from '../types/index.js';
import {
  SAFETY_CONFIG,
  NETWORK_CONFIG,
  CONTRACT_ADDRESSES,
  SERVICE_ENDPOINTS,
} from '../config/constants.js';

const TOKEN_ADDRESS_MAP: Record<string, string> = {
  WETH: NETWORK_CONFIG.WETH_ADDRESS,
  USDC: NETWORK_CONFIG.USDC_ADDRESS,
};

export interface UniswapServiceOptions {
  apiKey?: string;
  chainId?: number;
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

export class UniswapService {
  private readonly apiKey?: string;
  private readonly chainId: number;

  constructor(options: UniswapServiceOptions = {}) {
    this.apiKey = options.apiKey;
    this.chainId = options.chainId ?? NETWORK_CONFIG.CHAIN_ID;
  }

  async getQuote(
    fromToken: string,
    toToken: string,
    amount: string,
  ): Promise<TradeOrder | null> {
    try {
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

  async getSwapCalldata(
    tradeOrder: TradeOrder,
    recipient: string,
  ): Promise<{ to: string; data: string; value: string; gasLimit?: string } | null> {
    try {
      if (!tradeOrder.route_data) {
        console.error('[UniswapService] No route data in trade order');
        return null;
      }

      const requestBody: UniswapSwapRequest = {
        quote: tradeOrder.route_data,
        recipient,
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
        gasLimit: data.gasLimit,
      };
    } catch (err) {
      console.error('[UniswapService] getSwapCalldata error:', err);
      return null;
    }
  }
}
