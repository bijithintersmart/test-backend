import { Request, Response } from 'express';
import { db } from '../../database/db';
import { redisService } from '../../services/redis.service';
import { logger } from '../../core/logger/logger';
import { sendSuccess } from '../../core/utils/response';
import healthStatus from "./healthStatus";

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
        // Initialize checks from stored health status
    const checks: Record<string, { status: 'UP' | 'DOWN'; error?: string; downtime?: number }> = {
      server: { status: healthStatus.server.status },
      database: { status: healthStatus.database.status },
      redis: { status: healthStatus.redis.status },
    };

    // Helper to update status tracking
    const updateStatus = (name: keyof typeof healthStatus, isUp: boolean, err?: Error) => {
      const svc = healthStatus[name];
      if (isUp) {
        if (svc.status === 'DOWN') {
          // Transition to UP
          svc.status = 'UP';
          svc.lastChange = Date.now();
          svc.error = undefined;
        }
      } else {
        if (svc.status === 'UP') {
          // Transition to DOWN
          svc.status = 'DOWN';
          svc.lastChange = Date.now();
          svc.error = err?.message;
        } else {
          // Remain DOWN, update error if provided
          svc.error = err?.message;
        }
      }
    };

    // Check Database
    try {
      await db.$queryRaw`SELECT 1`;
      updateStatus("database", true);
    } catch (err) {
      logger.error(err as Error, "Readiness probe failed on database check");
      updateStatus("database", false, err as Error);
    }

    // Check Redis
    try {
      const redisClient = redisService.getClient();
      const ping = await redisClient.ping();
      if (ping === "PONG") {
        updateStatus("redis", true);
      } else {
        updateStatus("redis", false, new Error("Unexpected ping response"));
      }
    } catch (err) {
      logger.error(err as Error, "Readiness probe failed on Redis check");
      updateStatus("redis", false, err as Error);
    }

    // Refresh checks from updated healthStatus
    checks.server.status = healthStatus.server.status;
    checks.database.status = healthStatus.database.status;
    checks.redis.status = healthStatus.redis.status;

    // Attach error messages and downtime (in seconds) for DOWN services
    const now = Date.now();
    for (const [key, value] of Object.entries(checks)) {
      const svc = healthStatus[key as keyof typeof healthStatus];
      if (svc.status === 'DOWN') {
        value.error = svc.error;
        value.downtime = Math.round((now - svc.lastChange) / 1000);
      }
    }

    const isReady = Object.values(checks).every((c) => c.status === "UP");

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
