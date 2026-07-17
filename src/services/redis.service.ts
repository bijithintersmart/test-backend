import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../core/logger/logger';

class RedisService {
  private client: Redis | null = null;

  connect(): Redis {
    if (this.client) return this.client;

    this.client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      logger.info('🔌 Redis connected successfully');
    });

    this.client.on('error', (err) => {
      logger.error(err, '❌ Redis Connection Error');
    });

    return this.client;
  }

  getClient(): Redis {
    if (!this.client) {
      return this.connect();
    }
    return this.client;
  }

  async waitForReady(timeoutMs: number = 3000): Promise<void> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    const client = this.client;

    if (client.status === 'ready') {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Redis connection timeout'));
      }, timeoutMs);

      const onReady = () => {
        cleanup();
        resolve();
      };

      const onError = (_err: Error) => {
        // We let the timeout handle rejection to allow potential connection retries
      };

      const cleanup = () => {
        clearTimeout(timeout);
        client.removeListener('ready', onReady);
        client.removeListener('error', onError);
      };

      client.on('ready', onReady);
      client.on('error', onError);
    });
  }

  async get(key: string): Promise<string | null> {
    return this.client?.get(key) || null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return;
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client?.del(key);
  }

  async quit(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      logger.info('🔌 Redis connection closed gracefully');
    }
  }
}

export const redisService = new RedisService();
