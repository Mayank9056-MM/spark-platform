import { currentUserSchema } from '../schemas/session.schema';

import { apiRequest } from '@/lib/api/http-client';

/**
 * GET /api/v1/auth/me
 *
 * The frontend's authenticated-session bootstrap call. `authenticated`
 * stays at its default (true): a 401 TOKEN_EXPIRED here still gets one
 * refresh-and-replay, same as any other protected call.
 */
export function getCurrentUser() {
  return apiRequest('/auth/me', currentUserSchema);
}
