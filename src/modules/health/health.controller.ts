import { Request, Response } from 'express';
import { db } from '../../database/db';
import { redisService } from '../../services/redis.service';
import { logger } from '../../core/logger/logger';
import { sendSuccess } from '../../core/utils/response';

export class HealthController {
  // Liveness check - verifies the server process is running
  async getLive(_req: Request, res: Response) {
    return sendSuccess({
      res,
      message: 'Liveness check successful',
      data: { status: 'UP' },
    });
  }

  // Readiness check - verifies external services (DB, Redis) are ready to receive requests
  async getReady(_req: Request, res: Response) {
    const checks: Record<string, 'UP' | 'DOWN'> = {
      server: 'UP',
      database: 'DOWN',
      redis: 'DOWN',
    };

    try {
      // Test DB
      await db.$queryRaw`SELECT 1`;
      checks.database = 'UP';
    } catch (err) {
      logger.error(err as Error, 'Readiness probe failed on database check');
    }

    try {
      // Test Redis
      const redisClient = redisService.getClient();
      const ping = await redisClient.ping();
      if (ping === 'PONG') {
        checks.redis = 'UP';
      }
    } catch (err) {
      logger.error(err as Error, 'Readiness probe failed on Redis check');
    }

    const isReady = Object.values(checks).every((status) => status === 'UP');

    return sendSuccess({
      res,
      statusCode: isReady ? 200 : 503,
      message: isReady ? 'Readiness check successful' : 'Readiness check failed',
      data: {
        status: isReady ? 'UP' : 'DOWN',
        checks,
      },
    });
  }

  // Standard health report
  async getHealth(_req: Request, res: Response) {
    const memoryUsage = process.memoryUsage();
    return sendSuccess({
      res,
      message: 'Health stats retrieved successfully',
      data: {
        status: 'UP',
        uptime: process.uptime(),
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        },
      },
    });
  }
}

export const healthController = new HealthController();
