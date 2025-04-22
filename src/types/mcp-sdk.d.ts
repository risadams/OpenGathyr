declare module '@modelcontextprotocol/sdk' {
  export namespace server {
    export class McpServer {
      constructor(options: {
        name: string;
        version: string;
        capabilities: {
          resources: Record<string, any>;
          tools: Record<string, any>;
        }
      });

      tool(
        name: string,
        description: string,
        params: Record<string, any>,
        handler: (params: any) => Promise<any>
      ): void;

      connect(transport: any): Promise<void>;
    }

    export class StdioServerTransport {
      constructor();
    }
  }
}