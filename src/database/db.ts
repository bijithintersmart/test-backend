import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { logger } from '../core/logger/logger';
import { uuidv7 } from '../core/utils/uuid';

const isDev = env.NODE_ENV === 'development';

export const db = new PrismaClient({
  log: isDev ? ['query', 'info', 'warn', 'error'] : ['error'],
});

const modelsWithoutId = new Set(['UserRole', 'RolePermission']);

// Middleware to auto-generate UUID v7 for model IDs
db.$use(async (params, next) => {
  if (params.model && !modelsWithoutId.has(params.model)) {
    if (params.action === 'create' && params.args && params.args.data) {
      if (!params.args.data.id) {
        params.args.data.id = uuidv7();
      }
    } else if (params.action === 'createMany' && params.args && Array.isArray(params.args.data)) {
      for (const item of params.args.data) {
        if (item && !item.id) {
          item.id = uuidv7();
        }
      }
    }
  }
  return next(params);
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
