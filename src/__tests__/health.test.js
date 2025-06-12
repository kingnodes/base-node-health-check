const request = require('supertest');
const express = require('express');
const Web3 = require('web3');

// Mock Web3
jest.mock('web3');

describe('Health Check Endpoint', () => {
  let app;
  let mockWeb3;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Web3 instance
    mockWeb3 = {
      eth: {
        getBlockNumber: jest.fn(),
        isSyncing: jest.fn(),
        getBlock: jest.fn(),
        net: {
          getPeerCount: jest.fn()
        }
      }
    };

    // Mock Web3 constructor
    Web3.mockImplementation(() => mockWeb3);

    // Create Express app
    app = express();
    require('../index')(app);
  });

  it('should return 200 when all checks pass', async () => {
    // Mock successful responses
    mockWeb3.eth.getBlockNumber.mockResolvedValue(12345);
    mockWeb3.eth.isSyncing.mockResolvedValue(false);
    mockWeb3.eth.net.getPeerCount.mockResolvedValue(15);
    mockWeb3.eth.getBlock.mockResolvedValue({
      timestamp: Math.floor(Date.now() / 1000)
    });

    const response = await request(app).get('/healthz');
    
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      checks: {
        rpc: 'ok',
        sync: 'ok',
        peers: 15,
        freshness: expect.any(String)
      }
    });
  });

  it('should return 500 when node is syncing', async () => {
    // Mock responses with syncing state
    mockWeb3.eth.getBlockNumber.mockResolvedValue(12345);
    mockWeb3.eth.isSyncing.mockResolvedValue(true);
    mockWeb3.eth.net.getPeerCount.mockResolvedValue(15);
    mockWeb3.eth.getBlock.mockResolvedValue({
      timestamp: Math.floor(Date.now() / 1000)
    });

    const response = await request(app).get('/healthz');
    
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      status: 'fail',
      failed: ['sync'],
      details: {
        sync: 'Node is still syncing'
      }
    });
  });
}); 