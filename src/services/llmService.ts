import { z } from 'zod';
import type { LLMDecision, AgentState, NewsItem, TokenBalance } from '../types/index.js';
import { DEFAULT_ALLOCATION, SAFETY_CONFIG } from '../config/constants.js';

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

interface LLMServiceConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export class LLMService {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: LLMServiceConfig = {}) {
    this.apiKey = config.apiKey ?? '';
    this.model = config.model ?? 'gpt-4o-mini';
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
  }

  async analyzeSentiment(
    news: NewsItem[],
    currentState: AgentState,
    prices: TokenBalance[],
  ): Promise<LLMDecision> {
    const cached = this.checkCache(currentState);
    if (cached) {
      return cached;
    }

    const recentNews = news.slice(0, 5);
    const titles = recentNews.map((n) => n.title);

    let rawResult: unknown;

    try {
      rawResult = await this.callLLM(titles, prices);
    } catch (error) {
      console.error('[LLMService] LLM API call failed:', error);
      return this.getFallbackDecision(currentState);
    }

    const parsed = llmDecisionSchema.safeParse(rawResult);
    if (!parsed.success) {
      console.error('[LLMService] Zod validation failed:', parsed.error.message);
      return this.getFallbackDecision(currentState);
    }

    return parsed.data;
  }

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

  private async callLLM(titles: string[], prices: TokenBalance[]): Promise<unknown> {
    if (!this.apiKey) {
      throw new Error('LLM_API_KEY is required for sentiment analysis');
    }

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

    const platformContext = titles.map((t) => `- ${t}`).join('\n');
    const priceContext = prices.map((p) => `${p.token}: $${p.price_usd ?? 'N/A'}`).join('\n');
    const userContext = `News headlines:\n${platformContext}\n\nCurrent token prices:\n${priceContext}`;

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
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
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
