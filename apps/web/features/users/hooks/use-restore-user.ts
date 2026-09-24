'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { restoreUser } from '../api/restore-user';

import { userKeys } from './user-keys';

export function useRestoreUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => restoreUser(id),
    onSuccess: (restored, id) => {
      queryClient.setQueryData(userKeys.detail(id), restored);
      void queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
