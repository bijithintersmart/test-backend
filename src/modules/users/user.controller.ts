import { Request, Response, NextFunction } from 'express';
import { userService } from './user.service';
import { sendSuccess } from '../../core/utils/response';
import { ForbiddenError } from '../../core/errors/custom-errors';

export class UserController {
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.getUserById(req.user!.id);
      return sendSuccess({
        res,
        message: 'Current profile retrieved successfully',
        data: userService.sanitizeUser(user),
      });
    } catch (error) {
      return next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Allow users to see their own profile, or admins to see any profile
      if (req.user!.id !== id && !req.user!.roles.includes('ADMIN')) {
        throw new ForbiddenError('You are not authorized to view this profile');
      }

      const user = await userService.getUserById(id);
      return sendSuccess({
        res,
        message: 'User profile retrieved successfully',
        data: userService.sanitizeUser(user),
      });
    } catch (error) {
      return next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Allow users to update their own profile, or admins to update any profile
      if (req.user!.id !== id && !req.user!.roles.includes('ADMIN')) {
        throw new ForbiddenError('You are not authorized to update this profile');
      }

      const user = await userService.updateUser(id, req.body);
      return sendSuccess({
        res,
        message: 'Profile updated successfully',
        data: userService.sanitizeUser(user),
      });
    } catch (error) {
      return next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { users, total } = await userService.listUsers(req.pagination!);
      const pagination = req.pagination!;

      return sendSuccess({
        res,
        message: 'Users list retrieved successfully',
        data: users,
        meta: {
          total,
          page: pagination.page,
          limit: pagination.limit,
          totalPages: Math.ceil(total / pagination.limit),
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await userService.deleteUser(id);
      return sendSuccess({
        res,
        message: 'User deleted successfully',
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const userController = new UserController();
