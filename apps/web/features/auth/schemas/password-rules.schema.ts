import { z } from 'zod';

/**
 * Client-side mirror of `passwordSchema` in
 * apps/api/src/modules/auth/auth.validation.ts. Shared by account
 * activation and password-reset confirmation — both create a new
 * password under the same server-side rule. Keep in sync; the server
 * is the authority.
 */
export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a digit');
