import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';

import { rateLimiter } from './core/security/rate-limiter';
import { logger } from './core/logger/logger';
import { errorHandler } from './core/middleware/error.middleware';
import { NotFoundError } from './core/errors/custom-errors';
import { setupSwagger } from './config/swagger';
import routesV1 from './routes';

const app = express();

// 1. Security Headers & CORS
app.use(helmet());
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

// 5. Request logging (Pino HTTP logger)
app.use(
  pinoHttp({
    logger,
    customSuccessMessage: (req, res) => `${req.method} ${req.url} completed with status ${res.statusCode}`,
    customErrorMessage: (req, _res, err) => `${req.method} ${req.url} failed: ${err.message}`,
  })
);



// 7. Mount Interactive Swagger API Documentation
setupSwagger(app);

// 8. Serve static uploads (for local storage uploads fallback)
app.use('/uploads', express.static('uploads'));

// 9. API Routing
app.use('/api/v1', routesV1);

// 10. Catch 404
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new NotFoundError('API Route Not Found'));
});

// 11. Centralized Error Handler
app.use(errorHandler);

export default app;
