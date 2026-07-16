import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/custom-errors';
import { logger } from '../logger/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.warn({
      msg: `AppError [${err.constructor.name}]: ${err.message}`,
      method: req.method,
      url: req.originalUrl,
      status: err.statusCode,
      errors: err.errors,
    });

    const serialized = err.serializeErrors();
    return res.status(err.statusCode).json({
      success: false,
      message: serialized.message,
      errors: serialized.fields || [],
    });
  }

  // Handle database / Prisma / external errors specifically if needed
  logger.error({
    msg: `Unhandled Error: ${err.message}`,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
  });

  return res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    errors: [{ message: 'An unexpected error occurred on the server' }],
  });
};
