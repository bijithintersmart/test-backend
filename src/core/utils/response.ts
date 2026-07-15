import { Response } from 'express';

interface ResponseData<T> {
  res: Response;
  statusCode?: number;
  message?: string;
  data?: T;
  meta?: Record<string, any>;
}

export const sendSuccess = <T>({
  res,
  statusCode = 200,
  message = 'Success',
  data = {} as T,
  meta = {},
}: ResponseData<T>) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
    timestamp: new Date().toISOString(),
  });
};
