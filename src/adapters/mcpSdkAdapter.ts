/**
 * mcpSdkAdapter.ts - A TypeScript adapter for the MCP SDK
 * 
 * This adapter provides a strongly-typed implementation for the MCP server
 * with proper handling of both MCP protocol and JSON-RPC protocol.
 */

import { EventEmitter } from 'events';
import { 
  MCPRequest, MCPResponse, MCPInitializeResponse, MCPCapabilitiesResponse, 
  MCPErrorResponse, MCPCapabilities, JSONRPCResponse,
  ToolHandler, ResourceHandler, MCPToolDefinition
} from '../types/mcp';

// Check if we're in a test environment
const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

interface McpServerOptions {
  name: string;
  version: string;
  capabilities?: MCPCapabilities;
}

interface Tool {
  name: string;
  description: string;
  params: Record<string, unknown>;
  handler: ToolHandler;
}

interface Resource {
  name: string;
  description: string;
  handler: ResourceHandler;
}

// Simple implementation of an MCP Server
class McpServer {
  private options: McpServerOptions;
  private transport: StdioServerTransport | null = null;
  public name: string;
  public version: string;
  public tools: Record<string, Tool> = {};
  public resources: Record<string, Resource> = {};
  public capabilities: MCPCapabilities;

  constructor(options: McpServerOptions) {
    this.options = options;
    this.name = options.name;
    this.version = options.version;
    this.capabilities = options.capabilities || { resources: {}, tools: {} };

    // Only log if not in test environment
    if (!isTestEnvironment) {
      console.error(`MCP Server "${this.name}" v${this.version} initialized`);
    }
  }

  tool(name: string, description: string, params: Record<string, unknown>, handler: ToolHandler): McpServer {
    if (!isTestEnvironment) {
      console.error(`Registering tool: ${name}`);
    }
    this.tools[name] = {
      name,
      description,
      params,
      handler
    };

    // Update capabilities
    this.capabilities.tools[name] = {
      description,
      params
    };

    return this;
  }

  resource(name: string, description: string, handler: ResourceHandler): McpServer {
    if (!isTestEnvironment) {
      console.error(`Registering resource: ${name}`);
    }
    this.resources[name] = {
      name,
      description,
      handler
    };

    // Update capabilities
    this.capabilities.resources[name] = {
      description
    };

    return this;
  }

  async connect(transport: StdioServerTransport): Promise<void> {
    if (!isTestEnvironment) {
      console.error('Connecting MCP server to transport');
    }
    this.transport = transport;
    
    // Set the server reference in transport to access capabilities
    transport.server = this;

    // Set up message handling
    transport.on('request', async (request: MCPRequest) => {
      if (!request) {
        if (!isTestEnvironment) {
          console.error('Received empty request');
        }
        return;
      }
      
      if (!isTestEnvironment) {
        console.error(`Received request: ${request.type || 'undefined'}`);
      }

      try {
        // Check if request is valid
        if (typeof request !== 'object') {
          throw new Error('Invalid request: Request must be a valid JSON object');
        }

        let response: MCPResponse;

        // Handle initialize request from MCP client - this is the first message sent when connecting
        if (request.type === 'initialize' || !request.type) {
          // Per MCP spec, if we receive a message with no type, treat it as an initialize request
          if (!isTestEnvironment) {
            console.error('Handling initialize request');
          }
          
          // Check if this is a JSON-RPC request
          if (request.jsonrpc === '2.0') {
            response = {
              type: 'initialize_result',
              jsonrpc: request.jsonrpc,
              id: request.id,
              server: {
                name: this.name,
                version: this.version
              }
            } as MCPInitializeResponse;
          } else {
            response = {
              type: 'initialize_result',
              server: {
                name: this.name,
                version: this.version
              }
            } as MCPInitializeResponse;
          }
        } else if (request.type === 'capabilities') {
          // Add JSON-RPC properties if needed
          if (request.jsonrpc === '2.0') {
            response = {
              type: 'capabilities_result',
              jsonrpc: request.jsonrpc,
              id: request.id,
              capabilities: this.capabilities
            } as MCPCapabilitiesResponse;
          } else {
            response = {
              type: 'capabilities_result',
              capabilities: this.capabilities
            } as MCPCapabilitiesResponse;
          }
        } else if (request.type === 'tools/list') {
          // Handle tools/list request (returns a list of all available tools)
          if (!isTestEnvironment) {
            console.error('Handling tools/list request');
          }
          
          const toolsList = Object.entries(this.tools).map(([name, tool]) => {
            return {
              name,
              description: tool.description,
              parameters: tool.params
            };
          });
          
          // Add JSON-RPC properties if needed
          if (request.jsonrpc === '2.0') {
            response = {
              type: 'tools/list_result',
              jsonrpc: request.jsonrpc,
              id: request.id,
              result: toolsList
            };
          } else {
            response = {
              type: 'tools/list_result',
              result: toolsList
            };
          }
        } else if (request.type === 'tool') {
          if (typeof request.name !== 'string') {
            throw new Error('Tool name must be a string');
          }
          
          const tool = this.tools[request.name];
          if (!tool) {
            throw new Error(`Tool not found: ${request.name}`);
          }

          // Create a properly typed empty params object if none provided
          const params: Record<string, unknown> = request.params ? { ...request.params } : {};
          const result = await tool.handler(params);
          
          // Add JSON-RPC properties if needed
          if (request.jsonrpc === '2.0') {
            response = {
              type: 'tool_result',
              jsonrpc: request.jsonrpc,
              id: request.id,
              result
            };
          } else {
            response = {
              type: 'tool_result',
              result
            };
          }
        } else if (request.type === 'resource') {
          if (typeof request.name !== 'string') {
            throw new Error('Resource name must be a string');
          }
          
          const resource = this.resources[request.name];
          if (!resource) {
            throw new Error(`Resource not found: ${request.name}`);
          }

          // Create a properly typed empty params object if none provided
          const params: Record<string, unknown> = request.params ? { ...request.params } : {};
          const result = await resource.handler(params);
          
          // Add JSON-RPC properties if needed
          if (request.jsonrpc === '2.0') {
            response = {
              type: 'resource_result',
              jsonrpc: request.jsonrpc,
              id: request.id,
              result
            };
          } else {
            response = {
              type: 'resource_result',
              result
            };
          }
        } else {
          throw new Error(`Unknown request type: ${request.type}`);
        }

        // Send response back to client
        if (!isTestEnvironment) {
          console.error(`Sending response: ${response.type}`);
          // Debug the response content
          console.error(`Response content: ${JSON.stringify(response)}`);
        }
        transport.send(response);
      } catch (error) {
        if (!isTestEnvironment) {
          console.error('Error handling request:', error);
        }
        
        const errorResponse: MCPErrorResponse = {
          type: 'error',
          error: {
            message: (error as Error).message
          }
        };
        
        if (request.jsonrpc === '2.0') {
          errorResponse.jsonrpc = request.jsonrpc;
          errorResponse.id = request.id;
        }
        
        transport.send(errorResponse);
      }
    });

    // Send server info
    await transport.ready();
    if (!isTestEnvironment) {
      console.error('Transport ready, server connected');
    }
  }
}

