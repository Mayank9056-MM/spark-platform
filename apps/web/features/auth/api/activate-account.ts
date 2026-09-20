import {
  type ActivateAccountInput,
  activateAccountResponseSchema,
} from '../schemas/activate.schema';

import { apiRequest } from '@/lib/api/http-client';

/**
 * POST /api/v1/auth/activate
 *
 * Public call: the user has no session yet, so nothing is refreshed or replayed.
 */
export function activateAccount(input: ActivateAccountInput) {
  return apiRequest('/auth/activate', activateAccountResponseSchema, {
    method: 'POST',
    body: input,
    authenticated: false,
  });
}
