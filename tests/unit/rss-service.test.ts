/**
 * Unit tests for RSSService
 */
import { RSSService, DEFAULT_REFRESH_INTERVAL, DEFAULT_MAX_ITEMS } from '../../src/services/rss-service';
import { mockParserResponse } from '../mocks/rss-feed-mock';

// Mock the rss-parser module
jest.mock('rss-parser', () => {
  return function() {
    return {
      parseURL: jest.fn().mockImplementation((url) => {
        if (url === 'https://example.com/error') {
          return Promise.reject(new Error('Failed to fetch RSS feed'));
        }
        return Promise.resolve(mockParserResponse);
      })
    };
  };
});

describe('RSSService', () => {
  let rssService: RSSService;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Create a new instance with no initial feeds
    rssService = new RSSService();
    
    // Spy on console.error to avoid polluting test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    // Cleanup intervals that might have been created
    if (rssService) {
      const feedNames = Array.from(rssService['feedConfigs'].keys());
      feedNames.forEach(name => {
        rssService['stopFeedRefresh'](name);
      });
    }
  });

  describe('constructor', () => {
    it('should initialize with empty feeds when no feeds are provided', () => {
      expect(rssService['feeds']).toEqual({});
      expect(rssService['feedConfigs'].size).toBe(0);
      expect(rssService['refreshIntervals'].size).toBe(0);
    });

    it('should initialize with provided feeds', async () => {
      const testFeeds = [
        { name: 'test1', url: 'https://example.com/rss1' },
        { name: 'test2', url: 'https://example.com/rss2' }
      ];
      
      rssService = new RSSService(testFeeds);
      
      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(rssService['feedConfigs'].size).toBe(2);
      expect(rssService['feedConfigs'].has('test1')).toBe(true);
      expect(rssService['feedConfigs'].has('test2')).toBe(true);
    });
  });

  describe('addFeed', () => {
    it('should add a new feed with default settings', async () => {
      const feedConfig = { name: 'test', url: 'https://example.com/rss' };
      rssService.addFeed(feedConfig);
      
      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(rssService['feedConfigs'].has('test')).toBe(true);
      const config = rssService['feedConfigs'].get('test');
      expect(config.refreshInterval).toBe(DEFAULT_REFRESH_INTERVAL);
      expect(config.maxItems).toBe(DEFAULT_MAX_ITEMS);
      expect(rssService['refreshIntervals'].has('test')).toBe(true);
      expect(rssService['feeds']['test']).toBeDefined();
    });

    it('should add a feed with custom settings', async () => {
      const feedConfig = { 
        name: 'custom', 
        url: 'https://example.com/rss',
        refreshInterval: 60000,
        maxItems: 10
      };
      
      rssService.addFeed(feedConfig);
      
      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const config = rssService['feedConfigs'].get('custom');
      expect(config.refreshInterval).toBe(60000);
      expect(config.maxItems).toBe(10);
    });

    it('should update an existing feed', async () => {
      const feedConfig1 = { name: 'test', url: 'https://example.com/rss1' };
      const feedConfig2 = { name: 'test', url: 'https://example.com/rss2' };
      
      rssService.addFeed(feedConfig1);
      
      // Wait for the first feed to be loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Update with the second feed
      rssService.addFeed(feedConfig2);
      
      // Wait for the second feed to be loaded
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(rssService['feedConfigs'].get('test').url).toBe('https://example.com/rss2');
    });
  });

  describe('removeFeed', () => {
    it('should remove an existing feed', async () => {
      const feedConfig = { name: 'test', url: 'https://example.com/rss' };
      rssService.addFeed(feedConfig);
      
      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(rssService['feedConfigs'].has('test')).toBe(true);
      
      rssService.removeFeed('test');
      
      expect(rssService['feedConfigs'].has('test')).toBe(false);
      expect(rssService['refreshIntervals'].has('test')).toBe(false);
      expect(rssService['feeds']['test']).toBeUndefined();
    });

    it('should handle removing a non-existent feed', () => {
      rssService.removeFeed('nonexistent');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('getFeed methods', () => {
    beforeEach(async () => {
      const feedConfig = { name: 'test', url: 'https://example.com/rss' };
      rssService.addFeed(feedConfig);
      
      // Wait for feed to be loaded
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should get all feeds', () => {
      const feeds = rssService.getAllFeeds();
      expect(feeds.test).toBeDefined();
      expect(feeds.test.title).toBe(mockParserResponse.title);
    });

    it('should get a specific feed by name', () => {
      const feed = rssService.getFeed('test');
      expect(feed).toBeDefined();
      expect(feed.title).toBe(mockParserResponse.title);
    });

    it('should return null when getting a non-existent feed', () => {
      const feed = rssService.getFeed('nonexistent');
      expect(feed).toBeNull();
    });

    it('should get items from a specific feed', () => {
      const items = rssService.getFeedItems('test');
      expect(items.length).toBe(mockParserResponse.items.length);
    });

    it('should return empty array when getting items from a non-existent feed', () => {
      const items = rssService.getFeedItems('nonexistent');
      expect(items).toEqual([]);
    });
  });

  describe('searchFeeds', () => {
    beforeEach(async () => {
      const feedConfig = { name: 'test', url: 'https://example.com/rss' };
      rssService.addFeed(feedConfig);
      
      // Wait for feed to be loaded
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should find items by title', () => {
      const results = rssService.searchFeeds('Test Article 1');
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Test Article 1');
    });

    it('should find items by content', () => {
      const results = rssService.searchFeeds('special keywords');
      expect(results.length).toBe(1);
      expect(results[0].title).toBe('Special Keywords Article');
    });

    it('should return empty array when no matches are found', () => {
      const results = rssService.searchFeeds('nonexistent content');
      expect(results).toEqual([]);
    });
  });

  describe('fetchFeed', () => {
    it('should fetch and parse a feed', async () => {
      const feedConfig = { name: 'test', url: 'https://example.com/rss' };
      rssService.addFeed(feedConfig);
      
      // The addFeed method already calls fetchFeed, so we'll call it again manually
      await rssService.fetchFeed('test');
      
      expect(rssService['feeds']['test']).toBeDefined();
      expect(rssService['feeds']['test'].title).toBe(mockParserResponse.title);
      expect(rssService['feeds']['test'].items.length).toBe(mockParserResponse.items.length);
    });

    it('should limit the number of items based on maxItems', async () => {
      const feedConfig = { 
        name: 'limited', 
        url: 'https://example.com/rss',
        maxItems: 1 
      };
      
      rssService.addFeed(feedConfig);
      
      // Wait for async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(rssService['feeds']['limited'].items.length).toBe(1);
    });

    it('should handle errors when fetching a feed', async () => {
      const feedConfig = { name: 'error', url: 'https://example.com/error' };
      rssService.addFeed(feedConfig);
      
      // The initial fetch will fail but we need to test the explicit call
      await expect(rssService.fetchFeed('error')).rejects.toThrow('Failed to fetch RSS feed');
    });

    it('should throw an error when fetching a non-existent feed', async () => {
      await expect(rssService.fetchFeed('nonexistent')).rejects.toThrow("No feed with name 'nonexistent' found");
    });
  });
});