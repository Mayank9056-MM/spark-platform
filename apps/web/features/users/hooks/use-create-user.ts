'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createUser } from '../api/create-user';
import type { CreateUserFormValues } from '../schemas/user.schema';

import { userKeys } from './user-keys';

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserFormValues) => createUser(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
