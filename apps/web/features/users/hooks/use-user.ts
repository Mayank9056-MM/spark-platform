'use client';

import { useQuery } from '@tanstack/react-query';

import { getUser } from '../api/get-user';

import { userKeys } from './user-keys';

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: ({ signal }) => getUser(id, signal),
    enabled: Boolean(id),
  });
}
