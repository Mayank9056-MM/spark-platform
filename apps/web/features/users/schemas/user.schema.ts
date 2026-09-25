import { z } from 'zod';

export const USER_STATUSES = [
  'PENDING_ACTIVATION',
  'ACTIVE',
  'SUSPENDED',
  'LOCKED',
  'DEACTIVATED',
  'ARCHIVED',
] as const;

export type UserStatus = (typeof USER_STATUSES)[number];

export const userStatusSchema = z.enum(USER_STATUSES);

export const userProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  middleName: z.string().nullable().optional(),
  lastName: z.string(),
  fullName: z.string(),
  status: userStatusSchema,
  avatarUrl: z.string().nullable().optional(),
  lastLoginAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const createUserFormSchema = z.object({
  email: z.string().trim().email('Valid institutional email is required'),
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  middleName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
});

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;

export const updateUserFormSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  middleName: z.string().trim().max(100).nullable().optional(),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  avatarUrl: z.string().url('Must be a valid URL').nullable().optional().or(z.literal('')),
});

export type UpdateUserFormValues = z.infer<typeof updateUserFormSchema>;

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
  sortBy?: 'createdAt' | 'firstName' | 'lastName' | 'email';
  sortOrder?: 'asc' | 'desc';
}
