import { Router } from 'express';
import { userController } from './user.controller';
import { authenticate, isAdmin } from '../../core/middleware/auth.middleware';
import { validateRequest } from '../../core/middleware/validation.middleware';
import { paginationMiddleware } from '../../core/middleware/pagination.middleware';
import {
  getUserSchema,
  updateUserSchema,
  deleteUserSchema,
  listUsersSchema,
} from './user.validator';

const router = Router();

// Retrieve own profile
router.get('/me', authenticate, userController.getMe);

// Retrieve profile by ID (Admin or owner check inside controller)
router.get(
  '/:id',
  authenticate,
  validateRequest(getUserSchema),
  userController.getById
);

// Update profile (Admin or owner check inside controller)
router.put(
  '/:id',
  authenticate,
  validateRequest(updateUserSchema),
  userController.update
);

// List users (Admin only)
router.get(
  '/',
  authenticate,
  isAdmin,
  paginationMiddleware('createdAt', 10),
  validateRequest(listUsersSchema),
  userController.list
);

// Soft delete user (Admin only)
router.delete(
  '/:id',
  authenticate,
  isAdmin,
  validateRequest(deleteUserSchema),
  userController.delete
);

export default router;
