/**
 * Unit tests for Configuration module
 */
const {
  DEFAULT_REFRESH_INTERVAL,
  DEFAULT_MAX_ITEMS,
  DEFAULT_FEEDS,
  MCP_SERVER_CONFIG,
  loadRSSFeedsFromEnv
} = require('../../src/config/config');

describe('Configuration Module', () => {
  // Save original process.env
  const originalEnv = process.env;
  
  beforeEach(() => {
    // Reset process.env before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });
  
  afterAll(() => {
    // Restore original process.env
    process.env = originalEnv;
  });
  
  describe('Constants', () => {
    it('should export default refresh interval', () => {
      expect(DEFAULT_REFRESH_INTERVAL).toBe(300000);
    });
    
    it('should export default max items', () => {
      expect(DEFAULT_MAX_ITEMS).toBe(20);
    });
    
    it('should export default feeds array', () => {
      expect(DEFAULT_FEEDS).toBeInstanceOf(Array);
      expect(DEFAULT_FEEDS.length).toBeGreaterThan(0);
      expect(DEFAULT_FEEDS[0]).toHaveProperty('name');
      expect(DEFAULT_FEEDS[0]).toHaveProperty('url');
    });
    
    it('should export MCP server configuration', () => {
      expect(MCP_SERVER_CONFIG).toHaveProperty('name');
      expect(MCP_SERVER_CONFIG).toHaveProperty('version');
    });
  });
  
  describe('loadRSSFeedsFromEnv', () => {
    it('should return default feeds when no environment variables exist', () => {
      // Clear any RSS feed environment variables
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('RSS_FEED_URL_')) {
          delete process.env[key];
        }
      });
      
      const feeds = loadRSSFeedsFromEnv();
      expect(feeds).toEqual(DEFAULT_FEEDS);
    });
    
    it('should load feeds from environment variables', () => {
      // Set feed environment variables
      process.env.RSS_FEED_URL_1 = 'https://example.com/feed1';
      process.env.RSS_FEED_URL_2 = 'https://example.com/feed2';
      
      const feeds = loadRSSFeedsFromEnv();
      
      expect(feeds.length).toBe(2);
      expect(feeds[0].name).toBe('feed-1');
      expect(feeds[0].url).toBe('https://example.com/feed1');
      expect(feeds[1].name).toBe('feed-2');
      expect(feeds[1].url).toBe('https://example.com/feed2');
    });
    
    it('should use custom refresh interval from environment variables', () => {
      process.env.RSS_FEED_URL_1 = 'https://example.com/feed1';
      process.env.RSS_REFRESH_INTERVAL = '60000'; // 1 minute
      
      const feeds = loadRSSFeedsFromEnv();
      
      expect(feeds[0].refreshInterval).toBe(60000);
    });
    
    it('should use custom max items from environment variables', () => {
      process.env.RSS_FEED_URL_1 = 'https://example.com/feed1';
      process.env.RSS_MAX_ITEMS = '10';
      
      const feeds = loadRSSFeedsFromEnv();
      
      expect(feeds[0].maxItems).toBe(10);
    });
    
    it('should ignore non-numeric environment variables', () => {
      process.env.RSS_FEED_URL_1 = 'https://example.com/feed1';
      process.env.RSS_FEED_URL_ABC = 'https://example.com/invalid';
      
      const feeds = loadRSSFeedsFromEnv();
      
      expect(feeds.length).toBe(1);
      expect(feeds[0].name).toBe('feed-1');
    });
  });
});