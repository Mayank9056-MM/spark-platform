import {
  type ConfirmPasswordResetInput,
  passwordResetConfirmResponseSchema,
} from '../schemas/password-reset.schema';

import { apiRequest } from '@/lib/api/http-client';

/** POST /api/v1/auth/password-reset/confirm. Public: no session exists yet. */
export function confirmPasswordReset(input: ConfirmPasswordResetInput) {
  return apiRequest('/auth/password-reset/confirm', passwordResetConfirmResponseSchema, {
    method: 'POST',
    body: input,
    authenticated: false,
  });
}
