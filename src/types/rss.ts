export interface RSSFeedConfig {
  url: string;
  name: string;
  refreshInterval?: number; // in milliseconds
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

export interface FeedsStore {
  [feedName: string]: Feed;
}