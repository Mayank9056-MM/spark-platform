import { z } from 'zod';

/**
 * Client-side mirror of `passwordSchema` in
 * apps/api/src/modules/auth/auth.validation.ts. Keep the two in sync; the
 * server is the authority.
 */
const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a digit');

/** Form-only shape. `confirmPassword` never goes to the API. */
export const activateFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    error: 'Passwords do not match',
  });

export type ActivateFormValues = z.infer<typeof activateFormSchema>;

/** Mirrors `activateAccountBodySchema` on the API. */
export interface ActivateAccountInput {
  token: string;
  password: string;
}

/** POST /auth/activate answers `{ success: true, message, data: null }`. */
export const activateAccountResponseSchema = z.null();
