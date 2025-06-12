# Base Node Health Check Service

A lightweight health check service for Optimism Base nodes that performs various checks to ensure the node is operating correctly. This service is designed to be used with HAProxy for load balancing multiple Base nodes.

[![CI](https://github.com/yourusername/base-node-health-check/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/base-node-health-check/actions/workflows/ci.yml)
[![Docker Pulls](https://img.shields.io/docker/pulls/yourusername/base-health-check.svg)](https://hub.docker.com/r/yourusername/base-health-check)

## Features

- RPC responsiveness check
- Node sync status verification
- Peer count monitoring
- Block freshness validation
- Configurable thresholds and timeouts
- Detailed health check responses
- Graceful shutdown handling

## Quick Start

### Using Docker

```bash
docker run -p 8080:8080 \
  -e RPC_URL=http://your-base-node:9545 \
  -e PEER_THRESHOLD=10 \
  yourusername/base-health-check
```

### Using Docker Compose

```yaml
version: '3.8'
services:
  health-check:
    image: yourusername/base-health-check
    environment:
      - RPC_URL=http://base-node:9545
      - PEER_THRESHOLD=10
    ports:
      - "8080:8080"
```

## Configuration

The service can be configured using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| RPC_URL | Base node JSON-RPC endpoint | http://localhost:9545 |
| PEER_THRESHOLD | Minimum required peer count | 10 |
| MAX_FRESHNESS_SEC | Maximum allowed block age in seconds | 15 |
| TIMEOUT_MS | RPC request timeout in milliseconds | 5000 |
| PORT | HTTP server port | 8080 |
| LOG_LEVEL | Logging level (debug, info, warn, error) | info |

## API Endpoints

### GET /healthz

Returns the health status of the Base node.

#### Query Parameters

- `verbose=true`: Include detailed timing information

#### Response Examples

Success (200 OK):
```json
{
  "status": "ok",
  "checks": {
    "rpc": "ok",
    "sync": "ok",
    "peers": 12,
    "freshness": "5s"
  }
}
```

Failure (500 Internal Server Error):
```json
{
  "status": "fail",
  "failed": ["freshness"],
  "details": {
    "freshness": "node time drift 25s"
  }
}
```

## Development

### Prerequisites

- Node.js >= 18
- npm >= 8

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/base-node-health-check.git
   cd base-node-health-check
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Testing

```bash
# Run tests
npm test

# Run linting
npm run lint
```

### Building Docker Image

```bash
npm run docker:build
```

## HAProxy Integration

Add the following to your HAProxy configuration:

```haproxy
backend base_nodes
    option httpchk GET /healthz
    http-check expect status 200
    server base1 base-node1:8080 check
    server base2 base-node2:8080 check
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Optimism](https://www.optimism.io/) for the Base network
- [Express.js](https://expressjs.com/) for the web framework
- [Web3.js](https://web3js.org/) for Ethereum interaction

## Logging

The service uses Winston for logging. All health check results and errors are logged at the INFO level. Logs are output to stdout in JSON format for easy parsing.

## Graceful Shutdown

The service handles SIGTERM signals gracefully, ensuring proper cleanup before shutdown. This is important for HAProxy to detect node removal correctly. 