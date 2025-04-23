/**
 * Type definitions for Model Context Protocol requests and responses
 */

export interface McpRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params: {
    name: string;
    params: Record<string, any>;
  };
}

export interface McpResponseContent {
  type: string;
  text?: string;
  [key: string]: any;
}

export interface McpResponse {
  jsonrpc: string;
  id: number;
  result?: {
    content: McpResponseContent[];
    [key: string]: any;
  };
  error?: {
    code: number;
    message: string;
    [key: string]: any;
  };
}