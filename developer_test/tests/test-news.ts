import { NewsService } from '../../src/services/newsService.js';

async function runSmokeTest() {
  const service = new NewsService({ mock: true });
  const news = await service.fetchNews(['ETH']);

  console.log('Fetched', news.length, 'news items');

  if (news.length < 3 || news.length > 5) {
    throw new Error(`Expected 3-5 news items, got ${news.length}`);
  }

  for (const item of news) {
    if (typeof item.title !== 'string' || item.title.length === 0) {
      throw new Error('Missing title in news item');
    }
    if (typeof item.source !== 'string' || item.source.length === 0) {
      throw new Error('Missing source in news item');
    }
    if (typeof item.published_at !== 'string' || item.published_at.length === 0) {
      throw new Error('Missing published_at in news item');
    }
    if (
      typeof item.sentiment_vote.positive !== 'number' ||
      typeof item.sentiment_vote.negative !== 'number' ||
      typeof item.sentiment_vote.important !== 'number'
    ) {
      throw new Error('Missing sentiment_vote fields in news item');
    }
    if (!Array.isArray(item.currencies) || item.currencies.length === 0) {
      throw new Error('Missing currencies in news item');
    }
  }

  console.log('All fields verified for', news.length, 'items');
  console.log('Smoke test PASSED');
}

runSmokeTest().catch((err) => {
  console.error('Smoke test FAILED:', err.message);
  process.exit(1);
});
