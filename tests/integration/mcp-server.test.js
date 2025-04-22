/**
 * Integration tests for the MCP server and its tools
 */
const mcpSdk = require('../../src/adapters/mcpSdkAdapter');
const { RSSService } = require('../../src/services/rss-service');
const { mockParserResponse } = require('../mocks/rss-feed-mock');

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

describe('MCP Server Integration', () => {
  let server;
  let transport;
  let rssService;
  
  beforeEach(() => {
    // Spy on console.error to avoid polluting test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create a mock transport
    transport = {
      on: jest.fn(),
      send: jest.fn(),
      ready: jest.fn().mockResolvedValue(true),
      emit: jest.fn()
    };
    
    // Initialize RSS service with a test feed
    rssService = new RSSService([
      { name: 'test-feed', url: 'https://example.com/rss' }
    ]);
    
    // Wait for the feed to be loaded
    return new Promise(resolve => setTimeout(resolve, 100));
  });
  
  /**
   * Helper function to simulate handling an MCP request
   */
  async function simulateRequest(request) {
    // Find the request handler registered with the transport
    const requestHandlerCalls = transport.on.mock.calls;
    const requestHandler = requestHandlerCalls.find(call => call[0] === 'request');
    
    if (!requestHandler || !requestHandler[1]) {
      throw new Error('Request handler not properly registered with transport');
    }
    
    // Call the handler with the request
    await requestHandler[1](request);
  }
  
  /**
   * Helper function to find tool result responses
   */
  function findToolResults() {
    return transport.send.mock.calls
      .map(call => call[0])
      .filter(response => response.type === 'tool_result');
  }
  
  describe('Tool: get-feed', () => {
    it('should return feed content when given a valid feed name', async () => {
      // Create a server with the get-feed tool
      server = new mcpSdk.server.McpServer({
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {} }
      });
      
      // Register the get-feed tool with our test RSS service
      server.tool(
        "get-feed",
        "Get content from a specific RSS feed",
        { feedName: { description: "Name of the feed to retrieve" } },
        async (params) => {
          const feed = rssService.getFeed(params.feedName);
          
          if (!feed) {
            return {
              content: [
                {
                  type: "text",
                  text: `Feed '${params.feedName}' not found.`,
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
      
      // Connect the server to the transport
      await server.connect(transport);
      
      // Mock a tool request
      const toolRequest = {
        type: 'tool',
        name: 'get-feed',
        params: { feedName: 'test-feed' }
      };
      
      // Simulate the request
      await simulateRequest(toolRequest);
      
      // Verify the response
      expect(transport.send).toHaveBeenCalled();
      const response = transport.send.mock.calls[0][0];
      expect(response.type).toBe('tool_result');
      expect(response.result.content[0].type).toBe('text');
      expect(response.result.content[0].text).toContain('# Test Feed');
      expect(response.result.content[0].text).toContain('Test Article 1');
    });
    
    it('should return an error message when given an invalid feed name', async () => {
      // Create a server with the get-feed tool
      server = new mcpSdk.server.McpServer({
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {} }
      });
      
      // Register the get-feed tool with our test RSS service
      server.tool(
        "get-feed",
        "Get content from a specific RSS feed",
        { feedName: { description: "Name of the feed to retrieve" } },
        async (params) => {
          const feed = rssService.getFeed(params.feedName);
          
          if (!feed) {
            return {
              content: [
                {
                  type: "text",
                  text: `Feed '${params.feedName}' not found.`,
                },
              ],
            };
          }
          
          // Rest of handler implementation...
          return { content: [{ type: "text", text: "Feed content" }] };
        }
      );
      
      // Connect the server to the transport
      await server.connect(transport);
      
      // Mock a tool request with an invalid feed name
      const toolRequest = {
        type: 'tool',
        name: 'get-feed',
        params: { feedName: 'nonexistent-feed' }
      };
      
      // Simulate the request
      await simulateRequest(toolRequest);
      
      // Verify the response contains an error message
      expect(transport.send).toHaveBeenCalled();
      
      // Find the tool_result response
      const toolResultResponses = findToolResults();
      
      expect(toolResultResponses.length).toBeGreaterThan(0);
      const response = toolResultResponses[0];
      expect(response.result.content[0].text).toContain(`Feed 'nonexistent-feed' not found`);
    });
  });
  
  describe('Tool: search-feeds', () => {
    it('should return matching items when searching with a valid query', async () => {
      // Create a server with the search-feeds tool
      server = new mcpSdk.server.McpServer({
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {} }
      });
      
      // Register the search-feeds tool with our test RSS service
      server.tool(
        "search-feeds",
        "Search for content across all RSS feeds",
        { query: { description: "Search term to look for in feed titles and content" } },
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
      
      // Connect the server to the transport
      await server.connect(transport);
      
      // Mock a tool request
      const toolRequest = {
        type: 'tool',
        name: 'search-feeds',
        params: { query: 'special keywords' }
      };
      
      // Simulate the request
      await simulateRequest(toolRequest);
      
      // Verify the response
      expect(transport.send).toHaveBeenCalled();
      
      // Find the tool_result response
      const toolResultResponses = findToolResults();
      
      expect(toolResultResponses.length).toBeGreaterThan(0);
      const response = toolResultResponses[0];
      expect(response.result.content[0].text).toContain('# Search Results for: "special keywords"');
      expect(response.result.content[0].text).toContain('Special Keywords Article');
    });
    
    it('should return a message when no results are found', async () => {
      // Create a server with the search-feeds tool
      server = new mcpSdk.server.McpServer({
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {} }
      });
      
      // Register the search-feeds tool with our test RSS service
      server.tool(
        "search-feeds",
        "Search for content across all RSS feeds",
        { query: { description: "Search term to look for in feed titles and content" } },
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
      
      // Connect the server to the transport
      await server.connect(transport);
      
      // Mock a tool request with a query that won't match anything
      const toolRequest = {
        type: 'tool',
        name: 'search-feeds',
        params: { query: 'nonexistent content' }
      };
      
      // Simulate the request
      await simulateRequest(toolRequest);
      
      // Verify the response
      const toolResultResponses = findToolResults();
      expect(toolResultResponses.length).toBeGreaterThan(0);
      const response = toolResultResponses[0];
      expect(response.result.content[0].text).toContain('No results found for search term: "nonexistent content"');
    });
  });
  
  describe('Tool: list-feeds', () => {
    it('should list all available feeds', async () => {
      // Create a server with the list-feeds tool
      server = new mcpSdk.server.McpServer({
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {} }
      });
      
      // Register the list-feeds tool with our test RSS service
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
      
      // Connect the server to the transport
      await server.connect(transport);
      
      // Mock a tool request
      const toolRequest = {
        type: 'tool',
        name: 'list-feeds'
      };
      
      // Simulate the request
      await simulateRequest(toolRequest);
      
      // Verify the response
      const toolResultResponses = findToolResults();
      expect(toolResultResponses.length).toBeGreaterThan(0);
      const response = toolResultResponses[0];
      
      expect(response.result.content[0].text).toContain('# Available RSS Feeds');
      expect(response.result.content[0].text).toContain('Name: test-feed');
      expect(response.result.content[0].text).toContain('Test Feed');
    });
    
    it('should return a message when no feeds are configured', async () => {
      // Create a new empty RSS service without feeds
      const emptyRssService = new RSSService([]);
      
      // Create a server with the list-feeds tool
      server = new mcpSdk.server.McpServer({
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {} }
      });
      
      // Register the list-feeds tool with our empty RSS service
      server.tool(
        "list-feeds",
        "List all available RSS feeds",
        {},
        async () => {
          const feeds = emptyRssService.getAllFeeds();
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
      
      // Connect the server to the transport
      await server.connect(transport);
      
      // Mock a tool request
      const toolRequest = {
        type: 'tool',
        name: 'list-feeds'
      };
      
      // Simulate the request
      await simulateRequest(toolRequest);
      
      // Verify the response
      const toolResultResponses = findToolResults();
      expect(toolResultResponses.length).toBeGreaterThan(0);
      const response = toolResultResponses[0];
      
      expect(response.result.content[0].text).toBe("No RSS feeds are currently configured.");
    });
  });
  
  describe('Tool: add-feed', () => {
    it('should add a new feed successfully', async () => {
      // Create a server with the add-feed tool
      server = new mcpSdk.server.McpServer({
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {} }
      });
      
      // Register the add-feed tool with our test RSS service
      server.tool(
        "add-feed",
        "Add a new RSS feed to monitor",
        {
          name: { description: "Name to identify this feed" },
          url: { description: "URL of the RSS feed" },
          refreshInterval: { description: "Refresh interval in milliseconds (default: 300000)" },
          maxItems: { description: "Maximum number of items to keep (default: 20)" }
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
                  text: `Error adding feed: ${error.message}`,
                },
              ],
            };
          }
        }
      );
      
      // Connect the server to the transport
      await server.connect(transport);
      
      // Mock a tool request
      const toolRequest = {
        type: 'tool',
        name: 'add-feed',
        params: {
          name: 'new-feed',
          url: 'https://example.com/new-rss',
          refreshInterval: 60000,
          maxItems: 10
        }
      };
      
      // Simulate the request
      await simulateRequest(toolRequest);
      
      // Verify the response
      const toolResultResponses = findToolResults();
      expect(toolResultResponses.length).toBeGreaterThan(0);
      const response = toolResultResponses[0];
      
      expect(response.result.content[0].text).toContain('Successfully added feed: new-feed');
      expect(response.result.content[0].text).toContain('URL: https://example.com/new-rss');
      
      // Verify the feed was actually added to the service
      expect(rssService.feedConfigs.has('new-feed')).toBe(true);
      const config = rssService.feedConfigs.get('new-feed');
      expect(config.url).toBe('https://example.com/new-rss');
      expect(config.refreshInterval).toBe(60000);
      expect(config.maxItems).toBe(10);
    });
    
    it('should handle errors when adding a feed', async () => {
      // Create a mocked RSS service with an addFeed method that throws an error
      const errorRssService = {
        addFeed: jest.fn().mockImplementation(() => {
          throw new Error('Failed to add feed');
        })
      };
      
      // Create a server with the add-feed tool
      server = new mcpSdk.server.McpServer({
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {} }
      });
      
      // Register the add-feed tool with our error RSS service
      server.tool(
        "add-feed",
        "Add a new RSS feed to monitor",
        {
          name: { description: "Name to identify this feed" },
          url: { description: "URL of the RSS feed" },
          refreshInterval: { description: "Refresh interval in milliseconds (default: 300000)" },
          maxItems: { description: "Maximum number of items to keep (default: 20)" }
        },
        async (params) => {
          try {
            const feedConfig = {
              name: params.name,
              url: params.url,
              refreshInterval: params.refreshInterval,
              maxItems: params.maxItems,
            };
            
            errorRssService.addFeed(feedConfig);
            
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
                  text: `Error adding feed: ${error.message}`,
                },
              ],
            };
          }
        }
      );
      
      // Connect the server to the transport
      await server.connect(transport);
      
      // Mock a tool request
      const toolRequest = {
        type: 'tool',
        name: 'add-feed',
        params: {
          name: 'error-feed',
          url: 'https://example.com/error-rss'
        }
      };
      
      // Simulate the request
      await simulateRequest(toolRequest);
      
      // Verify the response
      const toolResultResponses = findToolResults();
      expect(toolResultResponses.length).toBeGreaterThan(0);
      const response = toolResultResponses[0];
      
      expect(response.result.content[0].text).toBe('Error adding feed: Failed to add feed');
      expect(errorRssService.addFeed).toHaveBeenCalled();
    });
  });
  
  describe('Tool: remove-feed', () => {
    it('should remove an existing feed successfully', async () => {
      // Make sure we have a feed to remove
      expect(rssService.feedConfigs.has('test-feed')).toBe(true);
      
      // Create a server with the remove-feed tool
      server = new mcpSdk.server.McpServer({
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {} }
      });
      
      // Register the remove-feed tool with our test RSS service
      server.tool(
        "remove-feed",
        "Remove an RSS feed from monitoring",
        {
          feedName: { description: "Name of the feed to remove" }
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
                  text: `Error removing feed: ${error.message}`,
                },
              ],
            };
          }
        }
      );
      
      // Connect the server to the transport
      await server.connect(transport);
      
      // Mock a tool request
      const toolRequest = {
        type: 'tool',
        name: 'remove-feed',
        params: {
          feedName: 'test-feed'
        }
      };
      
      // Simulate the request
      await simulateRequest(toolRequest);
      
      // Verify the response
      const toolResultResponses = findToolResults();
      expect(toolResultResponses.length).toBeGreaterThan(0);
      const response = toolResultResponses[0];
      
      expect(response.result.content[0].text).toBe('Successfully removed feed: test-feed');
      
      // Verify the feed was actually removed from the service
      expect(rssService.feedConfigs.has('test-feed')).toBe(false);
    });
    
    it('should handle removing a non-existent feed', async () => {
      // Create a server with the remove-feed tool
      server = new mcpSdk.server.McpServer({
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {} }
      });
      
      // Spy on the removeFeed method to check it's called
      jest.spyOn(rssService, 'removeFeed');
      
      // Register the remove-feed tool with our test RSS service
      server.tool(
        "remove-feed",
        "Remove an RSS feed from monitoring",
        {
          feedName: { description: "Name of the feed to remove" }
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
                  text: `Error removing feed: ${error.message}`,
                },
              ],
            };
          }
        }
      );
      
      // Connect the server to the transport
      await server.connect(transport);
      
      // Mock a tool request for a non-existent feed
      const toolRequest = {
        type: 'tool',
        name: 'remove-feed',
        params: {
          feedName: 'nonexistent-feed'
        }
      };
      
      // Simulate the request
      await simulateRequest(toolRequest);
      
      // Verify the service method was called
      expect(rssService.removeFeed).toHaveBeenCalledWith('nonexistent-feed');
      
      // Verify the response (it will still return success since removeFeed doesn't throw errors)
      const toolResultResponses = findToolResults();
      expect(toolResultResponses.length).toBeGreaterThan(0);
      const response = toolResultResponses[0];
      expect(response.result.content[0].text).toBe('Successfully removed feed: nonexistent-feed');
    });
  });
  
  describe('MCP Protocol basics', () => {
    beforeEach(() => {
      // Create a basic server for protocol tests
      server = new mcpSdk.server.McpServer({
        name: 'test-server',
        version: '1.0.0',
        capabilities: { resources: {}, tools: {} }
      });
    });
    
    it('should respond to initialize requests', async () => {
      await server.connect(transport);
      
      const initRequest = { type: 'initialize' };
      await simulateRequest(initRequest);
      
      expect(transport.send).toHaveBeenCalled();
      const response = transport.send.mock.calls[0][0];
      expect(response.type).toBe('initialize_result');
      expect(response.server.name).toBe('test-server');
      expect(response.server.version).toBe('1.0.0');
    });
    
    it('should respond to capabilities requests', async () => {
      // Register a sample tool for the capabilities test
      server.tool(
        "test-tool",
        "Test tool description",
        { param: { description: "Test parameter" } },
        async () => ({ content: [] })
      );
      
      await server.connect(transport);
      
      const capabilitiesRequest = { type: 'capabilities' };
      await simulateRequest(capabilitiesRequest);
      
      expect(transport.send).toHaveBeenCalled();
      const responses = transport.send.mock.calls.map(call => call[0]);
      const capabilitiesResponse = responses.find(r => r.type === 'capabilities_result');
      
      expect(capabilitiesResponse).toBeDefined();
      expect(capabilitiesResponse.capabilities.tools).toHaveProperty('test-tool');
      expect(capabilitiesResponse.capabilities.tools['test-tool'].description).toBe('Test tool description');
    });
    
    it('should handle unknown request types with an error', async () => {
      await server.connect(transport);
      
      const unknownRequest = { type: 'unknown-request-type' };
      await simulateRequest(unknownRequest);
      
      expect(transport.send).toHaveBeenCalled();
      const responses = transport.send.mock.calls.map(call => call[0]);
      const errorResponse = responses.find(r => r.type === 'error');
      
      expect(errorResponse).toBeDefined();
      expect(errorResponse.error.message).toContain('Unknown request type');
    });
    
    it('should handle requests for non-existent tools with an error', async () => {
      await server.connect(transport);
      
      const nonExistentToolRequest = { 
        type: 'tool',
        name: 'non-existent-tool',
        params: {}
      };
      
      await simulateRequest(nonExistentToolRequest);
      
      expect(transport.send).toHaveBeenCalled();
      const responses = transport.send.mock.calls.map(call => call[0]);
      const errorResponse = responses.find(r => r.type === 'error');
      
      expect(errorResponse).toBeDefined();
      expect(errorResponse.error.message).toContain('Tool not found');
    });
  });
});