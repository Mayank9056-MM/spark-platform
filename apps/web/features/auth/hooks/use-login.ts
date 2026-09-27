import { useMutation, useQueryClient } from '@tanstack/react-query';

import { login } from '../api/login';

import { sessionState } from '@/lib/auth/session-state';

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: login,
    onSuccess: () => {
      queryClient.clear();
      sessionState.markSignedIn();
    },
  });
}
