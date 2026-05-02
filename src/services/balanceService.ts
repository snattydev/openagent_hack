import { JsonRpcProvider, Contract, formatUnits } from 'ethers';
import { PortfolioState, TokenBalance } from '../types/index.js';
import { NETWORK_CONFIG, DEFAULT_ALLOCATION } from '../config/constants.js';

const MINIMAL_ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
] as const;

const MOCK_WETH_BALANCE = 1.5;
const MOCK_USDC_BALANCE = 3000;
const MOCK_WETH_PRICE = 2000;
const MOCK_USDC_PRICE = 1.0;

export interface BalanceServiceOptions {
  provider?: JsonRpcProvider;
  wethAddress?: string;
  usdcAddress?: string;
  mock?: boolean;
}

export class BalanceService {
  private readonly provider?: JsonRpcProvider;
  private readonly wethAddress: string;
  private readonly usdcAddress: string;
  private readonly mock: boolean;

  constructor(options: BalanceServiceOptions = {}) {
    this.provider = options.provider;
    this.wethAddress = options.wethAddress ?? NETWORK_CONFIG.WETH_ADDRESS;
    this.usdcAddress = options.usdcAddress ?? NETWORK_CONFIG.USDC_ADDRESS;
    this.mock = options.mock ?? false;
  }

  async getWalletBalances(address: string): Promise<PortfolioState> {
    if (this.mock) {
      return this.getMockBalances();
    }

    if (!this.provider) {
      throw new Error('Provider is required in non-mock mode');
    }

    return this.getOnChainBalances(address);
  }

  private getMockBalances(): PortfolioState {
    const wethValueUsd = MOCK_WETH_BALANCE * MOCK_WETH_PRICE;
    const usdcValueUsd = MOCK_USDC_BALANCE * MOCK_USDC_PRICE;
    const totalValueUsd = wethValueUsd + usdcValueUsd;

    const balances: TokenBalance[] = [
      {
        token: 'WETH',
        amount: MOCK_WETH_BALANCE,
        decimals: 18,
        price_usd: MOCK_WETH_PRICE,
      },
      {
        token: 'USDC',
        amount: MOCK_USDC_BALANCE,
        decimals: 6,
        price_usd: MOCK_USDC_PRICE,
      },
    ];

    return {
      balances,
      total_value_usd: totalValueUsd,
      current_allocation: { WETH: 0.5, USDC: 0.5 },
      target_allocation: { ...DEFAULT_ALLOCATION },
    };
  }

  private async getOnChainBalances(address: string): Promise<PortfolioState> {
    const wethContract = new Contract(
      this.wethAddress,
      MINIMAL_ERC20_ABI,
      this.provider,
    );
    const usdcContract = new Contract(
      this.usdcAddress,
      MINIMAL_ERC20_ABI,
      this.provider,
    );

    const [
      wethRawBalance,
      wethDecimals,
      usdcRawBalance,
      usdcDecimals,
      ethRawBalance,
    ] = await Promise.all([
      wethContract.balanceOf(address) as Promise<bigint>,
      wethContract.decimals() as Promise<number>,
      usdcContract.balanceOf(address) as Promise<bigint>,
      usdcContract.decimals() as Promise<number>,
      this.provider!.getBalance(address),
    ]);

    const wethAmount = Number(formatUnits(wethRawBalance, wethDecimals));
    const usdcAmount = Number(formatUnits(usdcRawBalance, usdcDecimals));
    const ethAmount = Number(formatUnits(ethRawBalance, 18));

    let wethPrice: number;
    let usdcPrice: number;

    try {
      const prices = await this.fetchPrices();
      wethPrice = prices.weth;
      usdcPrice = prices.usdc;
    } catch {
      wethPrice = MOCK_WETH_PRICE;
      usdcPrice = MOCK_USDC_PRICE;
    }

    const wethValueUsd = wethAmount * wethPrice;
    const usdcValueUsd = usdcAmount * usdcPrice;
    const ethValueUsd = ethAmount * wethPrice;
    const totalValueUsd = wethValueUsd + usdcValueUsd + ethValueUsd;

    const balances: TokenBalance[] = [
      {
        token: 'WETH',
        amount: wethAmount,
        decimals: wethDecimals,
        price_usd: wethPrice,
      },
      {
        token: 'USDC',
        amount: usdcAmount,
        decimals: usdcDecimals,
        price_usd: usdcPrice,
      },
      {
        token: 'ETH',
        amount: ethAmount,
        decimals: 18,
        price_usd: wethPrice,
      },
    ];

    const currentAllocation =
      totalValueUsd > 0
        ? {
            WETH: (wethValueUsd + ethValueUsd) / totalValueUsd,
            USDC: usdcValueUsd / totalValueUsd,
          }
        : { ...DEFAULT_ALLOCATION };

    return {
      balances,
      total_value_usd: totalValueUsd,
      current_allocation: currentAllocation,
      target_allocation: { ...DEFAULT_ALLOCATION },
    };
  }

  private async fetchPrices(): Promise<{ weth: number; usdc: number }> {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin&vs_currencies=usd',
      );

      if (!response.ok) {
        console.warn(`[BalanceService] CoinGecko error: ${response.status}. Using mock prices.`);
        return { weth: MOCK_WETH_PRICE, usdc: MOCK_USDC_PRICE };
      }

      const data = (await response.json()) as {
        ethereum: { usd: number };
        'usd-coin': { usd: number };
      };

      return {
        weth: data.ethereum?.usd ?? MOCK_WETH_PRICE,
        usdc: data['usd-coin']?.usd ?? MOCK_USDC_PRICE,
      };
    } catch (err) {
      console.warn(
        '[BalanceService] Price fetch failed:',
        err instanceof Error ? err.message : String(err),
      );
      return { weth: MOCK_WETH_PRICE, usdc: MOCK_USDC_PRICE };
    }
  }
}
