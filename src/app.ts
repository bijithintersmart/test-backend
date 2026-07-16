import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';

import { rateLimiter } from './core/security/rate-limiter';
import { logger } from './core/logger/logger';
import { errorHandler } from './core/middleware/error.middleware';
import { NotFoundError, MethodNotAllowedError } from './core/errors/custom-errors';
import { setupSwagger } from './config/swagger';
import { env } from './config/env';
import routesV1 from './routes';

const app = express();

// Helper to extract allowed HTTP methods for a path
function getAllowedMethods(router: any, path: string): string[] {
  const methods: string[] = [];

  function traverse(currentRouter: any, currentPath: string) {
    if (!currentRouter || !currentRouter.stack) return;

    for (const layer of currentRouter.stack) {
      if (layer.route) {
        if (layer.match(currentPath)) {
          const routeMethods = Object.keys(layer.route.methods)
            .filter((m) => layer.route.methods[m])
            .map((m) => m.toUpperCase());
          methods.push(...routeMethods);
        }
      } else if (layer.name === 'router' && layer.handle) {
        if (layer.match(currentPath)) {
          const match = layer.regexp.exec(currentPath);
          if (match) {
            const prefix = match[0];
            const relativePath = currentPath.slice(prefix.length) || '/';
            const formattedPath = relativePath.startsWith('/') ? relativePath : '/' + relativePath;
            traverse(layer.handle, formattedPath);
          }
        }
      }
    }
  }

  traverse(router, path);
  return Array.from(new Set(methods)).sort();
}

// 1. Security Headers & CORS
app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? undefined : false,
  })
);
app.use(
  cors({
    origin: '*', // Customize this for production constraints
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// 2. Performance & Compression
app.use(compression());

// 3. Rate Limiting (Applied globally)
app.use(rateLimiter);

// 4. Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

import pino from 'pino';

// Helper to parse User-Agent into a friendly device/client string
function parseUserAgent(userAgent: string | undefined): string {
  if (!userAgent) return 'Unknown Device';
  if (userAgent.includes('PostmanRuntime') || userAgent.includes('Postman')) {
    return 'Postman Client';
  }

  const isAndroid = userAgent.includes('Android');
  const isIos = userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iPod');
  const isMac = userAgent.includes('Macintosh') || userAgent.includes('Mac OS') || userAgent.includes('macOS');
  const isWindows = userAgent.includes('Windows');
  const isLinux = userAgent.includes('Linux');

  let os = 'Unknown OS';
  if (isAndroid) os = 'Android';
  else if (isIos) os = 'iOS';
  else if (isMac) os = 'macOS';
  else if (isWindows) os = 'Windows';
  else if (isLinux) os = 'Linux';

  let client = 'Unknown Browser';
  if (userAgent.includes('Chrome')) client = 'Chrome';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) client = 'Safari';
  else if (userAgent.includes('Firefox')) client = 'Firefox';
  else if (userAgent.includes('Edg')) client = 'Edge';
  else if (userAgent.includes('WebKit')) client = 'WebKit Client';

  return `${client} on ${os}`;
}

// Helper to clean IP address representation
function cleanIp(ip: string): string {
  if (ip === '::1' || ip === '::ffff:127.0.0.1' || ip === '127.0.0.1') {
    return '127.0.0.1 (Localhost)';
  }
  return ip;
}

// Helper to sanitize and format body parameters for logging, censoring passwords/tokens
function sanitizeLogBody(body: any): string {
  if (!body || typeof body !== 'object') return '';
  const sanitized = { ...body };
  const sensitiveKeys = ['password', 'token', 'secret', 'oldPassword', 'newPassword', 'idToken'];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '********';
    }
  }
  const str = JSON.stringify(sanitized);
  return str === '{}' ? '' : ` | Body: ${str}`;
}

// Helper to format query parameters for logging
function sanitizeLogQuery(query: any): string {
  if (!query || typeof query !== 'object') return '';
  const str = JSON.stringify(query);
  return str === '{}' ? '' : ` | Query: ${str}`;
}

// 5. Request logging (Pino HTTP logger)
app.use(
  pinoHttp({
    logger,
    serializers: {
      req: () => undefined,
      res: () => undefined,
      err: pino.stdSerializers.err,
    },
    customSuccessMessage: (req: any, res: any, responseTime: number) => {
      const ip = cleanIp((req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown-ip');
      const device = parseUserAgent(req.headers['user-agent']);
      const query = sanitizeLogQuery(req.query);
      const body = sanitizeLogBody(req.body);
      return `HTTP ${req.method} ${req.originalUrl} -> status ${res.statusCode} in ${responseTime}ms | IP: ${ip} | Device: ${device}${query}${body}`;
    },
    customErrorMessage: (req: any, _res: any, err: Error) => {
      const ip = cleanIp((req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown-ip');
      const device = parseUserAgent(req.headers['user-agent']);
      const query = sanitizeLogQuery(req.query);
      const body = sanitizeLogBody(req.body);
      return `HTTP ${req.method} ${req.originalUrl} -> failed: ${err.message} | IP: ${ip} | Device: ${device}${query}${body}`;
    },
  })
);



// 7. Mount Interactive Swagger API Documentation
setupSwagger(app);

// 8. Serve static uploads (for local storage uploads fallback)
app.use('/uploads', express.static('uploads'));

// 9. API Routing
app.use('/api/v1', routesV1);

// 10. Catch 404 / 405
app.use((req: Request, _res: Response, next: NextFunction) => {
  const allowed = getAllowedMethods((app as any)._router, req.path);
  if (allowed.length > 0) {
    return next(new MethodNotAllowedError(`Method ${req.method} not allowed for this route. Allowed methods: ${allowed.join(', ')}`));
  }
  next(new NotFoundError('API Route Not Found'));
});

// 11. Centralized Error Handler
app.use(errorHandler);

export default app;
