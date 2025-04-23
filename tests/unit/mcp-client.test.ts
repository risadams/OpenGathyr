/**
 * Unit tests for MCP client
 */
import { EventEmitter } from 'events';
import { McpClient } from '../../src/client/mcp-client';
import { McpResponse } from '../../src/types/mcp-client';
import { ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';

// Mock the child_process module
jest.mock('child_process', () => ({
  spawn: jest.fn(() => mockChildProcess)
}));

// Create mock child process
const mockChildProcess: Partial<ChildProcessWithoutNullStreams> = {
  stdin: {
    write: jest.fn()
  } as any,
  stdout: new EventEmitter() as any,
  stderr: new EventEmitter() as any,
  kill: jest.fn()
};

// Increase MaxListeners to prevent memory leak warnings
(mockChildProcess.stdout as EventEmitter).setMaxListeners(20);
(mockChildProcess.stderr as EventEmitter).setMaxListeners(20);

describe('McpClient', () => {
  let client: McpClient;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a test client
    client = new McpClient('/mock/server/path');
    
    // Spy on console methods to avoid polluting test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    // Ensure client is stopped after each test
    client.stop();
    
    // Clear any event listeners to prevent memory leaks
    (mockChildProcess.stdout as EventEmitter).removeAllListeners();
    (mockChildProcess.stderr as EventEmitter).removeAllListeners();
  });

  describe('Initialization and lifecycle', () => {
    it('should initialize with the correct serverPath', () => {
      expect((client as any).serverPath).toBe('/mock/server/path');
      
      // Test default path when not provided
      const defaultClient = new McpClient();
      expect((defaultClient as any).serverPath).toMatch(/[\\/]dist[\\/]index\.js$/);
    });
    
    it('should start the server process', async () => {
      const startPromise = client.start();
      
      // Simulate server startup
      setTimeout(() => {
        (mockChildProcess.stdout as EventEmitter).emit('data', Buffer.from('{"jsonrpc":"2.0","id":0,"result":{"status":"ready"}}\n'));
      }, 100);
      
      await startPromise;
      
      expect((client as any).isServerReady).toBe(true);
      expect((client as any).serverProcess).not.toBeNull();
    });
    
    it('should stop the server process', async () => {
      await client.start();
      client.stop();
      
      expect(mockChildProcess.kill).toHaveBeenCalled();
      expect((client as any).serverProcess).toBeNull();
      expect((client as any).isServerReady).toBe(false);
    });
    
    it('should ignore multiple start calls', async () => {
      await client.start();
      const initialProcess = (client as any).serverProcess;
      
      await client.start();
      
      // Should be the same process instance
      expect((client as any).serverProcess).toBe(initialProcess);
    });
    
    it('should emit events correctly', async () => {
      const readyHandler = jest.fn();
      const logHandler = jest.fn();
      const errorHandler = jest.fn();
      const stoppedHandler = jest.fn();
      
      client.on('ready', readyHandler);
      client.on('log', logHandler);
      client.on('error', errorHandler);
      client.on('stopped', stoppedHandler);
      
      // Start client
      const startPromise = client.start();
      
      // Emit server log
      (mockChildProcess.stderr as EventEmitter).emit('data', Buffer.from('Server started'));
      
      // Let start complete
      await startPromise;
      
      // Stop client
      client.stop();
      
      expect(readyHandler).toHaveBeenCalled();
      expect(logHandler).toHaveBeenCalledWith('[Server Log] Server started');
      expect(stoppedHandler).toHaveBeenCalled();
    });
  });

  describe('Request handling', () => {
    it('should throw an error when server is not ready', async () => {
      await expect(client.sendRequest('test-tool')).rejects.toThrow('Server not ready');
    });
    
    it('should send a properly formatted JSON-RPC request', async () => {
      await client.start();
      
      const requestPromise = client.sendRequest('test-tool', { param1: 'value1' });
      
      // Simulate response
      const response = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: [{ type: 'text', text: 'Test response' }]
        }
      };
      
      (mockChildProcess.stdout as EventEmitter).emit('data', Buffer.from(JSON.stringify(response) + '\n'));
      
      const result = await requestPromise;
      
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"method":"tool"')
      );
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"name":"test-tool"')
      );
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"param1":"value1"')
      );
      expect(result).toEqual(response);
    });
    
    it('should handle multiple responses in a single data event', async () => {
      await client.start();
      
      const request1 = client.sendRequest('tool1');
      const request2 = client.sendRequest('tool2');
      
      // Simulate responses in a single data event
      const response1 = { jsonrpc: '2.0', id: 1, result: { content: [{ type: 'text', text: 'Response 1' }] } };
      const response2 = { jsonrpc: '2.0', id: 2, result: { content: [{ type: 'text', text: 'Response 2' }] } };
      
      (mockChildProcess.stdout as EventEmitter).emit(
        'data', 
        Buffer.from(JSON.stringify(response1) + '\n' + JSON.stringify(response2) + '\n')
      );
      
      const [result1, result2] = await Promise.all([request1, request2]);
      
      expect(result1).toEqual(response1);
      expect(result2).toEqual(response2);
    });
    
    it('should emit error when response parsing fails', async () => {
      const errorHandler = jest.fn();
      client.on('error', errorHandler);
      
      await client.start();
      
      // Simulate invalid JSON response
      (mockChildProcess.stdout as EventEmitter).emit('data', Buffer.from('Invalid JSON\n'));
      
      // Wait for any unhandled promise rejections to settle
      await new Promise(process.nextTick);
      
      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
      expect(errorHandler.mock.calls[0][0].message).toContain('Failed to parse server response');
    });
  });

  describe('MCP Tools', () => {
    beforeEach(async () => {
      await client.start();
    });
    
    it('should correctly call listFeeds', async () => {
      const requestPromise = client.listFeeds();
      
      // Simulate response
      const response = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: [{ type: 'text', text: 'Feed 1\nFeed 2' }]
        }
      };
      
      (mockChildProcess.stdout as EventEmitter).emit('data', Buffer.from(JSON.stringify(response) + '\n'));
      
      const result = await requestPromise;
      
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"name":"list-feeds"')
      );
      expect(result).toEqual(response);
    });
    
    it('should correctly call getFeed', async () => {
      const requestPromise = client.getFeed('https://example.com/feed.xml');
      
      // Simulate response
      const response = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: [{ type: 'text', text: 'Feed content' }]
        }
      };
      
      (mockChildProcess.stdout as EventEmitter).emit('data', Buffer.from(JSON.stringify(response) + '\n'));
      
      const result = await requestPromise;
      
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"name":"get-feed"')
      );
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"url":"https://example.com/feed.xml"')
      );
      expect(result).toEqual(response);
    });
    
    it('should correctly call searchFeeds', async () => {
      const requestPromise = client.searchFeeds('test query');
      
      // Simulate response
      const response = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: [{ type: 'text', text: 'Search results' }]
        }
      };
      
      (mockChildProcess.stdout as EventEmitter).emit('data', Buffer.from(JSON.stringify(response) + '\n'));
      
      const result = await requestPromise;
      
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"name":"search-feeds"')
      );
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"query":"test query"')
      );
      expect(result).toEqual(response);
    });
    
    it('should correctly call addFeed', async () => {
      const requestPromise = client.addFeed('https://example.com/feed.xml', 'Example Feed');
      
      // Simulate response
      const response = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: [{ type: 'text', text: 'Feed added' }]
        }
      };
      
      (mockChildProcess.stdout as EventEmitter).emit('data', Buffer.from(JSON.stringify(response) + '\n'));
      
      const result = await requestPromise;
      
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"name":"add-feed"')
      );
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"url":"https://example.com/feed.xml"')
      );
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"name":"Example Feed"')
      );
      expect(result).toEqual(response);
    });
    
    it('should correctly call removeFeed', async () => {
      const requestPromise = client.removeFeed('https://example.com/feed.xml');
      
      // Simulate response
      const response = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: [{ type: 'text', text: 'Feed removed' }]
        }
      };
      
      (mockChildProcess.stdout as EventEmitter).emit('data', Buffer.from(JSON.stringify(response) + '\n'));
      
      const result = await requestPromise;
      
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"name":"remove-feed"')
      );
      expect(mockChildProcess.stdin.write).toHaveBeenCalledWith(
        expect.stringContaining('"url":"https://example.com/feed.xml"')
      );
      expect(result).toEqual(response);
    });
  });

  describe('Utility functions', () => {
    it('should correctly extract text content from MCP response', () => {
      const response: McpResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: [
            { type: 'text', text: 'Line 1' },
            { type: 'image', url: 'image.jpg' },
            { type: 'text', text: 'Line 2' }
          ]
        }
      };
      
      const textContent = McpClient.extractTextContent(response);
      
      expect(textContent).toEqual(['Line 1', 'Line 2']);
    });
    
    it('should return empty array when no content is available', () => {
      // Response with no result
      const response1: McpResponse = {
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: 100,
          message: 'Error message'
        }
      };
      
      // Response with no content
      const response2: McpResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: {}
      };
      
      // Response with empty content array
      const response3: McpResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          content: []
        }
      };
      
      expect(McpClient.extractTextContent(response1)).toEqual([]);
      expect(McpClient.extractTextContent(response2)).toEqual([]);
      expect(McpClient.extractTextContent(response3)).toEqual([]);
    });
  });
});