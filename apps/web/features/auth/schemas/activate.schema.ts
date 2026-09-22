import { z } from 'zod';

import { passwordSchema } from './password-rules.schema';

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
