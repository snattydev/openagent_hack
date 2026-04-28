// ---------------------------------------------------------------------------
// CapyMate – LLM Sentiment Analysis Service
// OpenAI-compatible adapter with Zod validation and mock fallback
// ---------------------------------------------------------------------------

import { z } from 'zod';
import type { LLMDecision, AgentState, NewsItem, TokenBalance } from '../types/index.js';
import { DEFAULT_ALLOCATION, SAFETY_CONFIG } from '../config/constants.js';

// ── Zod schema ───────────────────────────────────────────────────────────────

/** Zod schema matching {@link LLMDecision} exactly. */
const llmDecisionSchema = z.object({
  sentiment: z.enum(['bullish', 'bearish', 'neutral']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  target_allocation: z.object({
    WETH: z.number(),
    USDC: z.number(),
  }),
  key_signals: z.array(z.string()),
});

// ── Configuration ────────────────────────────────────────────────────────────

interface LLMServiceConfig {
  /** OpenAI-compatible API key. Required for real mode. */
  apiKey?: string;
  /** Model identifier (default: 'gpt-4o-mini'). */
  model?: string;
  /** Base URL for the OpenAI-compatible API (default: 'https://api.openai.com/v1'). */
  baseUrl?: string;
  /** When true, uses keyword-based mock sentiment instead of calling LLM. */
  mock?: boolean;
}

// ── Mock mode constants ──────────────────────────────────────────────────────

const BULLISH_KEYWORDS = ['bullish', 'rally', 'approved', 'surge', 'pump'] as const;
const BEARISH_KEYWORDS = ['bearish', 'crash', 'hack', 'drop', 'dump'] as const;

// ── Service class ────────────────────────────────────────────────────────────

export class LLMService {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private mock: boolean;

  constructor(config: LLMServiceConfig = {}) {
    this.apiKey = config.apiKey ?? '';
    this.model = config.model ?? 'gpt-4o-mini';
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
    this.mock = config.mock ?? false;
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Analyze market sentiment from news headlines and current state.
   *
   * Respects the sentiment cache: if the previous decision is still fresh
   * (within {@link SAFETY_CONFIG.SENTIMENT_CACHE_MINUTES}), it is returned
   * directly without any processing.
   *
   * @param news - Recent news items (titles only, max 5 are used).
   * @param currentState - The agent's current runtime state.
   * @param prices - Current token balances with optional USD prices.
   * @returns A validated {@link LLMDecision}.
   */
  async analyzeSentiment(
    news: NewsItem[],
    currentState: AgentState,
    prices: TokenBalance[],
  ): Promise<LLMDecision> {
    // ── Cache check ───────────────────────────────────────────────────
    const cached = this.checkCache(currentState);
    if (cached) {
      return cached;
    }

    // ── Limit input (titles only, max 5) ─────────────────────────────
    const recentNews = news.slice(0, 5);
    const titles = recentNews.map((n) => n.title);

    let rawResult: unknown;

    if (this.mock) {
      rawResult = this.mockAnalyze(titles);
    } else {
      try {
        rawResult = await this.callLLM(titles, prices);
      } catch (error) {
        console.error('[LLMService] LLM API call failed:', error);
        return this.getFallbackDecision(currentState);
      }
    }

    // ── Zod validation ───────────────────────────────────────────────
    const parsed = llmDecisionSchema.safeParse(rawResult);
    if (!parsed.success) {
      console.error('[LLMService] Zod validation failed:', parsed.error.message);
      return this.getFallbackDecision(currentState);
    }

    return parsed.data;
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private checkCache(currentState: AgentState): LLMDecision | null {
    if (!currentState.last_decision) {
      return null;
    }

    const elapsed = Date.now() - currentState.timestamp;
    const cacheMs = SAFETY_CONFIG.SENTIMENT_CACHE_MINUTES * 60 * 1000;

    if (elapsed < cacheMs) {
      return currentState.last_decision;
    }

    return null;
  }

  private mockAnalyze(titles: string[]): LLMDecision {
    const lowerTitles = titles.map((t) => t.toLowerCase());

    const bullishMatches = titles.filter((_, i) =>
      BULLISH_KEYWORDS.some((k) => lowerTitles[i].includes(k)),
    );
    const bearishMatches = titles.filter((_, i) =>
      BEARISH_KEYWORDS.some((k) => lowerTitles[i].includes(k)),
    );

    if (bullishMatches.length > 0) {
      const reasoning = `Bullish signals: ${bullishMatches.join(', ')}`;
      return {
        sentiment: 'bullish',
        confidence: 0.85,
        reasoning: reasoning.length > 200 ? reasoning.slice(0, 197) + '...' : reasoning,
        target_allocation: { WETH: 0.8, USDC: 0.2 },
        key_signals: bullishMatches,
      };
    }

    if (bearishMatches.length > 0) {
      const reasoning = `Bearish signals: ${bearishMatches.join(', ')}`;
      return {
        sentiment: 'bearish',
        confidence: 0.82,
        reasoning: reasoning.length > 200 ? reasoning.slice(0, 197) + '...' : reasoning,
        target_allocation: { WETH: 0.3, USDC: 0.7 },
        key_signals: bearishMatches,
      };
    }

    return {
      sentiment: 'neutral',
      confidence: 0.7,
      reasoning: 'No strong market signals detected in recent news.',
      target_allocation: { ...DEFAULT_ALLOCATION },
      key_signals: [],
    };
  }

  private async callLLM(titles: string[], prices: TokenBalance[]): Promise<unknown> {
    const systemPrompt =
      'You are a cryptocurrency sentiment analyst. Analyze the provided news headlines ' +
      'and token prices, then return a JSON object with the following structure:\n' +
      '{\n' +
      '  "sentiment": "bullish" | "bearish" | "neutral",\n' +
      '  "confidence": <number between 0 and 1>,\n' +
      '  "reasoning": "<string, max 200 characters>",\n' +
      '  "target_allocation": { "WETH": <number>, "USDC": <number> },\n' +
      '  "key_signals": ["<headline excerpt>", ...]\n' +
      '}';

    const platformContext = titles
      .map((t) => `- ${t}`)
      .join('\n');

    const priceContext = prices
      .map((p) => `${p.token}: $${p.price_usd ?? 'N/A'}`)
      .join('\n');

    const userContext =
      `News headlines:\n${platformContext}\n\n` +
      `Current token prices:\n${priceContext}`;

    const url = `${this.baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContext },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `LLM API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices[0].message.content;
    return JSON.parse(content) as unknown;
  }

  private getFallbackDecision(currentState: AgentState): LLMDecision {
    if (currentState.last_decision) {
      console.warn('[LLMService] Falling back to last_decision.');
      return currentState.last_decision;
    }

    console.warn('[LLMService] Falling back to DEFAULT_ALLOCATION (neutral).');
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      reasoning: 'Fallback: no prior decision available.',
      target_allocation: { ...DEFAULT_ALLOCATION },
      key_signals: [],
    };
  }
}
