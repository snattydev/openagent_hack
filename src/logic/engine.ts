import { Wallet, parseUnits } from 'ethers';
import { CycleStep } from '../types/index.js';
import type {
  CycleResult,
  AgentState,
  PortfolioState,
  ServiceConfig,
  LLMDecision,
  NewsItem,
  TokenBalance,
} from '../types/index.js';
import { SAFETY_CONFIG, STORAGE_CONFIG } from '../config/constants.js';
import type { BalanceService } from '../services/balanceService.js';
import type { ZeroGService } from '../services/0gService.js';
import type { NewsService } from '../services/newsService.js';
import type { LLMService } from '../services/llmService.js';
import type { UniswapService } from '../services/uniswapService.js';
import type { KeeperService } from '../services/keeperService.js';
import { validateRebalance } from './validator.js';
import { calculateTradeAmounts } from './portfolio.js';

const AGENT_ID = 'capymate-v1';

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export interface EngineDeps {
  balanceService: BalanceService;
  zeroGService: ZeroGService;
  newsService: NewsService;
  llmService: LLMService;
  uniswapService: UniswapService;
  keeperService: KeeperService;
  config: ServiceConfig;
}

export class Engine {
  private readonly balanceService: BalanceService;
  private readonly zeroGService: ZeroGService;
  private readonly newsService: NewsService;
  private readonly llmService: LLMService;
  private readonly uniswapService: UniswapService;
  private readonly keeperService: KeeperService;
  private readonly config: ServiceConfig;

  private isRunning = false;
  private lastCycle = 0;
  private dailyTradeCount = 0;
  private lastTradeTime = 0;

  state: AgentState = {
    last_decision: null,
    portfolio_history: [],
    reasoning: '',
    timestamp: Date.now(),
    cycle_count: 0,
  };

  constructor(deps: EngineDeps) {
    this.balanceService = deps.balanceService;
    this.zeroGService = deps.zeroGService;
    this.newsService = deps.newsService;
    this.llmService = deps.llmService;
    this.uniswapService = deps.uniswapService;
    this.keeperService = deps.keeperService;
    this.config = deps.config;
  }

  getStatus(): {
    isRunning: boolean;
    lastCycle: number;
    cycleCount: number;
    dailyTradeCount: number;
  } {
    return {
      isRunning: this.isRunning,
      lastCycle: this.lastCycle,
      cycleCount: this.state.cycle_count,
      dailyTradeCount: this.dailyTradeCount,
    };
  }

