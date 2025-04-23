/**
 * Type definitions for Model Context Protocol requests and responses
 */

export interface McpRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params: {
    name: string;
    params: Record<string, unknown>;
  };
}

export interface McpResponseContent {
  type: string;
  text?: string;
  [key: string]: unknown;
}

export interface McpResponse {
  jsonrpc: string;
  id: number;
  result?: {
    content: McpResponseContent[];
    [key: string]: unknown;
  };
  error?: {
    code: number;
    message: string;
    [key: string]: unknown;
  };
}