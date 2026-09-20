import { type LoginFormValues } from '../schemas/login.schema';
import { loginResponseSchema } from '../schemas/session.schema';

import { apiRequest } from '@/lib/api/http-client';

/**
 * POST /api/v1/auth/login
 *
 * Sends no Authorization header: a stale token from a previous session must
 * never accompany a fresh credential check.
 */
export function login(credentials: LoginFormValues) {
  return apiRequest('/auth/login', loginResponseSchema, {
    method: 'POST',
    body: credentials,
    authenticated: false,
  });
}
