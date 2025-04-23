/**
 * Simple MCP client to interact with the OpenGathyr MCP RSS Feed Server
 */

import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';
import { McpRequest, McpResponse, McpResponseContent } from '../types/mcp-client';

// Create a child process for the MCP server - using process.cwd() for reliable path resolution
const serverProcess: ChildProcessWithoutNullStreams = spawn('node', [
  path.join(process.cwd(), 'dist/index.js')
]);

// Log server output for debugging
serverProcess.stderr.on('data', (data: Buffer) => {
  console.log(`[Server Log] ${data.toString()}`);
});

// Listen for the server to start
setTimeout(() => {
  console.log('Sending list-feeds request to MCP server...');
  
  // Send JSON-RPC request to execute list-feeds tool
  const request: McpRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tool',
    params: {
      name: 'list-feeds',
      params: {}
    }
  };
  
  serverProcess.stdin.write(JSON.stringify(request) + '\n');
  
  // Handle the response
  serverProcess.stdout.on('data', (data: Buffer) => {
    console.log('\n--- MCP Server Response ---');
    try {
      const response: McpResponse = JSON.parse(data.toString().trim());
      
      if (response.result && response.result.content) {
        // Extract and format the content
        response.result.content.forEach((content: McpResponseContent) => {
          if (content.type === 'text' && content.text) {
            console.log(content.text);
          }
        });
      } else {
        console.log(JSON.stringify(response, null, 2));
      }
    } catch (err) {
      console.log('Raw response:', data.toString());
    }
    
    // Terminate the server after getting response
    setTimeout(() => {
      serverProcess.kill();
      process.exit(0);
    }, 500);
  });
}, 2000);