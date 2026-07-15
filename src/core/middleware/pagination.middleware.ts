import { Request, Response, NextFunction } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  sort: string;
  order: 'asc' | 'desc';
  search?: string;
  filters: Record<string, any>;
}

declare global {
  namespace Express {
    interface Request {
      pagination?: PaginationParams;
    }
  }
}

export const paginationMiddleware = (defaultSort = 'createdAt', defaultLimit = 10) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || String(defaultLimit), 10)));
    const skip = (page - 1) * limit;

    const sort = (req.query.sort as string) || defaultSort;
    const order = (req.query.order as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';
    const search = req.query.search as string || undefined;

    // Parse filters: all other query parameters except page, limit, sort, order, search
    const filters: Record<string, any> = {};
    Object.keys(req.query).forEach((key) => {
      if (!['page', 'limit', 'sort', 'order', 'search'].includes(key)) {
        // Handle simple arrays, boolean conversions, or string filters
        const val = req.query[key];
        if (val === 'true') filters[key] = true;
        else if (val === 'false') filters[key] = false;
        else filters[key] = val;
      }
    });

    req.pagination = {
      page,
      limit,
      skip,
      sort,
      order,
      search,
      filters,
    };

    next();
  };
};
