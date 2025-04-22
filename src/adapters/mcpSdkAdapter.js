/**
 * mcpSdkAdapter.js - A simplified adapter for the MCP SDK
 * 
 * This adapter provides just enough functionality to get the MCP server running
 * without dealing with the complex import issues in the original SDK package.
 */

const { EventEmitter } = require('events');

// Check if we're in a test environment
const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

// Simple implementation of an MCP Server
class McpServer {
  constructor(options) {
    this.options = options;
    this.name = options.name;
    this.version = options.version;
    this.tools = {};
    this.resources = {};
    this.capabilities = options.capabilities || { resources: {}, tools: {} };

    // Only log if not in test environment
    if (!isTestEnvironment) {
      console.error(`MCP Server "${this.name}" v${this.version} initialized`);
    }
  }

  tool(name, description, params, handler) {
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

  resource(name, description, handler) {
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

  async connect(transport) {
    if (!isTestEnvironment) {
      console.error('Connecting MCP server to transport');
    }
    this.transport = transport;

    // Set up message handling
    transport.on('request', async (request) => {
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

        let response;

        // Handle initialize request from MCP client - this is the first message sent when connecting
        if (request.type === 'initialize' || !request.type) {
          // Per MCP spec, if we receive a message with no type, treat it as an initialize request
          if (!isTestEnvironment) {
            console.error('Handling initialize request');
          }
          response = {
            type: 'initialize_result',
            server: {
              name: this.name,
              version: this.version
            }
          };
        } else if (request.type === 'capabilities') {
          response = {
            type: 'capabilities_result',
            capabilities: this.capabilities
          };
        } else if (request.type === 'tool') {
          const tool = this.tools[request.name];
          if (!tool) {
            throw new Error(`Tool not found: ${request.name}`);
          }

          const result = await tool.handler(request.params || {});
          response = {
            type: 'tool_result',
            result
          };
        } else if (request.type === 'resource') {
          const resource = this.resources[request.name];
          if (!resource) {
            throw new Error(`Resource not found: ${request.name}`);
          }

          const result = await resource.handler(request.params || {});
          response = {
            type: 'resource_result',
            result
          };
        } else {
          throw new Error(`Unknown request type: ${request.type}`);
        }

        // Send response back to client
        if (!isTestEnvironment) {
          console.error(`Sending response: ${response.type}`);
        }
        transport.send(response);
      } catch (error) {
        if (!isTestEnvironment) {
          console.error('Error handling request:', error);
        }
        transport.send({
          type: 'error',
          error: {
            message: error.message
          }
        });
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
  constructor() {
    super();
    this.stdin = process.stdin;
    this.stdout = process.stdout;
    this.buffer = '';

    // Set up input handling
    this.stdin.on('data', (data) => {
      try {
        const chunk = data.toString();
        this.buffer += chunk;
        
        // Try to extract complete JSON messages
        let messageEndIndex;
        while ((messageEndIndex = this.buffer.indexOf('\n')) !== -1) {
          const messageLine = this.buffer.substring(0, messageEndIndex).trim();
          this.buffer = this.buffer.substring(messageEndIndex + 1);
          
          if (messageLine) {
            try {
              // Special handling for the first message which might be empty or malformed
              if (messageLine === '{}' && !this.initializedEmitted) {
                this.emit('request', { type: 'initialize' });
                this.initializedEmitted = true;
                continue;
              }
              
              const message = JSON.parse(messageLine);
              this.emit('request', message);
            } catch (parseError) {
              if (!isTestEnvironment) {
                console.error('Error parsing message:', parseError.message);
              }
              // If this is potentially an initialize request (first message), emit a default initialize
              if (!this.initializedEmitted) {
                if (!isTestEnvironment) {
                  console.error('Emitting default initialize request');
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
  }

  send(message) {
    try {
      const messageString = JSON.stringify(message) + '\n';
      this.stdout.write(messageString);
    } catch (error) {
      if (!isTestEnvironment) {
        console.error('Error sending message:', error);
      }
    }
  }

  async ready() {
    // Signal that the transport is ready
    this.emit('ready');
    return true;
  }
}

module.exports = {
  server: {
    McpServer,
    StdioServerTransport,
    _isTestEnvironment: isTestEnvironment // Expose for testing
  }
};