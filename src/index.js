require('dotenv').config();
const express = require('express');
const Web3 = require('web3');
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Configuration with defaults
const config = {
  rpcUrl: process.env.RPC_URL || 'http://localhost:9545',
  peerThreshold: parseInt(process.env.PEER_THRESHOLD || '10'),
  maxFreshnessSec: parseInt(process.env.MAX_FRESHNESS_SEC || '15'),
  timeoutMs: parseInt(process.env.TIMEOUT_MS || '5000'),
  port: parseInt(process.env.PORT || '8080')
};

// Initialize Web3
const web3 = new Web3(new Web3.providers.HttpProvider(config.rpcUrl, {
  timeout: config.timeoutMs
}));

// Health check functions
const healthChecks = {
  async rpc() {
    const blockNumber = await web3.eth.getBlockNumber();
    if (!blockNumber) throw new Error('Invalid block number');
    return { status: 'ok', value: blockNumber };
  },

  async sync() {
    const syncing = await web3.eth.isSyncing();
    if (syncing) {
      return { status: 'fail', error: 'Node is still syncing' };
    }
    return { status: 'ok' };
  },

  async peers() {
    const peerCount = await web3.eth.net.getPeerCount();
    if (peerCount < config.peerThreshold) {
      return {
        status: 'fail',
        error: `Peer count ${peerCount} below threshold ${config.peerThreshold}`
      };
    }
    return { status: 'ok', value: peerCount };
  },

  async freshness() {
    const latestBlock = await web3.eth.getBlock('latest');
    const blockTime = new Date(latestBlock.timestamp * 1000);
    const now = new Date();
    const timeDiff = Math.abs(now - blockTime) / 1000;
    
    if (timeDiff > config.maxFreshnessSec) {
      return {
        status: 'fail',
        error: `Node time drift ${Math.round(timeDiff)}s`
      };
    }
    return { status: 'ok', value: `${Math.round(timeDiff)}s` };
  }
};

// Create Express app
const app = express();

// Health check endpoint
app.get('/healthz', async (req, res) => {
  const verbose = req.query.verbose === 'true';
  const startTime = Date.now();
  const results = {};

  try {
    // Run all health checks
    for (const [name, check] of Object.entries(healthChecks)) {
      results[name] = await check();
    }

    // Determine overall status
    const failedChecks = Object.entries(results)
      .filter(([_, check]) => check.status === 'fail')
      .map(([name]) => name);

    const response = {
      status: failedChecks.length === 0 ? 'ok' : 'fail',
      checks: Object.fromEntries(
        Object.entries(results).map(([key, value]) => [
          key,
          value.status === 'ok' ? (value.value || 'ok') : value.error
        ])
      )
    };

    if (verbose) {
      response.timing = {
        total: `${Date.now() - startTime}ms`
      };
    }

    if (failedChecks.length > 0) {
      response.failed = failedChecks;
      response.details = Object.fromEntries(
        failedChecks.map(check => [check, results[check].error])
      );
      res.status(500).json(response);
    } else {
      res.status(200).json(response);
    }

    logger.info('Health check completed', {
      status: response.status,
      failedChecks,
      timing: Date.now() - startTime
    });

  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({
      status: 'fail',
      error: error.message
    });
  }
});

// Start server if not being required as a module
if (require.main === module) {
  const server = app.listen(config.port, () => {
    logger.info(`Health check service listening on port ${config.port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}

// Export for testing
module.exports = app; 