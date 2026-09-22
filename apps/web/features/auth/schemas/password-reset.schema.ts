import { z } from 'zod';

import { passwordSchema } from './password-rules.schema';

/** Mirrors `requestPasswordResetBodySchema` on the API. */
export const passwordResetRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address')
    .pipe(z.email('Enter a valid email address')),
});

export type PasswordResetRequestValues = z.infer<typeof passwordResetRequestSchema>;

/** POST /auth/password-reset/request answers `{ success: true, data: null }`. */
export const passwordResetRequestResponseSchema = z.null();

/** Form-only shape. `confirmPassword` never goes to the API. */
export const passwordResetConfirmFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    error: 'Passwords do not match',
  });

export type PasswordResetConfirmFormValues = z.infer<typeof passwordResetConfirmFormSchema>;

/** Mirrors `confirmPasswordResetBodySchema` on the API. */
export interface ConfirmPasswordResetInput {
  token: string;
  password: string;
}

/** POST /auth/password-reset/confirm answers `{ success: true, data: null }`. */
export const passwordResetConfirmResponseSchema = z.null();
