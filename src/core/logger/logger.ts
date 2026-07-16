import pino from 'pino';
import { env } from '../../config/env';
import path from 'path';

const isProduction = env.NODE_ENV === 'production';
const isTest = env.NODE_ENV === 'test';

// Define the transport targets
const targets: pino.TransportTargetOptions[] = [];

// 1. File transport for errors (only enabled in dev and production, disabled in test)
if (!isTest) {
  targets.push({
    target: 'pino/file',
    level: 'error',
    options: {
      destination: path.join(process.cwd(), 'logs', 'error.log'),
      mkdir: true,
    },
  });
}

// 2. Console/Stdout transport
if (isTest) {
  // Silent console during test runs
  targets.push({
    target: 'pino/file',
    level: 'silent',
    options: { destination: 1 },
  });
} else if (!isProduction) {
  // Pretty-print console during local development
  targets.push({
    target: 'pino-pretty',
    level: process.env.LOG_LEVEL || 'info',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
    },
  });
} else {
  // Standard JSON output for production cloud environments (stdout)
  targets.push({
    target: 'pino/file',
    level: process.env.LOG_LEVEL || 'info',
    options: { destination: 1 }, // stdout
  });
}

const transport = pino.transport({ targets });

export const logger = pino(
  {
    name: 'enterprise-backend',
    level: isTest ? 'silent' : (process.env.LOG_LEVEL || 'info'),
    formatters: {
      level: (label) => {
        return { level: label.toUpperCase() };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
  },
  transport
);

