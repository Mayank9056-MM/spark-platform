'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateUser } from '../api/update-user';
import type { UpdateUserFormValues } from '../schemas/user.schema';

import { userKeys } from './user-keys';

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserFormValues) => updateUser(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(userKeys.detail(id), updated);
      void queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
