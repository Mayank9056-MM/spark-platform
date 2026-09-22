import { z } from 'zod';

import { apiRequest } from '@/lib/api/http-client';

const logoutResponseSchema = z.null();

/** POST /api/v1/auth/logout. Requires an existing session (requireAuth). */
export function logout() {
  return apiRequest('/auth/logout', logoutResponseSchema, { method: 'POST' });
}
