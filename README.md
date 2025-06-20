# OpenGathyr

<img src="logo.svg" alt="OpenGathyr Logo" align="right" width="200" />

An open-source Model Context Protocol (MCP) server powered by RSS feeds.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## What is OpenGathyr?

OpenGathyr transforms how you manage content feeds by providing a centralized hub that collects, processes, and distributes RSS/Atom feeds. Unlike traditional aggregators, OpenGathyr functions as a complete Model Context Protocol (MCP) server for your feed ecosystem.

### Key Features

- **MCP Tools Integration**: Expose RSS feed functionality through standardized Model Context Protocol tools
- **Automated Feed Refreshing**: Configurable periodic fetching of RSS feeds to ensure fresh content
- **Content Search**: Search across all RSS feeds with a unified query interface
- **Feed Management**: Add, remove, and list RSS feeds dynamically
- **Environment Configuration**: Easy setup using environment variables for feed sources and settings
- **Docker Ready**: Containerized deployment support for both local and production environments
- **Modular Architecture**: Cleanly separated components for easier maintenance and extensibility

## Getting Started

### Prerequisites

- Node.js 22.x or higher
- npm 7.x or higher
- Docker (optional, for containerized deployment)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/opengathyr.git
cd opengathyr
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file with your configuration (see Configuration section)

4. Build the project:

```bash
npm run build
```

5. Start the server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

### Docker Deployment

To run the server in a Docker container:

```bash
# Build the Docker image
docker build -t opengathyr .

# Run the container
docker run -it opengathyr
```

## Configuration

The server can be configured using environment variables:

- `MCP_SERVER_NAME`: Name of the MCP server
- `MCP_SERVER_VERSION`: Version of the MCP server
- `RSS_FEED_URL_1`, `RSS_FEED_URL_2`, etc.: Individual RSS feed URLs (one URL per variable)
- `RSS_REFRESH_INTERVAL`: Refresh interval in milliseconds (default: 300000 = 5 minutes)
- `RSS_MAX_ITEMS`: Maximum number of items to keep per feed (default: 20)

### Example .env file

```
MCP_SERVER_NAME=opengathyr
MCP_SERVER_VERSION=1.0.0

# RSS Feed URLs - one per line
RSS_FEED_URL_1=https://news.google.com/rss
RSS_FEED_URL_2=https://example.com/feed.xml
RSS_FEED_URL_3=https://another-site.org/rss

RSS_REFRESH_INTERVAL=300000
RSS_MAX_ITEMS=20
```

## Available MCP Tools

### get-feed

Retrieves the content from a specific feed.

**Parameters:**

- `feedName`: Name of the feed to retrieve

### search-feeds

Searches across all configured feeds for matching content.

**Parameters:**

- `query`: Search term to look for in feed titles and content

### list-feeds

Lists all currently configured feeds and their details.

**Parameters:** None

### add-feed

Adds a new RSS feed to be monitored.

**Parameters:**

- `name`: Identifier for the feed
- `url`: URL of the RSS feed
- `refreshInterval` (optional): Refresh interval in milliseconds
- `maxItems` (optional): Maximum number of items to keep

### remove-feed

Removes an RSS feed from monitoring.

**Parameters:**

- `feedName`: Name of the feed to remove

## Using with VS Code

### GitHub Copilot Integration

To use OpenGathyr with GitHub Copilot in VS Code, you need to configure it as an MCP server in your Copilot settings.

#### Setup Steps

1. **Build the MCP Server:**

   ```bash
   npm run build
   ```

2. **Configure Copilot MCP Settings:**

   Create or edit your Copilot configuration file. The location depends on your VS Code setup:

   - **Windows:** `%APPDATA%\Code\User\globalStorage\github.copilot-chat\mcpServers.json`
   - **macOS:** `~/Library/Application Support/Code/User/globalStorage/github.copilot-chat/mcpServers.json`
   - **Linux:** `~/.config/Code/User/globalStorage/github.copilot-chat/mcpServers.json`

   Add your OpenGathyr server configuration:

   ```json
   {
     "mcpServers": {
       "opengathyr": {
         "command": "node",
         "args": ["dist/index.js"],
         "cwd": "a:\\OpenGathyr",
         "env": {
           "MCP_SERVER_NAME": "opengathyr",
           "MCP_SERVER_VERSION": "1.0.0",
           "RSS_FEED_URL_1": "https://news.google.com/rss",
           "RSS_FEED_URL_2": "https://feeds.bbci.co.uk/news/rss.xml",
           "RSS_REFRESH_INTERVAL": "300000",
           "RSS_MAX_ITEMS": "20"
         }
       }
     }
   }
   ```

3. **Restart VS Code** to apply the configuration changes.

4. **Verify Connection:**

   Open GitHub Copilot Chat and try using the RSS feed tools:

   ```text
   @opengathyr list-feeds
   @opengathyr get-feed news
   @opengathyr search-feeds "technology"
   ```

#### Available Commands in Copilot Chat

Once configured, you can use these commands in GitHub Copilot Chat:

- **`@opengathyr list-feeds`** - Lists all configured RSS feeds
- **`@opengathyr get-feed <feedName>`** - Gets content from a specific feed
- **`@opengathyr search-feeds <query>`** - Searches across all feeds
- **`@opengathyr add-feed <name> <url>`** - Adds a new RSS feed
- **`@opengathyr remove-feed <feedName>`** - Removes a feed

#### Example Usage

```text
User: @opengathyr search-feeds "artificial intelligence"
Copilot: I'll search for AI-related content across your RSS feeds...

User: @opengathyr get-feed tech-news
Copilot: Here's the latest content from the tech-news feed...
```

### Alternative: Direct MCP Client Usage

OpenGathyr includes a simple MCP client (`src/client/mcp-client.ts`) that can be used to interact with the MCP server for testing purposes.

### Running the Client

Ensure the MCP server is not already running on the same port, then execute the client with:

```bash
npm run client
```

### How It Works

The client:

1. Spawns a new instance of the MCP server as a child process
2. Sends a request to the `list-feeds` tool
3. Displays the formatted response
4. Automatically terminates the server after receiving the response

### Modifying the Client

You can easily modify the client to test other MCP tools:

```javascript
// Change the request to use a different tool
const request = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tool',
  params: {
    name: 'get-feed',  // Change to any of the available tools
    params: {
      feedName: 'example-feed'  // Add required parameters for the tool
    }
  }
};
```

Available tools you can test:

- `list-feeds`: Lists all configured feeds (no parameters needed)
- `get-feed`: Gets content from a specific feed (requires `feedName` parameter)
- `search-feeds`: Searches across feeds (requires `query` parameter)
- `add-feed`: Adds a new feed (requires `name` and `url` parameters)
- `remove-feed`: Removes a feed (requires `feedName` parameter)

Example for searching feeds:

```javascript
const request = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tool',
  params: {
    name: 'search-feeds',
    params: {
      query: 'technology'
    }
  }
};
```

## Use Cases

- **AI Assistants**: Integrate with LLM assistants via the Model Context Protocol to provide current news and information
- **Content Aggregation**: Centralize multiple RSS feeds into a single accessible interface
- **News Monitoring**: Track specific topics across multiple sources using the search functionality
- **Headless CMS Integration**: Feed dynamic content into websites and applications
- **Research Tools**: Collect and analyze content from multiple sources with a standardized API

## Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
