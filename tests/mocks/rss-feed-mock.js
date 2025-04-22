/**
 * Mock RSS feed data for testing
 */

const mockRssFeed = {
  title: 'Test Feed',
  description: 'A test RSS feed for unit testing',
  link: 'https://example.com/rss',
  items: [
    {
      title: 'Test Article 1',
      link: 'https://example.com/article1',
      content: '<p>This is the full content of test article 1</p>',
      contentSnippet: 'This is the full content of test article 1',
      guid: '1',
      isoDate: '2025-04-01T10:00:00.000Z',
      pubDate: 'Mon, 01 Apr 2025 10:00:00 GMT',
    },
    {
      title: 'Test Article 2',
      link: 'https://example.com/article2',
      content: '<p>This is the full content of test article 2</p>',
      contentSnippet: 'This is the full content of test article 2',
      guid: '2',
      isoDate: '2025-04-02T10:00:00.000Z',
      pubDate: 'Tue, 02 Apr 2025 10:00:00 GMT',
    },
    {
      title: 'Special Keywords Article',
      link: 'https://example.com/special',
      content: '<p>This article contains special keywords for testing search functionality</p>',
      contentSnippet: 'This article contains special keywords for testing search functionality',
      guid: '3',
      isoDate: '2025-04-03T10:00:00.000Z',
      pubDate: 'Wed, 03 Apr 2025 10:00:00 GMT',
    }
  ]
};

// Mock for RSS Parser
const mockParserResponse = {
  title: mockRssFeed.title,
  description: mockRssFeed.description,
  link: mockRssFeed.link,
  items: mockRssFeed.items
};

module.exports = {
  mockRssFeed,
  mockParserResponse
};