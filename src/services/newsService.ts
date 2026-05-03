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

  constructor(options: { apiKey?: string; baseUrl?: string } = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? 'https://cryptopanic.com/api/v1';
  }

  async fetchNews(currencies: string[]): Promise<NewsItem[]> {
    if (!this.apiKey || this.apiKey.trim() === '') {
      console.warn('[NewsService] No API key provided, returning empty news array');
      return [];
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
}
