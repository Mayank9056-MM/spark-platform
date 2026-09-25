'use client';

import { useQuery } from '@tanstack/react-query';

import { getUsers } from '../api/get-users';
import type { ListUsersParams } from '../schemas/user.schema';

import { userKeys } from './user-keys';

export function useUsers(params: ListUsersParams = {}) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: ({ signal }) => getUsers(params, signal),
  });
}
