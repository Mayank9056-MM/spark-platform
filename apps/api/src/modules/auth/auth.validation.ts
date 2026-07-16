import { z } from 'zod';

/**
 * Shared password policy — used by both activation and password-reset,
 * so the rule lives in exactly one place.
 */
const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a digit');

export const loginBodySchema = z.object({
  // TODO: this is a deliberate interim simplification. Once an
  // `organization` module exists with real tenant resolution (subdomain
  // or slug lookup), replace organizationId with something a human can
  // actually type — a raw UUID in a login form is not the final UX.
  organizationId: z.uuid(),
  email: z.email().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});
export type LoginBody = z.infer<typeof loginBodySchema>;

export const activateAccountBodySchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
export type ActivateAccountBody = z.infer<typeof activateAccountBodySchema>;

export const requestPasswordResetBodySchema = z.object({
  organizationId: z.uuid(),
  email: z.email().toLowerCase(),
});
export type RequestPasswordResetBody = z.infer<typeof requestPasswordResetBodySchema>;

export const confirmPasswordResetBodySchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
export type ConfirmPasswordResetBody = z.infer<typeof confirmPasswordResetBodySchema>;

export const revokeSessionParamsSchema = z.object({
  sessionId: z.uuid(),
});
export type RevokeSessionParams = z.infer<typeof revokeSessionParamsSchema>;

export const logoutAllDevicesBodySchema = z.object({
  keepCurrentSession: z.boolean().default(false),
});
export type LogoutAllDevicesBody = z.infer<typeof logoutAllDevicesBodySchema>;