// Simple implementation of a stdio transport
class StdioServerTransport extends EventEmitter {
  private stdin: NodeJS.ReadStream;
  private stdout: NodeJS.WriteStream;
  private buffer: string;
  private initializedEmitted: boolean;
  private isJsonRpc: boolean;
  public server: McpServer | null;

  constructor() {
    super();
    this.stdin = process.stdin;
    this.stdout = process.stdout;
    this.buffer = '';
    this.initializedEmitted = false;
    this.isJsonRpc = false; // Flag to track if we're communicating via JSON-RPC
    this.server = null; // Reference to the server instance

    // Set up initial encoding for proper data handling
    this.stdin.setEncoding('utf8');

    // Handle incoming data chunks
    this.stdin.on('data', (data: Buffer) => {
      try {
        const chunk = data.toString();
        this.buffer += chunk;
        
        // Try to extract complete JSON messages
        let messageEndIndex: number;
        while ((messageEndIndex = this.buffer.indexOf('\n')) !== -1) {
          const messageLine = this.buffer.substring(0, messageEndIndex).trim();
          this.buffer = this.buffer.substring(messageEndIndex + 1);
          
          if (messageLine) {
            // Debug incoming message
            if (!isTestEnvironment) {
              console.error(`Received message: ${messageLine.substring(0, 100)}${messageLine.length > 100 ? '...' : ''}`);
            }
            
            try {
              const message = JSON.parse(messageLine);
              
              // Check if this is a JSON-RPC message
              if (message.jsonrpc === '2.0') {
                this.isJsonRpc = true;
                if (!isTestEnvironment) {
                  console.error('Detected JSON-RPC protocol');
                }
                
                // Check if this is a notification (no response needed)
                if (message.method && message.method.startsWith('notifications/')) {
                  if (!isTestEnvironment) {
                    console.error(`Received notification: ${message.method}, no response needed`);
                  }
                  // For notifications, we don't emit a request since no response is needed
                  return;
                }
                
                // Convert JSON-RPC to MCP format for internal processing
                let mcpMessage: MCPRequest;
                
                if (message.method === 'initialize') {
                  mcpMessage = { 
                    type: 'initialize',
                    jsonrpc: message.jsonrpc,
                    id: message.id,
                    params: message.params 
                  };
                  this.initializedEmitted = true;
                } else if (message.method === 'capabilities') {
                  mcpMessage = { 
                    type: 'capabilities',
                    jsonrpc: message.jsonrpc,
                    id: message.id,
                    params: message.params
                  };
                } else if (message.method === 'tools/list') {
                  mcpMessage = { 
                    type: 'tools/list',
                    jsonrpc: message.jsonrpc,
                    id: message.id,
                    params: message.params 
                  };
                } else if (message.method === 'tool') {
                  mcpMessage = { 
                    type: 'tool',
                    jsonrpc: message.jsonrpc,
                    id: message.id,
                    name: message.params ? message.params.name : undefined,
                    params: message.params ? message.params.params : {}
                  };
                } else if (message.method === 'resource') {
                  mcpMessage = { 
                    type: 'resource',
                    jsonrpc: message.jsonrpc,
                    id: message.id,
                    name: message.params ? message.params.name : undefined,
                    params: message.params ? message.params.params : {} 
                  };
                } else {
                  mcpMessage = { 
                    type: message.method,
                    jsonrpc: message.jsonrpc,
                    id: message.id,
                    params: message.params 
                  };
                }
                
                this.emit('request', mcpMessage);
              } else {
                // Handle as native MCP message
                if (message.type === 'initialize' && !this.initializedEmitted) {
                  if (!isTestEnvironment) {
                    console.error('Received explicit initialize request');
                  }
                  this.initializedEmitted = true;
                }
                
                this.emit('request', message);
              }
            } catch (parseError) {
              if (!isTestEnvironment) {
                console.error('Error parsing message:', parseError);
              }
              
              // If this is potentially an initialize request (first message), emit a default initialize
              if (!this.initializedEmitted) {
                if (!isTestEnvironment) {
                  console.error('Emitting default initialize request due to parse error');
                }
                this.emit('request', { type: 'initialize' });
                this.initializedEmitted = true;
              } else {
                // Only log the first 100 chars to avoid flooding the console
                if (!isTestEnvironment) {
                  console.error('Problematic message:', messageLine.substring(0, 100) + (messageLine.length > 100 ? '...' : ''));
                }
              }
            }
          }
        }
      } catch (error) {
        if (!isTestEnvironment) {
          console.error('Error handling input:', error);
        }
      }
    });
    
    // Ensure stdin is in flowing mode
    this.stdin.resume();
  }

