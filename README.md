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

4. Start the server:

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

## Architecture

The project follows a modular architecture:

- `src/index.js`: Main entry point, sets up the MCP server and registers tools
- `src/services/rss-service.js`: Core service for RSS feed fetching and management
- `src/config/config.js`: Configuration management
- `src/adapters/mcpSdkAdapter.js`: Custom Model Context Protocol SDK adapter

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
