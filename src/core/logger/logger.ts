import pino from 'pino';
import { env } from '../../config/env';
import path from 'path';
import pretty from 'pino-pretty';

const isProduction = env.NODE_ENV === 'production';
const isTest = env.NODE_ENV === 'test';

const streams: pino.StreamEntry[] = [];

if (isTest) {
  streams.push({
    stream: pino.destination({ dest: 1, sync: true }),
  });
} else {
  // 1. File transport for errors (only enabled in dev and production, disabled in test)
  streams.push({
    level: 'error' as pino.Level,
    stream: pino.destination({
      dest: path.join(process.cwd(), 'logs', 'error.log'),
      mkdir: true,
      sync: true, // Write synchronously to ensure errors are written before process exits
    }),
  });

  // 2. Console/Stdout transport
  const consoleLevel = (process.env.LOG_LEVEL || 'info') as pino.Level;
  if (!isProduction) {
    // Pretty-print console during local development
    streams.push({
      level: consoleLevel,
      stream: pretty({
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
      }),
    });
  } else {
    // Standard JSON output for production cloud environments (stdout)
    streams.push({
      level: consoleLevel,
      stream: pino.destination({ dest: 1, sync: true }), // stdout
    });
  }
}

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
  pino.multistream(streams)
);
