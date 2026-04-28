// ---------------------------------------------------------------------------
// CapyMate – Portfolio allocation logic
// ---------------------------------------------------------------------------

import { TokenBalance, PortfolioState, LLMDecision } from '../types/index.js';
import { DEFAULT_ALLOCATION } from '../config/constants.js';

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Calculate the current allocation weights for WETH and USDC given a list of
 * token balances.
 *
 * For each balance, the USD value is `amount * price_usd`. If `price_usd` is
 * undefined for a token, its value is treated as 0.
 *
 * @param balances – Array of token balances to evaluate.
 * @returns An object with WETH and USDC weights that sum to 1.0 (or both 0
 *   when the total value is zero).
 */
export function calculateAllocation(
  balances: TokenBalance[],
): { WETH: number; USDC: number } {
  const totalUsdValue = balances.reduce((sum, b) => {
    const price = b.price_usd ?? 0;
    return sum + b.amount * price;
  }, 0);

  if (totalUsdValue === 0) {
    return { WETH: 0, USDC: 0 };
  }

  const wethBalance = balances.find((b) => b.token === 'WETH');
  const usdcBalance = balances.find((b) => b.token === 'USDC');

  const wethUsdValue = wethBalance
    ? wethBalance.amount * (wethBalance.price_usd ?? 0)
    : 0;
  const usdcUsdValue = usdcBalance
    ? usdcBalance.amount * (usdcBalance.price_usd ?? 0)
    : 0;

  return {
    WETH: wethUsdValue / totalUsdValue,
    USDC: usdcUsdValue / totalUsdValue,
  };
}

/**
 * Determine the trade required to rebalance from the current portfolio state
 * toward the LLM-proposed target allocation.
 *
 * @param current  – The current portfolio snapshot (balances, total value and
 *                   current allocation).
 * @param proposed – The LLM decision containing the desired target allocation.
 * @returns A trade descriptor or `null` when no rebalance is needed (i.e. the
 *   current and target allocations differ by less than 1e-10).
 */
export function calculateTradeAmounts(
  current: PortfolioState,
  proposed: LLMDecision,
): { from_token: string; to_token: string; amount_usd: number } | null {
  const diff =
    Math.abs(
      current.current_allocation.WETH - proposed.target_allocation.WETH,
    );

  if (diff < 1e-10) {
    return null;
  }

  const amountUsd = diff * current.total_value_usd;

  if (current.current_allocation.WETH > proposed.target_allocation.WETH) {
    return {
      from_token: 'WETH',
      to_token: 'USDC',
      amount_usd: amountUsd,
    };
  }

  return {
    from_token: 'USDC',
    to_token: 'WETH',
    amount_usd: amountUsd,
  };
}

/**
 * Format an allocation object as a human-readable string.
 *
 * @param allocation – The allocation weights (must sum to 1).
 * @returns A string such as "WETH: 70.0%, USDC: 30.0%".
 */
export function formatAllocation(allocation: {
  WETH: number;
  USDC: number;
}): string {
  return `WETH: ${(allocation.WETH * 100).toFixed(1)}%, USDC: ${(allocation.USDC * 100).toFixed(1)}%`;
}
