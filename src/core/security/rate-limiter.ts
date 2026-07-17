import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { env } from '../../config/env';
import { redisService } from '../../services/redis.service';
import { logger } from '../logger/logger';

export const rateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-ignore
    sendCommand: (...args: string[]) => redisService.getClient().call(args[0], ...args.slice(1)),
  }),
  handler: (req, res, _next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on URL: ${req.originalUrl}`);
    res.status(options.statusCode).json({
      success: false,
      message: 'Too many requests, please try again later.',
      errors: [{ message: 'Rate limit exceeded' }],
    });
  },
});

// A stricter rate limiter for sensitive endpoints (Auth, Login, Password resets)
export const strictRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit to 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-ignore
    sendCommand: (...args: string[]) =>
      redisService.getClient().call(args[0], ...args.slice(1)),
  }),
  handler: (req, res, _next, options) => {
    logger.warn(
      `Strict rate limit exceeded for IP: ${req.ip} on auth URL: ${req.originalUrl}`,
    );
    res.status(options.statusCode).json({
      success: false,
      message: "Too many login attempts. Please try again after 5 minutes.",
      errors: [{ message: "Brute-force protection triggered" }],
    });
  },
});
