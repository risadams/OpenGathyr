/**
 * Type definitions for RSS service
 */

export interface FeedConfig {
  name: string;
  url: string;
  refreshInterval?: number;
  maxItems?: number;
}

export interface FeedItem {
  title: string;
  link?: string;
  content?: string;
  contentSnippet?: string;
  author?: string;
  categories?: string[];
  pubDate?: string;
  isoDate?: string;
  guid?: string;
}

export interface Feed {
  title: string;
  description?: string;
  link?: string;
  items: FeedItem[];
  lastUpdated: Date;
  feedUrl: string;
}

export interface Feeds {
  [feedName: string]: Feed;
}