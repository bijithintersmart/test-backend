// Mock external dependencies before importing the app
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      on: () => {},
      ping: async () => 'PONG',
      get: async () => null,
      set: async () => 'OK',
      del: async () => 1,
      quit: async () => 'OK',
      call: async (command: string, ..._args: any[]) => {
        const cmd = command ? command.toLowerCase() : '';
        if (cmd === 'script') {
          return 'mock-sha1-hash-value-for-rate-limiting';
        }
        if (cmd === 'evalsha' || cmd === 'eval') {
          return [1, 900000];
        }
        return 'OK';
      },
    };
  });
});

jest.mock('../../src/core/logger/logger', () => {
  const mockLog: any = {
    info: () => {},
    warn: () => {},
    error: (...args: any[]) => {
      console.error('LOGGER ERROR:', ...args);
    },
    fatal: (...args: any[]) => {
      console.error('LOGGER FATAL:', ...args);
    },
    child: () => mockLog,
    levels: {
      values: {
        trace: 10,
        debug: 20,
        info: 30,
        warn: 40,
        error: 50,
        fatal: 60,
      },
    },
  };
  return {
    logger: mockLog,
  };
});

jest.mock('../../src/database/db', () => {
  return {
    db: {
      $queryRaw: async () => [{ '1': 1 }],
      user: {
        findUnique: async () => null,
        findFirst: async () => null,
      },
    },
    connectDb: async () => true,
  };
});

import request from 'supertest';
import app from '../../src/app';

describe('Health Check API Integration Tests', () => {
  describe('GET /api/v1/health', () => {
    it('should return 200 OK and general system memory stats', async () => {
      const res = await request(app).get('/api/v1/health');
      if (res.statusCode !== 200) console.log('FAIL GET /health body:', JSON.stringify(res.body, null, 2));
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toEqual('UP');
      expect(res.body.data.memory).toBeDefined();
    });
  });

  describe('GET /api/v1/health/live', () => {
    it('should return 200 OK for process liveness check', async () => {
      const res = await request(app).get('/api/v1/health/live');
      if (res.statusCode !== 200) console.log('FAIL GET /health/live body:', JSON.stringify(res.body, null, 2));
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toEqual('UP');
    });
  });

  describe('GET /api/v1/health/ready', () => {
    it('should return 200 OK for readiness check when DB and Redis are UP', async () => {
      const res = await request(app).get('/api/v1/health/ready');
      if (res.statusCode !== 200) console.log('FAIL GET /health/ready body:', JSON.stringify(res.body, null, 2));
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toEqual('UP');
      expect(res.body.data.checks.database).toEqual('UP');
      expect(res.body.data.checks.redis).toEqual('UP');
    });
  });
});
