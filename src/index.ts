/**
 * index.ts - Main entry point for OpenGathyr MCP RSS Feed Server
 * 
 * This server uses the Model Context Protocol to provide RSS feed content
 * to MCP clients like ChatGPT, Claude, and others.
 */

// Import dependencies
import { z } from 'zod';
import { RSSService } from './services/rss-service';
import { 
  MCP_SERVER_CONFIG, 
  loadRSSFeedsFromEnv 
} from './config/config';

// Use our custom MCP SDK adapter
import { server as mcpSdk } from './adapters/mcpSdkAdapter';

// Initialize the RSS service with feeds from environment variables
const rssService = new RSSService(loadRSSFeedsFromEnv());

// Create MCP Server instance
const server = new mcpSdk.McpServer({
  name: MCP_SERVER_CONFIG.name,
  version: MCP_SERVER_CONFIG.version,
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Register tool to get feed content
server.tool(
  "get-feed",
  "Get content from a specific RSS feed",
  {
    feedName: z.string().describe("Name of the feed to retrieve"),
  },
  async (params) => {
    const feed = rssService.getFeed(params.feedName);
    
    if (!feed) {
      return {
        content: [
          {
            type: "text",
            text: `Feed '${params.feedName}' not found. Available feeds: ${Object.keys(rssService.getAllFeeds()).join(", ")}`,
          },
        ],
      };
    }
    
    const items = feed.items.map(item => {
      return `## ${item.title}\n${item.pubDate ? `Published: ${item.pubDate}\n` : ''}${item.contentSnippet || ''}\n${item.link ? `[Read More](${item.link})` : ''}\n\n`;
    });
    
    return {
      content: [
        {
          type: "text",
          text: `# ${feed.title}\n\n${feed.description || ''}\n\nLast Updated: ${feed.lastUpdated.toLocaleString()}\n\n${items.join('')}`,
        },
      ],
    };
  }
);

// Register tool to search across all feeds
server.tool(
  "search-feeds",
  "Search for content across all RSS feeds",
  {
    query: z.string().describe("Search term to look for in feed titles and content"),
  },
  async (params) => {
    const results = rssService.searchFeeds(params.query);
    
    if (results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No results found for search term: "${params.query}"`,
          },
        ],
      };
    }
    
    const formattedResults = results.map(item => {
      return `## ${item.title}\n${item.pubDate ? `Published: ${item.pubDate}\n` : ''}${item.contentSnippet || ''}\n${item.link ? `[Read More](${item.link})` : ''}\n\n`;
    });
    
    return {
      content: [
        {
          type: "text",
          text: `# Search Results for: "${params.query}"\n\nFound ${results.length} matching items\n\n${formattedResults.join('')}`,
        },
      ],
    };
  }
);

// Register tool to list all available feeds
server.tool(
  "list-feeds",
  "List all available RSS feeds",
  {},
  async () => {
    const feeds = rssService.getAllFeeds();
    const feedEntries = Object.entries(feeds);
    
    if (feedEntries.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No RSS feeds are currently configured.",
          },
        ],
      };
    }
    
    const feedList = feedEntries.map(([name, feed]) => {
      return `## ${feed.title}\nName: ${name}\nItems: ${feed.items.length}\nLast Updated: ${feed.lastUpdated.toLocaleString()}\n${feed.description ? `Description: ${feed.description}\n` : ''}URL: ${feed.feedUrl}\n\n`;
    });
    
    return {
      content: [
        {
          type: "text",
          text: `# Available RSS Feeds\n\n${feedList.join('')}`,
        },
      ],
    };
  }
);

// Register tool to add a new feed
server.tool(
  "add-feed",
  "Add a new RSS feed to monitor",
  {
    name: z.string().describe("Name to identify this feed"),
    url: z.string().url().describe("URL of the RSS feed"),
    refreshInterval: z.number().optional().describe("Refresh interval in milliseconds (default: 300000)"),
    maxItems: z.number().optional().describe("Maximum number of items to keep (default: 20)"),
  },
  async (params) => {
    try {
      const feedConfig = {
        name: params.name,
        url: params.url,
        refreshInterval: params.refreshInterval,
        maxItems: params.maxItems,
      };
      
      rssService.addFeed(feedConfig);
      
      return {
        content: [
          {
            type: "text",
            text: `Successfully added feed: ${params.name}\nURL: ${params.url}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error adding feed: ${(error as Error).message}`,
          },
        ],
      };
    }
  }
);

// Register tool to remove a feed
server.tool(
  "remove-feed",
  "Remove an RSS feed from monitoring",
  {
    feedName: z.string().describe("Name of the feed to remove"),
  },
  async (params) => {
    try {
      rssService.removeFeed(params.feedName);
      
      return {
        content: [
          {
            type: "text",
            text: `Successfully removed feed: ${params.feedName}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error removing feed: ${(error as Error).message}`,
          },
        ],
      };
    }
  }
);

// Set up the server transport
const transport = new mcpSdk.StdioServerTransport();

// Connect and run the server
async function main(): Promise<void> {
  try {
    // Set up error handlers for the process
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
    });
    
    // Connect the server to the transport
    console.error('Starting OpenGathyr MCP RSS Feed Server...');
    await server.connect(transport);
    console.error('RSS Feed MCP Server running on stdio');
    
    // Keep the process alive until explicitly terminated
    process.stdin.resume();
  } catch (error) {
    console.error("Error starting RSS Feed MCP Server:", error);
    process.exit(1);
  }
}

main();