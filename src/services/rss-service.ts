/**
 * RSSService.ts - Core service for RSS feed fetching and management
 */
import Parser from 'rss-parser';
import { Feed, FeedConfig, FeedItem, Feeds } from '../types/rss';

// Default configuration
export const DEFAULT_REFRESH_INTERVAL = 300000; // 5 minutes in milliseconds
export const DEFAULT_MAX_ITEMS = 20;

export class RSSService {
  private parser: Parser;
  private feeds: Feeds;
  private feedConfigs: Map<string, FeedConfig>;
  private refreshIntervals: Map<string, NodeJS.Timeout>;
  
  constructor(feeds: FeedConfig[] = []) {
    this.parser = new Parser();
    this.feeds = {};
    this.feedConfigs = new Map();
    this.refreshIntervals = new Map();
    
    // Initialize with the provided feeds
    feeds.forEach(feed => {
      this.addFeed(feed);
    });
  }

  // Add a new feed to monitor
  public addFeed(feedConfig: FeedConfig): void {
    const { name, url, refreshInterval = DEFAULT_REFRESH_INTERVAL, maxItems = DEFAULT_MAX_ITEMS } = feedConfig;
    
    if (this.feedConfigs.has(name)) {
      console.error(`Feed with name '${name}' already exists. Updating configuration.`);
      this.stopFeedRefresh(name);
    }
    
    this.feedConfigs.set(name, {
      name,
      url,
      refreshInterval,
      maxItems
    });
    
    // Initial fetch
    this.fetchFeed(name)
      .then(() => {
        console.error(`[RSSService] Successfully fetched feed: ${name}`);
      })
      .catch(error => {
        console.error(`[RSSService] Error fetching feed ${name}:`, error);
      });
    
    // Set up periodic refresh
    this.startFeedRefresh(name);
  }

  // Remove a feed from monitoring
  public removeFeed(feedName: string): void {
    if (!this.feedConfigs.has(feedName)) {
      console.error(`No feed with name '${feedName}' found.`);
      return;
    }
    
    this.stopFeedRefresh(feedName);
    this.feedConfigs.delete(feedName);
    delete this.feeds[feedName];
    console.error(`[RSSService] Feed '${feedName}' removed.`);
  }

  // Get all feeds
  public getAllFeeds(): Feeds {
    return { ...this.feeds };
  }

  // Get a specific feed by name
  public getFeed(feedName: string): Feed | null {
    return this.feeds[feedName] || null;
  }

  // Get items from a specific feed
  public getFeedItems(feedName: string): FeedItem[] {
    return this.feeds[feedName]?.items || [];
  }

  // Search across all feeds
  public searchFeeds(query: string): FeedItem[] {
    const lowercaseQuery = query.toLowerCase();
    const results: FeedItem[] = [];
    
    Object.values(this.feeds).forEach(feed => {
      feed.items.forEach(item => {
        const titleMatch = item.title?.toLowerCase().includes(lowercaseQuery);
        const contentMatch = item.content?.toLowerCase().includes(lowercaseQuery) 
                          || item.contentSnippet?.toLowerCase().includes(lowercaseQuery);
        
        if (titleMatch || contentMatch) {
          results.push(item);
        }
      });
    });
    
    return results;
  }

  // Start the refresh interval for a feed
  private startFeedRefresh(feedName: string): void {
    if (!this.feedConfigs.has(feedName)) {
      return;
    }
    
    const { refreshInterval = DEFAULT_REFRESH_INTERVAL } = this.feedConfigs.get(feedName)!;
    
    // Clear any existing interval
    this.stopFeedRefresh(feedName);
    
    // Set new interval
    const intervalId = setInterval(() => {
      this.fetchFeed(feedName)
        .catch(error => {
          console.error(`[RSSService] Error refreshing feed ${feedName}:`, error);
        });
    }, refreshInterval);
    
    // Prevent the timer from keeping the process alive
    intervalId.unref();
    
    this.refreshIntervals.set(feedName, intervalId);
  }

  // Stop the refresh interval for a feed
  private stopFeedRefresh(feedName: string): void {
    if (this.refreshIntervals.has(feedName)) {
      clearInterval(this.refreshIntervals.get(feedName)!);
      this.refreshIntervals.delete(feedName);
    }
  }

  // Fetch and parse a feed
  public async fetchFeed(feedName: string): Promise<void> {
    if (!this.feedConfigs.has(feedName)) {
      throw new Error(`No feed with name '${feedName}' found.`);
    }
    
    const { url, maxItems = DEFAULT_MAX_ITEMS } = this.feedConfigs.get(feedName)!;
    
    try {
      const parsedFeed = await this.parser.parseURL(url);
      
      // Convert parser items to our custom format
      const items: FeedItem[] = parsedFeed.items.map(item => ({
        title: item.title || 'Untitled',
        link: item.link,
        content: item.content,
        contentSnippet: item.contentSnippet,
        author: item.creator || item.author,
        categories: item.categories,
        pubDate: item.pubDate,
        isoDate: item.isoDate,
        guid: item.guid,
      }));
      
      this.feeds[feedName] = {
        title: parsedFeed.title || feedName,
        description: parsedFeed.description,
        link: parsedFeed.link,
        items: items.slice(0, maxItems),
        lastUpdated: new Date(),
        feedUrl: url
      };
      
      return;
    } catch (error) {
      console.error(`[RSSService] Error fetching feed ${feedName}:`, error);
      throw error;
    }
  }
}