import { NewsItem } from '../types/index.js';

interface CryptoPanicResult {
  title: string;
  source?: { domain?: string };
  published_at: string;
  votes?: { positive: number; negative: number; important: number };
  currencies?: { code: string }[];
}

interface CryptoPanicResponse {
  info?: string;
  results?: CryptoPanicResult[];
}

export class NewsService {
  private apiKey: string | undefined;
  private baseUrl: string;
  private mock: boolean;

  constructor(options: { apiKey?: string; baseUrl?: string; mock?: boolean } = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? 'https://cryptopanic.com/api/v1';
    this.mock = options.mock ?? false;
  }

  async fetchNews(currencies: string[]): Promise<NewsItem[]> {
    if (this.mock || !this.apiKey || this.apiKey.trim() === '') {
      if (!this.mock && (!this.apiKey || this.apiKey.trim() === '')) {
        console.warn('[NewsService] No API key provided, falling back to mock data');
      }
      return this.getMockNews(currencies);
    }

    try {
      const url = new URL(`${this.baseUrl}/posts/`);
      url.searchParams.set('auth_token', this.apiKey);
      url.searchParams.set('currencies', currencies.join(','));
      url.searchParams.set('filter', 'hot');
      url.searchParams.set('kind', 'news');

      const response = await fetch(url.toString());

      if (!response.ok) {
        console.error(`[NewsService] HTTP error ${response.status}: ${response.statusText}`);
        return [];
      }

      const data: CryptoPanicResponse = await response.json();

      if (data.info) {
        console.error(`[NewsService] API error: ${data.info}`);
        return [];
      }

      const results = data.results ?? [];
      const mapped: NewsItem[] = results.slice(0, 20).map((result) => ({
        title: result.title,
        source: result.source?.domain ?? 'unknown',
        published_at: result.published_at,
        sentiment_vote: result.votes ?? { positive: 0, negative: 0, important: 0 },
        currencies: result.currencies?.map((c) => c.code) ?? [],
      }));

      return mapped;
    } catch (error) {
      console.error('[NewsService] Failed to fetch news:', error);
      return [];
    }
  }

  private getMockNews(currencies: string[]): NewsItem[] {
    const now = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();

    return [
      {
        title: 'ETH ETF approved by SEC',
        source: 'crypto-news',
        published_at: now,
        sentiment_vote: { positive: 245, negative: 12, important: 198 },
        currencies: currencies.includes('ETH') ? ['ETH'] : currencies.slice(0, 1),
      },
      {
        title: 'Major DeFi protocol hacked, $50M lost',
        source: 'rekt',
        published_at: yesterday,
        sentiment_vote: { positive: 5, negative: 312, important: 289 },
        currencies: currencies.includes('ETH') ? ['ETH'] : currencies.slice(0, 1),
      },
      {
        title: 'Ethereum gas fees drop to yearly low',
        source: 'eth-hub',
        published_at: twoDaysAgo,
        sentiment_vote: { positive: 89, negative: 8, important: 45 },
        currencies: currencies.includes('ETH') ? ['ETH'] : currencies.slice(0, 1),
      },
      {
        title: 'Bitcoin reaches new all-time high amid institutional buying',
        source: 'coin-desk',
        published_at: now,
        sentiment_vote: { positive: 567, negative: 23, important: 412 },
        currencies: currencies.includes('BTC') ? ['BTC'] : ['BTC'],
      },
      {
        title: 'Regulatory uncertainty looms over altcoin markets',
        source: 'crypto-insider',
        published_at: yesterday,
        sentiment_vote: { positive: 34, negative: 156, important: 201 },
        currencies: currencies.length > 0 ? currencies : ['ETH'],
      },
    ];
  }
}
