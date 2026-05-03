import { SAFETY_CONFIG } from '../config/constants.js';
import type { PortfolioState, LLMDecision, ValidationResult } from '../types/index.js';

const ALLOWED_TOKENS: Array<'WETH' | 'USDC'> = [...SAFETY_CONFIG.ALLOWED_TOKENS];

/**
 * **Rule 1 — Token whitelist**
 * Reject if the proposed target_allocation contains any key that is not
 * 'WETH' or 'USDC'.
 */
function checkWhitelist(proposed: LLMDecision): ValidationResult | null {
  const proposedKeys = Object.keys(proposed.target_allocation);
  const disallowed = proposedKeys.filter(
    (k) => !ALLOWED_TOKENS.includes(k as 'WETH' | 'USDC'),
  );
  if (disallowed.length > 0) {
    return {
      valid: false,
      reason: `Token whitelist violation: [${disallowed.join(', ')}] not in allowed set [${ALLOWED_TOKENS.join(', ')}]`,
    };
  }
  return null;
}

/**
 * **Rule 2 — Min rebalance threshold**
 * Reject if NO single token's allocation changes by at least
 * `MIN_REBALANCE_THRESHOLD` (2 %). At least one token must differ by ≥ 2 %.
 */
function checkMinThreshold(
  current: PortfolioState,
  proposed: LLMDecision,
): ValidationResult | null {
  const hasSignificantChange = ALLOWED_TOKENS.some(
    (token) =>
      Math.abs(
        current.current_allocation[token] - proposed.target_allocation[token],
      ) >= SAFETY_CONFIG.MIN_REBALANCE_THRESHOLD,
  );
  if (!hasSignificantChange) {
    return {
      valid: false,
      reason: `Rebalance threshold not met: no token allocation change >= ${
        SAFETY_CONFIG.MIN_REBALANCE_THRESHOLD * 100
      }%`,
    };
  }
  return null;
}

/**
 * **Rule 3 — Max single trade**
 * Reject if the USD trade amount for any token exceeds
 * `MAX_SINGLE_TRADE_PERCENT` (10 %) of total portfolio value.
 */
function checkMaxTrade(
  current: PortfolioState,
  proposed: LLMDecision,
): ValidationResult | null {
  const totalValue = current.total_value_usd;
  const maxTrade = SAFETY_CONFIG.MAX_SINGLE_TRADE_PERCENT * totalValue;

  for (const token of ALLOWED_TOKENS) {
    const diff = Math.abs(
      current.current_allocation[token] - proposed.target_allocation[token],
    );
    const tradeAmount = diff * totalValue;
    if (tradeAmount > maxTrade) {
      return {
        valid: false,
        reason: `Max single trade exceeded for ${token}: ` +
          `trade $${tradeAmount.toFixed(2)} > max $${maxTrade.toFixed(2)} ` +
          `(${SAFETY_CONFIG.MAX_SINGLE_TRADE_PERCENT * 100}% of portfolio)`,
      };
    }
  }
  return null;
}

/**
 * **Rule 4 — Max slippage**
 * Slippage is checked at quote-time by uniswapService, not here.
 * Always returns valid — the actual enforcement happens when the TradeOrder
 * is created.
 */
function checkSlippage(): ValidationResult | null {
  return null;
}

/**
 * **Rule 5 — Cooldown**
 * Reject if insufficient time has elapsed since the last trade.
 * COOLDOWN_MINUTES (default: 15) must have passed.
 */
function checkCooldown(
  lastTradeTime: number,
): ValidationResult | null {
  // When lastTradeTime is 0 (no prior trade), the cooldown does not apply.
  if (lastTradeTime === 0) return null;

  const elapsed = Date.now() - lastTradeTime;
  const cooldownMs = SAFETY_CONFIG.COOLDOWN_MINUTES * 60 * 1000;
  if (elapsed < cooldownMs) {
    const remainingSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
    return {
      valid: false,
      reason: `Cooldown active: ~${remainingSeconds}s remaining ` +
        `(${SAFETY_CONFIG.COOLDOWN_MINUTES} min required since last trade)`,
    };
  }
  return null;
}

/**
 * **Rule 6 — Max daily trades**
 * Reject if the daily trade count has reached or exceeded `MAX_DAILY_TRADES`.
 */
function checkDailyLimit(dailyTradeCount: number): ValidationResult | null {
  if (dailyTradeCount >= SAFETY_CONFIG.MAX_DAILY_TRADES) {
    return {
      valid: false,
      reason: `Max daily trades reached: ${dailyTradeCount}/${SAFETY_CONFIG.MAX_DAILY_TRADES}`,
    };
  }
  return null;
}

/**
 * Run all safety validation rules against a proposed rebalance decision.
 *
 * Rules are evaluated in order (whitelist → threshold → max trade → slippage
 * → cooldown → daily limit) and the **first rejection** is returned.
 *
 * @param current        Current portfolio snapshot.
 * @param proposed       LLM-generated rebalance proposal.
 * @param dailyTradeCount  Trades executed so far today.
 * @param lastTradeTime    Unix-ms timestamp of the most recent trade (0 = none).
 * @returns A {@link ValidationResult} — `valid: true` when all rules pass.
 */
export function validateRebalance(
  current: PortfolioState,
  proposed: LLMDecision,
  dailyTradeCount: number,
  lastTradeTime: number,
): ValidationResult {
  if (current.total_value_usd === 0) {
    return { valid: true };
  }

  const rules: Array<ValidationResult | null> = [
    checkWhitelist(proposed),
    checkMinThreshold(current, proposed),
    checkMaxTrade(current, proposed),
    checkSlippage(),
    checkCooldown(lastTradeTime),
    checkDailyLimit(dailyTradeCount),
  ];

  for (const result of rules) {
    if (result !== null && !result.valid) {
      return result;
    }
  }

  return { valid: true };
}
