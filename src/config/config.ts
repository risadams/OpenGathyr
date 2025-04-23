/**
 * config.ts - Configuration management for OpenGathyr
 */
import dotenv from 'dotenv';
import { FeedConfig } from '../types/rss';
import { MCPServerConfig } from '../types/mcp';

// Load environment variables
dotenv.config();

// Default configuration for the RSS feeds
export const DEFAULT_REFRESH_INTERVAL = 300000; // 5 minutes in milliseconds
export const DEFAULT_MAX_ITEMS = 20;

// Function to load RSS feed URLs from environment variables
export function loadRSSFeedsFromEnv(): FeedConfig[] {
  const feeds: FeedConfig[] = [];
  const refreshInterval = process.env.RSS_REFRESH_INTERVAL 
    ? parseInt(process.env.RSS_REFRESH_INTERVAL, 10) 
    : DEFAULT_REFRESH_INTERVAL;
    
  const maxItems = process.env.RSS_MAX_ITEMS 
    ? parseInt(process.env.RSS_MAX_ITEMS, 10) 
    : DEFAULT_MAX_ITEMS;
    
  // Find all environment variables matching the pattern RSS_FEED_URL_*
  Object.keys(process.env).forEach(key => {
    if (key.match(/^RSS_FEED_URL_\d+$/)) {
      const url = process.env[key];
      if (url) {
        const feedNumber = key.split('_').pop();
        feeds.push({
          name: `feed-${feedNumber}`,
          url,
          refreshInterval,
          maxItems
        });
      }
    }
  });
  
  return feeds.length > 0 ? feeds : DEFAULT_FEEDS;
}

// Sample RSS feeds configuration
// This can be overridden by environment variables or a config file
export const DEFAULT_FEEDS: FeedConfig[] = [
  {
    name: 'news',
    url: 'https://news.google.com/rss',
    refreshInterval: DEFAULT_REFRESH_INTERVAL,
    maxItems: DEFAULT_MAX_ITEMS
  }
];

// MCP Server configuration
export const MCP_SERVER_CONFIG: MCPServerConfig = {
  name: process.env.MCP_SERVER_NAME || 'opengathyr',
  version: process.env.MCP_SERVER_VERSION || '1.0.0'
};