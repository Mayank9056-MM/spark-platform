'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { archiveUser } from '../api/archive-user';

import { userKeys } from './user-keys';

export function useArchiveUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveUser(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
    },
  });
}
