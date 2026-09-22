import {
  passwordResetRequestResponseSchema,
  type PasswordResetRequestValues,
} from '../schemas/password-reset.schema';

import { apiRequest } from '@/lib/api/http-client';

/** POST /api/v1/auth/password-reset/request. Public: no session exists yet. */
export function requestPasswordReset(input: PasswordResetRequestValues) {
  return apiRequest('/auth/password-reset/request', passwordResetRequestResponseSchema, {
    method: 'POST',
    body: input,
    authenticated: false,
  });
}
