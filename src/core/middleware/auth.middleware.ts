import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { db } from '../../database/db';
import { redisService } from '../../services/redis.service';
import { AuthenticationError, AuthorizationError } from '../errors/custom-errors';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  roles: string[];
  permissions: string[];
}

declare global {
  namespace Express {
    interface User extends AuthenticatedUser {}
    interface Request {
      user?: User;
    }
  }
}

// 1. Mandatory authentication middleware (Native, Redis-cached)
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AuthenticationError('No authentication token provided'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string; email: string };
    const userId = decoded.userId;

    // Check Redis cache for user roles and permissions first
    const cacheKey = `user:auth:${userId}`;
    const cachedUser = await redisService.get(cacheKey);

    if (cachedUser) {
      req.user = JSON.parse(cachedUser);
      return next();
    }

    // Cache miss - query PostgreSQL database
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      return next(new AuthenticationError('User not found or inactive status'));
    }

    // Extract clean array of roles and permissions
    const roles: string[] = user.userRoles.map((ur: any) => ur.role.name as string);
    const permissions: string[] = Array.from(
      new Set<string>(
        user.userRoles.flatMap((ur: any) =>
          ur.role.rolePermissions.map((rp: any) => rp.permission.name as string)
        )
      )
    );

    const authUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles,
      permissions,
    };

    // Store in Redis cache for 5 minutes (matching JWT window)
    await redisService.set(cacheKey, JSON.stringify(authUser), 300);

    req.user = authUser;
    return next();
  } catch (err: any) {
    return next(new AuthenticationError(err.message || 'Invalid or expired token'));
  }
};

// 2. Optional authentication middleware (populates req.user if token is valid, otherwise continues)
export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string; email: string };
    const userId = decoded.userId;

    const cacheKey = `user:auth:${userId}`;
    const cachedUser = await redisService.get(cacheKey);

    if (cachedUser) {
      req.user = JSON.parse(cachedUser);
      return next();
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (user && user.status === 'ACTIVE' && !user.deletedAt) {
      const roles: string[] = user.userRoles.map((ur: any) => ur.role.name as string);
      const permissions: string[] = Array.from(
        new Set<string>(
          user.userRoles.flatMap((ur: any) =>
            ur.role.rolePermissions.map((rp: any) => rp.permission.name as string)
          )
        )
      );

      const authUser: AuthenticatedUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
        permissions,
      };

      await redisService.set(cacheKey, JSON.stringify(authUser), 300);
      req.user = authUser;
    }
  } catch {
    // Ignore verification errors for optional authentication
  }
  return next();
};

// 3. Authorize roles (RBAC)
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('User is not authenticated'));
    }
    const hasRole = req.user.roles.some((role: string) => allowedRoles.includes(role.toUpperCase()));
    if (!hasRole) {
      return next(new AuthorizationError('Insufficient role privileges'));
    }
    next();
  };
};

// 4. Authorize specific permission
export const hasPermission = (permission: string) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('User is not authenticated'));
    }
    const hasPerm = req.user.permissions.includes(permission);
    if (!hasPerm) {
      return next(new AuthorizationError(`Required permission missing: ${permission}`));
    }
    next();
  };
};

// Role-specific shortcut guards
export const isAdmin = authorizeRoles('ADMIN');
export const isAmbassador = authorizeRoles('AMBASSADOR');
export const isChampion = authorizeRoles('CHAMPION');
