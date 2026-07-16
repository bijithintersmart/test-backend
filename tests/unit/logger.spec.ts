import fs from 'fs';
import path from 'path';
import pino from 'pino';

describe('Structured File Logger', () => {
  const logDir = path.join(process.cwd(), 'logs');
  const logFile = path.join(logDir, 'error.log');

  beforeEach(() => {
    // Clean up log file if it exists
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }
  });

  afterAll(() => {
    // Clean up log file if it exists
    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }
  });

  it('should write error logs with stack traces to logs/error.log', async () => {
    // Setup a custom test logger that mimics our file logger setup
    const testTargets = [
      {
        target: 'pino/file',
        level: 'error' as const,
        options: {
          destination: logFile,
          mkdir: true,
        },
      },
    ];

    const testTransport = pino.transport({ targets: testTargets });
    const testLogger = pino(
      {
        name: 'test-logger',
        level: 'error',
        formatters: {
          level: (label) => ({ level: label.toUpperCase() }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        serializers: {
          err: pino.stdSerializers.err,
          error: pino.stdSerializers.err,
        },
      },
      testTransport
    );

    const errorMessage = 'Simulated connection failure';
    const testError = new Error(errorMessage);

    // Write the error log
    testLogger.error({ err: testError }, 'Database connection error');

    // Wait slightly for pino's worker threads/streams to flush to disk
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Verify file exists
    expect(fs.existsSync(logFile)).toBe(true);

    // Read log contents
    const logContent = fs.readFileSync(logFile, 'utf8');
    const logObj = JSON.parse(logContent.trim().split('\n')[0]);

    expect(logObj.level).toBe('ERROR');
    expect(logObj.msg).toBe('Database connection error');
    expect(logObj.err).toBeDefined();
    expect(logObj.err.message).toBe(errorMessage);
    expect(logObj.err.stack).toContain('Error: Simulated connection failure');
  });
});
