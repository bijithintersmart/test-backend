import { Response } from 'express';

interface ResponseData<T> {
  res: Response;
  statusCode?: number;
  message?: string;
  data?: T;
  meta?: Record<string, any>;
}

function stripSensitiveFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(stripSensitiveFields);
  }

  if (typeof obj === 'object') {
    const proto = Object.getPrototypeOf(obj);
    if (proto === Object.prototype || proto === null) {
      const cleaned: Record<string, any> = {};
      for (const key of Object.keys(obj)) {
        if (['createdAt', 'updatedAt', 'deletedAt', 'lastLogin', 'meta', 'timestamp'].includes(key)) {
          continue;
        }
        cleaned[key] = stripSensitiveFields(obj[key]);
      }
      return cleaned;
    }
  }

  return obj;
}

export const sendSuccess = <T>({
  res,
  statusCode = 200,
  message = 'Success',
  data = {} as T,
}: ResponseData<T>) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data: stripSensitiveFields(data),
  });
};
