import { UserStatus } from '@spark/database/client';
import { z } from 'zod';

import { USER_CONSTANTS } from './user.constants.js';

export const createUserBodySchema = z.object({
  email: z.email().toLowerCase(),
  firstName: z.string().trim().min(1).max(100),
  middleName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100),
});
export type CreateUserBody = z.infer<typeof createUserBodySchema>;

export const updateUserBodySchema = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    middleName: z.string().trim().min(1).max(100).nullable().optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    avatarUrl: z.url().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;

export const userIdParamsSchema = z.object({
  id: z.uuid(),
});
export type UserIdParams = z.infer<typeof userIdParamsSchema>;

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(USER_CONSTANTS.MAX_PAGE_SIZE)
    .default(USER_CONSTANTS.DEFAULT_PAGE_SIZE),
  search: z.string().trim().min(1).max(200).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  sortBy: z.enum(['createdAt', 'firstName', 'lastName', 'email']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
