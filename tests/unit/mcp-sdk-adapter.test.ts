/**
 * Unit tests for MCP SDK adapter
 */
import { EventEmitter } from 'events';
import { server as mcpSdk } from '../../src/adapters/mcpSdkAdapter';

describe('MCP SDK Adapter', () => {
  describe('McpServer', () => {
    let server: any;
    
    beforeEach(() => {
      // Create a test server
      server = new mcpSdk.McpServer({
        name: 'test-server',
        version: '1.0.0',
        capabilities: {
          resources: {},
          tools: {}
        }
      });
      
      // Spy on console.error to avoid polluting test output
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });
    
    it('should initialize with the correct name and version', () => {
      expect(server.name).toBe('test-server');
      expect(server.version).toBe('1.0.0');
    });
    
    it('should register a tool correctly', () => {
      const description = 'Test tool';
      const params = { foo: { type: 'string' } };
      const handler = jest.fn();
      
      server.tool('test-tool', description, params, handler);
      
      expect(server.tools['test-tool']).toBeDefined();
      expect(server.tools['test-tool'].description).toBe(description);
      expect(server.tools['test-tool'].params).toBe(params);
      expect(server.tools['test-tool'].handler).toBe(handler);
      expect(server.capabilities.tools['test-tool']).toBeDefined();
    });
    
    it('should register a resource correctly', () => {
      const description = 'Test resource';
      const handler = jest.fn();
      
      server.resource('test-resource', description, handler);
      
      expect(server.resources['test-resource']).toBeDefined();
      expect(server.resources['test-resource'].description).toBe(description);
      expect(server.resources['test-resource'].handler).toBe(handler);
      expect(server.capabilities.resources['test-resource']).toBeDefined();
    });
  });
  
  describe('StdioServerTransport', () => {
    let transport: any;
    let mockStdin: any;
    let mockStdout: any;
    
    beforeEach(() => {
      // Create mock stdin/stdout
      mockStdin = new EventEmitter();
      mockStdin.on = jest.fn().mockImplementation((event, callback) => {
        EventEmitter.prototype.on.call(mockStdin, event, callback);
        return mockStdin;
      });
      mockStdin.setEncoding = jest.fn();
      mockStdin.resume = jest.fn();
      
      mockStdout = {
        write: jest.fn()
      };
      
      // Mock process.stdin and process.stdout
      jest.spyOn(process, 'stdin', 'get').mockReturnValue(mockStdin);
      jest.spyOn(process, 'stdout', 'get').mockReturnValue(mockStdout);
      
      // Spy on console.error but don't mock its implementation
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create transport
      transport = new mcpSdk.StdioServerTransport();
    });
    
    afterEach(() => {
      // Restore all mocks
      jest.restoreAllMocks();
    });
    
    it('should initialize correctly and set up stdin handlers', () => {
      expect(mockStdin.on).toHaveBeenCalledWith('data', expect.any(Function));
      expect(mockStdin.setEncoding).toHaveBeenCalledWith('utf8');
      expect(mockStdin.resume).toHaveBeenCalled();
    });
    
    it('should emit request events when receiving JSON messages', () => {
      const requestHandler = jest.fn();
      transport.on('request', requestHandler);
      
      // Simulate receiving a message
      const message = { type: 'test', data: 'value' };
      mockStdin.emit('data', Buffer.from(JSON.stringify(message) + '\n'));
      
      expect(requestHandler).toHaveBeenCalledWith(message);
    });
    
    it('should handle malformed JSON input and emit initialize request', () => {
      const requestHandler = jest.fn();
      transport.on('request', requestHandler);
      
      // Simulate receiving malformed JSON
      mockStdin.emit('data', Buffer.from('malformed json\n'));
      
      // Should emit a default initialize request if this is the first message
      expect(requestHandler).toHaveBeenCalledWith({ type: 'initialize' });
    });
    
    it('should write JSON messages to stdout', () => {
      const message = { type: 'response', data: 'value' };
      transport.send(message);
      
      expect(mockStdout.write).toHaveBeenCalledWith(JSON.stringify(message) + '\n');
    });
    
    it('should handle errors when sending messages', () => {
      // Create a custom error we can detect
      const writeError = new Error('Write error');
      
      // Mock the write method to throw our error
      mockStdout.write.mockImplementation(() => {
        throw writeError;
      });
      
      // Expect this not to throw
      expect(() => {
        transport.send({ type: 'response', data: 'value' });
      }).not.toThrow();
    });
  });
});