<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# OpenGathyr MCP RSS Feed Server

This is a Model Context Protocol (MCP) server project that communicates with various RSS feeds. The server follows a modular architecture and is built with TypeScript and Node.js.

## Project Architecture

- `src/index.ts`: Main entry point that sets up the MCP server and registers tools
- `src/services/rss-service.ts`: Core service for RSS feed fetching and management
- `src/config/config.ts`: Configuration management
- `src/types/`: TypeScript type definitions

## MCP Server Tools

The server exposes the following tools via the Model Context Protocol:

1. `get-feed`: Retrieve content from a specific feed
2. `search-feeds`: Search for content across all RSS feeds
3. `list-feeds`: List all available RSS feeds
4. `add-feed`: Add a new RSS feed to monitor
5. `remove-feed`: Remove an RSS feed from monitoring

## Development Guidelines

- Use modern TypeScript features with strict typing
- Follow a modular architecture to maintain scalability
- Implement proper error handling for RSS feed operations
- Ensure all MCP tools are properly documented
- Maintain compatibility with the Model Context Protocol specification
- The primary development environment is on Windows, using Powershell commands

You can find more info and examples about MCP at https://modelcontextprotocol.io/llms-full.txt