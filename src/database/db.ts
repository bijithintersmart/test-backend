import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../core/logger/logger';

const isDev = env.NODE_ENV === 'development';

export const db = new PrismaClient({
  log: isDev ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Middleware to log slow queries
if (isDev) {
  db.$use(async (params, next) => {
    const before = Date.now();
    const result = await next(params);
    const after = Date.now();
    const duration = after - before;

    if (duration > 100) {
      logger.warn(`🐌 Slow query: ${params.model}.${params.action} took ${duration}ms`);
    }
    return result;
  });
}

export const connectDb = async () => {
  try {
    await db.$connect();
    logger.info('🐘 Database connected successfully via Prisma');
  } catch (error) {
    logger.error(error as Error, '❌ Failed to connect to the database');
    process.exit(1);
  }
};