  async runCycle(): Promise<CycleResult[]> {
    if (this.isRunning) {
      console.log('Cycle already running, skipping');
      return [];
    }

    this.isRunning = true;
    this.lastCycle = Date.now();
    const results: CycleResult[] = [];

    try {
      let currentPortfolio: PortfolioState | null = null;

      // ── 1. SENSE ──────────────────────────────────────────────────────
      try {
        const walletAddress = this.getWalletAddress();
        const [portfolio, news] = await Promise.all([
          this.balanceService.getWalletBalances(walletAddress),
          this.newsService.fetchNews(['BTC', 'ETH']),
        ]);
        portfolio.timestamp = Date.now();
        currentPortfolio = portfolio;
        this.state.portfolio_history.push(portfolio);
        results.push({
          step: CycleStep.SENSE,
          timestamp: Date.now(),
          data: { news, balances: portfolio },
          success: true,
        });
      } catch (err) {
        console.error('[Engine] SENSE error:', errMsg(err));
        results.push({
          step: CycleStep.SENSE,
          timestamp: Date.now(),
          data: null,
          success: false,
          error: errMsg(err),
        });
      }

      // ── 2. REMEMBER ───────────────────────────────────────────────────
      try {
        const saved = await this.zeroGService.loadState(AGENT_ID);
        if (saved !== null) {
          this.state.cycle_count = Math.max(this.state.cycle_count, saved.cycle_count);
          this.state.last_decision = saved.last_decision ?? this.state.last_decision;
          this.state.reasoning = saved.reasoning || this.state.reasoning;

          const inMemoryTimestamps = new Set(this.state.portfolio_history.map((p) => p.timestamp));
          const newHistory = (saved.portfolio_history ?? []).filter(
            (p) => !inMemoryTimestamps.has(p.timestamp),
          );
          this.state.portfolio_history = [...newHistory, ...this.state.portfolio_history];
        }
        results.push({
          step: CycleStep.REMEMBER,
          timestamp: Date.now(),
          data: saved,
          success: true,
        });
      } catch (err) {
        console.error('[Engine] REMEMBER error:', errMsg(err));
        results.push({
          step: CycleStep.REMEMBER,
          timestamp: Date.now(),
          data: null,
          success: false,
          error: errMsg(err),
        });
      }

      // ── 3. REASON ─────────────────────────────────────────────────────
      let decision: LLMDecision | null = null;
      try {
        const senseData = results.find(
          (r) => r.step === CycleStep.SENSE && r.success,
        );
        const news = senseData?.data?.news ?? [];
        const balances = senseData?.data?.balances?.balances ?? [];

        decision = await this.llmService.analyzeSentiment(
          news,
          this.state,
          balances,
        );
        this.state.last_decision = decision;
        this.state.reasoning = decision.reasoning;
        results.push({
          step: CycleStep.REASON,
          timestamp: Date.now(),
          data: decision,
          success: true,
        });
      } catch (err) {
        console.error('[Engine] REASON error:', errMsg(err));
        results.push({
          step: CycleStep.REASON,
          timestamp: Date.now(),
          data: null,
          success: false,
          error: errMsg(err),
        });
      }

      // ── 4. VALIDATE ───────────────────────────────────────────────────
      let validationResult: { valid: boolean; reason?: string; adjusted_amount?: string } | null = null;
      try {
        const reasonData = results.find(
          (r) => r.step === CycleStep.REASON && r.success,
        );
        const proposedDecision = reasonData?.data as LLMDecision | null;

        const portfolio = currentPortfolio ?? this.getDefaultPortfolio();

        if (proposedDecision && proposedDecision.target_allocation) {
          validationResult = validateRebalance(
            portfolio,
            proposedDecision,
            this.dailyTradeCount,
            this.lastTradeTime,
          );
        } else {
          validationResult = {
            valid: false,
            reason: 'No decision available to validate',
          };
        }
        results.push({
          step: CycleStep.VALIDATE,
          timestamp: Date.now(),
          data: validationResult,
          success: true,
        });
      } catch (err) {
        console.error('[Engine] VALIDATE error:', errMsg(err));
        results.push({
          step: CycleStep.VALIDATE,
          timestamp: Date.now(),
          data: null,
          success: false,
          error: errMsg(err),
        });
      }

      // ── 5. EXECUTE ────────────────────────────────────────────────────
      try {
        if (validationResult?.valid && currentPortfolio) {
          if (!this.state.last_decision) {
            results.push({
              step: CycleStep.EXECUTE,
              timestamp: Date.now(),
              data: { skipped: true, reason: 'No decision available for execution' },
              success: true,
            });
          } else {
            const tradeResult = await this.executeTrade(currentPortfolio, this.state.last_decision);
            if (tradeResult) {
              results.push({
                step: CycleStep.EXECUTE,
                timestamp: Date.now(),
                data: tradeResult,
                success: true,
              });
            } else {
              results.push({
                step: CycleStep.EXECUTE,
                timestamp: Date.now(),
                data: { skipped: true, reason: 'No rebalance needed — allocation within threshold' },
                success: true,
              });
            }
          }
        } else {
          results.push({
            step: CycleStep.EXECUTE,
            timestamp: Date.now(),
            data: {
              skipped: true,
              reason: validationResult != null ? 'Validation did not pass' : 'No validation result',
            },
            success: true,
          });
        }
      } catch (err) {
        console.error('[Engine] EXECUTE error:', errMsg(err));
        results.push({
          step: CycleStep.EXECUTE,
          timestamp: Date.now(),
          data: null,
          success: false,
          error: errMsg(err),
        });
      }

      // ── 6. LOG ─────────────────────────────────────────────────────────
      try {
        this.state.cycle_count += 1;
        this.state.timestamp = Date.now();

        if (this.state.portfolio_history.length > STORAGE_CONFIG.MAX_PERSISTED_HISTORY_ENTRIES) {
          this.state.portfolio_history = this.state.portfolio_history.slice(
            -STORAGE_CONFIG.MAX_PERSISTED_HISTORY_ENTRIES,
          );
        }

        await this.zeroGService.saveState(AGENT_ID, this.state);
        results.push({
          step: CycleStep.LOG,
          timestamp: Date.now(),
          data: this.state,
          success: true,
        });
      } catch (err) {
        console.error('[Engine] LOG error:', errMsg(err));
        results.push({
          step: CycleStep.LOG,
          timestamp: Date.now(),
          data: null,
          success: false,
          error: errMsg(err),
        });
      }
    } finally {
      this.isRunning = false;
    }

    return results;
  }

  /**
   * Run only the SENSE step and return market data.
   * Used by host agents to get current portfolio state + news.
   */
  async sense(): Promise<{
    portfolio: PortfolioState;
    news: NewsItem[];
  }> {
    const walletAddress = this.getWalletAddress();
    const [portfolio, news] = await Promise.all([
      this.balanceService.getWalletBalances(walletAddress),
      this.newsService.fetchNews(['BTC', 'ETH']),
    ]);
    this.state.portfolio_history.push(portfolio);
    return { portfolio, news };
  }