  send(message: MCPResponse): void {
    try {
      // Check if we need to convert from MCP format to JSON-RPC
      if (this.isJsonRpc && message.type) {
        const jsonrpcMessage: JSONRPCResponse = { jsonrpc: '2.0' };
        
        // Extract the request ID if it was passed in the original message
        if ('jsonrpc' in message && 'id' in message) {
          // Use string assertion to handle ID which could be string, number, or undefined
          jsonrpcMessage.id = message.id as string | number | undefined;
        }
        
        // Convert different MCP message types to JSON-RPC
        if (message.type === 'initialize_result') {
          jsonrpcMessage.result = {
            serverInfo: (message as MCPInitializeResponse).server,
            capabilities: {
              tools: Object.entries(this.server?.capabilities?.tools || {}).map(([name, tool]) => ({
                name,
                description: (tool as MCPToolDefinition).description,
                parameters: (tool as MCPToolDefinition).params
              })),
              resources: {}
            }
          };
        } else if (message.type === 'capabilities_result') {
          jsonrpcMessage.result = (message as MCPCapabilitiesResponse).capabilities;
        } else if (message.type === 'tools/list_result') {
          jsonrpcMessage.result = message.result;
        } else if (message.type === 'tool_result') {
          jsonrpcMessage.result = message.result;
        } else if (message.type === 'resource_result') {
          jsonrpcMessage.result = message.result;
        } else if (message.type === 'error') {
          jsonrpcMessage.error = {
            code: -32603, // Internal error
            message: (message as MCPErrorResponse).error?.message || 'Unknown error'
          };
        }
        
        if (!isTestEnvironment) {
          console.error(`Converting MCP message to JSON-RPC: ${JSON.stringify(jsonrpcMessage).substring(0, 100)}...`);
        }
        
        const messageString = JSON.stringify(jsonrpcMessage) + '\n';
        this.stdout.write(messageString);
      } else {
        // Send in native MCP format
        if (!isTestEnvironment) {
          console.error(`Sending outgoing MCP message: ${JSON.stringify(message).substring(0, 100)}...`);
        }
        const messageString = JSON.stringify(message) + '\n';
        this.stdout.write(messageString);
      }
    } catch (error) {
      if (!isTestEnvironment) {
        console.error('Error sending message:', error);
      }
    }
  }

  async ready(): Promise<boolean> {
    // When the transport is ready, emit an initialize request if none was received
    if (!this.initializedEmitted) {
      if (!isTestEnvironment) {
        console.error('No initialize request received yet, emitting default one');
      }
      setTimeout(() => {
        this.emit('request', { type: 'initialize' });
        this.initializedEmitted = true;
      }, 100);
    }
    
    // Signal that the transport is ready
    this.emit('ready');
    return true;
  }
}

export const server = {
  McpServer,
  StdioServerTransport,
  _isTestEnvironment: isTestEnvironment // Expose for testing
};