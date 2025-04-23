/**
 * Type definitions for MCP (Model Context Protocol)
 */

// Server configuration
export interface MCPServerConfig {
  name: string;
  version: string;
}

// MCP Server capabilities
export interface MCPCapabilities {
  tools: Record<string, MCPToolDefinition>;
  resources: Record<string, MCPResourceDefinition>;
}

export interface MCPToolDefinition {
  description: string;
  params: any;
}

export interface MCPResourceDefinition {
  description: string;
}

// MCP Request and Response types
export interface MCPRequest {
  type: string;
  [key: string]: any;
}

export interface MCPResponse {
  type: string;
  [key: string]: any;
}

export interface MCPInitializeRequest extends MCPRequest {
  type: 'initialize';
}

export interface MCPInitializeResponse extends MCPResponse {
  type: 'initialize_result';
  server: {
    name: string;
    version: string;
  };
}

export interface MCPCapabilitiesRequest extends MCPRequest {
  type: 'capabilities';
}

export interface MCPCapabilitiesResponse extends MCPResponse {
  type: 'capabilities_result';
  capabilities: MCPCapabilities;
}

export interface MCPToolRequest extends MCPRequest {
  type: 'tool';
  name: string;
  params: any;
}

export interface MCPToolResponse extends MCPResponse {
  type: 'tool_result';
  result: any;
}

export interface MCPErrorResponse extends MCPResponse {
  type: 'error';
  error: {
    message: string;
  };
}

// JSON-RPC specific types
export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id?: number | string;
  method: string;
  params?: any;
}

export interface JSONRPCResponse {
  jsonrpc: '2.0';
  id?: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

// Handler types
export type ToolHandler = (params: any) => Promise<any>;
export type ResourceHandler = (params: any) => Promise<any>;