  /**
   * Accept an LLM decision from a host agent and run VALIDATE→EXECUTE→LOG.
   * Returns the full cycle results for those steps.
   */
  async decide(decision: LLMDecision): Promise<CycleResult[]> {
    const results: CycleResult[] = [];

    this.state.last_decision = decision;
    this.state.reasoning = decision.reasoning;

    let currentPortfolio = this.state.portfolio_history.at(-1) ?? null;
    if (!currentPortfolio) {
      const walletAddress = this.getWalletAddress();
      currentPortfolio = await this.balanceService.getWalletBalances(walletAddress);
    }

    // ── VALIDATE ──────────────────────────────────────────────────────
    let validationResult: { valid: boolean; reason?: string } | null = null;
    try {
      validationResult = validateRebalance(
        currentPortfolio,
        decision,
        this.dailyTradeCount,
        this.lastTradeTime,
      );
      results.push({
        step: CycleStep.VALIDATE,
        timestamp: Date.now(),
        data: validationResult,
        success: true,
      });
    } catch (err) {
      console.error('[Engine] VALIDATE error:', errMsg(err));
      results.push({
        step: CycleStep.VALIDATE,
        timestamp: Date.now(),
        data: null,
        success: false,
        error: errMsg(err),
      });
    }

    // ── EXECUTE ───────────────────────────────────────────────────────
    try {
      if (validationResult?.valid && currentPortfolio) {
        const portfolio = currentPortfolio;
        const tradeResult = await this.executeTrade(portfolio, decision);
        if (tradeResult) {
          results.push({
            step: CycleStep.EXECUTE,
            timestamp: Date.now(),
            data: tradeResult,
            success: true,
          });
        } else {
          results.push({
            step: CycleStep.EXECUTE,
            timestamp: Date.now(),
            data: { skipped: true, reason: 'No rebalance needed' },
            success: true,
          });
        }
      } else {
        results.push({
          step: CycleStep.EXECUTE,
          timestamp: Date.now(),
          data: {
            skipped: true,
            reason: validationResult != null ? 'Validation did not pass' : 'No validation result',
          },
          success: true,
        });
      }
    } catch (err) {
      console.error('[Engine] EXECUTE error:', errMsg(err));
      results.push({
        step: CycleStep.EXECUTE,
        timestamp: Date.now(),
        data: null,
        success: false,
        error: errMsg(err),
      });
    }

    // ── LOG ───────────────────────────────────────────────────────────
    try {
      this.state.cycle_count += 1;
      this.state.timestamp = Date.now();

      if (this.state.portfolio_history.length > STORAGE_CONFIG.MAX_PERSISTED_HISTORY_ENTRIES) {
        this.state.portfolio_history = this.state.portfolio_history.slice(
          -STORAGE_CONFIG.MAX_PERSISTED_HISTORY_ENTRIES,
        );
      }

      await this.zeroGService.saveState(AGENT_ID, this.state);
      results.push({
        step: CycleStep.LOG,
        timestamp: Date.now(),
        data: this.state,
        success: true,
      });
    } catch (err) {
      console.error('[Engine] LOG error:', errMsg(err));
      results.push({
        step: CycleStep.LOG,
        timestamp: Date.now(),
        data: null,
        success: false,
        error: errMsg(err),
      });
    }

    return results;
  }

  private getWalletAddress(): string {
    if (this.config.useMockServices || !this.config.privateKey) {
      return '0x0000000000000000000000000000000000000001';
    }
    return new Wallet(this.config.privateKey).address;
  }

  private getDefaultPortfolio(): PortfolioState {
    return {
      balances: [],
      total_value_usd: 0,
      current_allocation: { WETH: 0.5, USDC: 0.5 },
      target_allocation: { WETH: 0.5, USDC: 0.5 },
      timestamp: Date.now(),
    };
  }

  /**
   * Execute a trade based on portfolio and decision.
   * Shared between runCycle() and decide().
   */
  private async executeTrade(
    portfolio: PortfolioState,
    decision: LLMDecision,
  ): Promise<{ quote: any; txHash: string } | null> {
    const tradeAmount = calculateTradeAmounts(portfolio, decision);

    if (!tradeAmount) {
      return null;
    }

    const wethEntry = portfolio.balances.find((b) => b.token === 'WETH');
    const wethPrice = wethEntry?.price_usd ?? 0;
    let rawAmount: string;
    try {
      if (tradeAmount.from_token === 'WETH') {
        const wethAmount = wethPrice > 0 ? tradeAmount.amount_usd / wethPrice : 0;
        rawAmount = parseUnits(wethAmount.toFixed(18), 18).toString();
      } else {
        rawAmount = parseUnits(tradeAmount.amount_usd.toFixed(6), 6).toString();
      }
    } catch {
      rawAmount = '0';
    }

    const quote = await this.uniswapService.getQuote(
      tradeAmount.from_token,
      tradeAmount.to_token,
      rawAmount,
    );

    let txHash = '';
    if (quote) {
      const walletAddress = this.getWalletAddress();
      const calldata = await this.uniswapService.getSwapCalldata(quote, walletAddress);
      if (calldata) {
        txHash = await this.keeperService.submitTransaction(calldata);
      }
    }

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (now - this.lastTradeTime > oneDay) {
      this.dailyTradeCount = 0;
    }
    this.dailyTradeCount += 1;
    this.lastTradeTime = now;

    return { quote, txHash };
  }
}
