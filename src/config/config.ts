import { RSSFeedConfig } from '../types/rss.js';

// Default configuration for the RSS feeds
export const DEFAULT_REFRESH_INTERVAL = 300000; // 5 minutes in milliseconds
export const DEFAULT_MAX_ITEMS = 20;

// Sample RSS feeds configuration
// This can be overridden by environment variables or a config file
export const DEFAULT_FEEDS: RSSFeedConfig[] = [
  {
    name: 'news',
    url: 'https://news.google.com/rss',
    refreshInterval: DEFAULT_REFRESH_INTERVAL,
    maxItems: DEFAULT_MAX_ITEMS
  }
];

// MCP Server configuration
export const MCP_SERVER_CONFIG = {
  name: 'opengathyr-rss',
  version: '1.0.0'
};