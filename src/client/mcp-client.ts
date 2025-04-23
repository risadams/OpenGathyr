/**
 * MCP client to interact with the OpenGathyr MCP RSS Feed Server
 */

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';
import { McpRequest, McpResponse, McpResponseContent } from '../types/mcp-client';
import { EventEmitter } from 'events';

export class McpClient extends EventEmitter {
  private serverProcess: ChildProcessWithoutNullStreams | null = null;
  private requestId = 0;
  private requestCallbacks = new Map<number, (response: McpResponse) => void>();
  private isServerReady = false;
  private serverPath: string;
  
  /**
   * Create a new MCP client instance
   * @param serverPath Path to the server executable
   */
  constructor(serverPath?: string) {
    super();
    this.serverPath = serverPath || path.join(process.cwd(), 'dist/index.js');
  }

  /**
   * Start the MCP server process
   */
  public async start(): Promise<void> {
    if (this.serverProcess) {
      return;
    }

    this.serverProcess = spawn('node', [this.serverPath]);
    
    // Increase max listeners to prevent warnings
    this.serverProcess.stdout.setMaxListeners(20);
    this.serverProcess.stderr.setMaxListeners(20);
    
    // Set up error handling
    this.serverProcess.stderr.on('data', (data: Buffer) => {
      this.emit('log', `[Server Log] ${data.toString()}`);
    });

    // Set up response handling
    this.serverProcess.stdout.on('data', (data: Buffer) => {
      try {
        const lines = data.toString().trim().split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          const response: McpResponse = JSON.parse(line);
          const callback = this.requestCallbacks.get(response.id);
          
          if (callback) {
            callback(response);
            this.requestCallbacks.delete(response.id);
          } else {
            this.emit('response', response);
          }
        }
      } catch {
        const error = new Error(`Failed to parse server response: ${data.toString()}`);
        this.emit('error', error);
      }
    });

    // Wait for server to be ready
    return new Promise((resolve) => {
      setTimeout(() => {
        this.isServerReady = true;
        this.emit('ready');
        resolve();
      }, 2000);
    });
  }

  /**
   * Stop the MCP server process
   */
  public stop(): void {
    if (this.serverProcess) {
      // Remove all listeners before killing to prevent memory leaks
      this.serverProcess.stdout.removeAllListeners();
      this.serverProcess.stderr.removeAllListeners();
      
      this.serverProcess.kill();
      this.serverProcess = null;
      this.isServerReady = false;
      this.emit('stopped');
    }
  }

  /**
   * Send a request to the MCP server
   * @param tool The name of the tool to execute
   * @param params Parameters for the tool
   * @returns Promise resolving to the MCP response
   */
  public async sendRequest(tool: string, params: Record<string, unknown> = {}): Promise<McpResponse> {
    if (!this.serverProcess || !this.isServerReady) {
      throw new Error('Server not ready. Call start() first.');
    }

    const id = ++this.requestId;
    
    const request: McpRequest = {
      jsonrpc: '2.0',
      id,
      method: 'tool',
      params: {
        name: tool,
        params
      }
    };

    return new Promise<McpResponse>((resolve) => {
      this.requestCallbacks.set(id, resolve);
      this.serverProcess!.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  /**
   * Get a list of all available RSS feeds
   */
  public async listFeeds(): Promise<McpResponse> {
    return this.sendRequest('list-feeds');
  }

  /**
   * Get content from a specific RSS feed
   * @param url The URL of the feed to retrieve
   */
  public async getFeed(url: string): Promise<McpResponse> {
    return this.sendRequest('get-feed', { url });
  }

  /**
   * Search for content across all RSS feeds
   * @param query The search query
   */
  public async searchFeeds(query: string): Promise<McpResponse> {
    return this.sendRequest('search-feeds', { query });
  }

  /**
   * Add a new RSS feed to monitor
   * @param url The URL of the feed to add
   * @param name Optional name for the feed
   */
  public async addFeed(url: string, name?: string): Promise<McpResponse> {
    return this.sendRequest('add-feed', { url, name });
  }

  /**
   * Remove an RSS feed from monitoring
   * @param url The URL of the feed to remove
   */
  public async removeFeed(url: string): Promise<McpResponse> {
    return this.sendRequest('remove-feed', { url });
  }

  /**
   * Helper method to extract text content from an MCP response
   * @param response The MCP response
   * @returns Array of text content strings
   */
  public static extractTextContent(response: McpResponse): string[] {
    if (!response.result || !response.result.content) {
      return [];
    }
    
    return response.result.content
      .filter((content: McpResponseContent) => content.type === 'text' && content.text)
      .map((content: McpResponseContent) => content.text as string);
  }
}

// For backward compatibility with the original script
if (require.main === module) {
  const client = new McpClient();
  
  client.on('log', console.log);
  client.on('error', console.error);
  
  (async (): Promise<void> => {
    try {
      await client.start();
      console.log('Sending list-feeds request to MCP server...');
      
      const response = await client.listFeeds();
      console.log('\n--- MCP Server Response ---');
      
      McpClient.extractTextContent(response).forEach(text => {
        console.log(text);
      });
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setTimeout(() => {
        client.stop();
        process.exit(0);
      }, 500);
    }
  })();
}