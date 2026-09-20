import { z } from 'zod';

/**
 * Client-side mirror of `loginBodySchema` (apps/api/src/modules/auth/auth.validation.ts).
 *
 * The password rules are deliberately limited to "not empty". Complexity rules
 * belong to account activation and password reset; enforcing them at login
 * would lock out existing users whose passwords predate a policy change and
 * would needlessly reveal the policy to anyone probing the form.
 *
 * The server remains the authority: it also normalises the email address.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address')
    .pipe(z.email('Enter a valid email address')),
  password: z.string().min(1, 'Enter your password'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
