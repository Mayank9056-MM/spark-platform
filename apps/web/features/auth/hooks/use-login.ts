'use client';

import { useMutation } from '@tanstack/react-query';

import { login } from '../api/login';

import { accessTokenStore } from '@/lib/auth/access-token-store';

/**
 * Signs the user in and keeps the access token in memory for subsequent API
 * calls. Navigation and error presentation stay with the caller.
 *
 * Mutations never retry (see makeQueryClient), which is essential here: a
 * retried login would count as an extra failed attempt toward account lockout.
 */
export function useLogin() {
  return useMutation({
    mutationFn: login,
    onSuccess: ({ accessToken }) => {
      accessTokenStore.set(accessToken);
    },
  });
}
