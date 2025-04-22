# OpenGathyr

<img src="logo.svg" alt="OpenGathyr Logo" align="right" width="200" />

An open-source Model Context Protocol (MCP) server powered by RSS feeds.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## What is OpenGathyr?

OpenGathyr transforms how you manage content feeds by providing a centralized hub that collects, processes, and distributes RSS/Atom feeds. Unlike traditional aggregators, OpenGathyr functions as a complete Model Context Protocol (MCP) server for your feed ecosystem.

### Key Features

- **Centralized Feed Management**: Aggregate RSS/Atom feeds from multiple sources into a unified endpoint
- **Customizable Processing Pipelines**: Apply filters, transformations, and enrichments to feed content
- **Multi-Channel Distribution**: Deliver processed content to various destinations via APIs, webhooks, or custom integrations
- **Rule-Based Automation**: Define conditional workflows to automate feed processing
- **Plugin Support**: Extend functionality with a modular plugin architecture
- **Developer-Friendly APIs**: Leverage REST and GraphQL APIs for seamless integration
- **Live Content Streaming**: Enable real-time updates with WebSocket support

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 5+
- Redis (optional, for caching)

### Installation

```bash
# Clone the repository
git clone https://github.com/risadams/opengathyr.git
cd opengathyr

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Build the typescript project
npm run build

# Start development server
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
- `RSS_FEED_URLS`: Comma-separated list of RSS feed URLs to monitor
- `RSS_REFRESH_INTERVAL`: Refresh interval in milliseconds (default: 300000 = 5 minutes)
- `RSS_MAX_ITEMS`: Maximum number of items to keep per feed (default: 20)

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

- `src/index.ts`: Main entry point, sets up the MCP server and registers tools
- `src/services/rss-service.ts`: Core service for RSS feed fetching and management
- `src/config/config.ts`: Configuration management
- `src/types/`: TypeScript type definitions

## Documentation

Full documentation is available at [docs.opengathyr.io](https://docs.opengathyr.io)

- [API Reference](https://docs.opengathyr.io/api)
- [Configuration Guide](https://docs.opengathyr.io/config)
- [Plugin Development](https://docs.opengathyr.io/plugins)

## Use Cases

- **Content Curation**: Build automated content curation systems that gather and filter content from thousands of sources
- **Data Pipeline**: Use as a flexible data ingestion layer for analytics systems
- **Publishing Workflows**: Automate content publishing across multiple platforms
- **News Aggregation**: Create personalized news services with smart filtering

## Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Community

- [Discord](https://discord.gg/opengathyr)
- [Twitter](https://twitter.com/opengathyr)
- [Community Forum](https://community.opengathyr.io)
