import { z } from 'zod';
import { UserStatus } from '@prisma/client';

export const listUsersSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    status: z.nativeEnum(UserStatus).optional(),
    emailVerified: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  }),
};

export const getUserSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};

export const updateUserSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
  body: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    phone: z.string().min(5).max(20).optional(),
    avatar: z.string().url().optional(),
    status: z.nativeEnum(UserStatus).optional(),
  }).strict(),
};

export const deleteUserSchema = {
  params: z.object({
    id: z.string().uuid(),
  }),
};
