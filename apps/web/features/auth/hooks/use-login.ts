import { useMutation } from '@tanstack/react-query';

import { login } from '../api/login';

import { sessionState } from '@/lib/auth/session-state';

export function useLogin() {
  return useMutation({
    mutationFn: login,
    onSuccess: () => {
      sessionState.markSignedIn();
    },
  });
}
