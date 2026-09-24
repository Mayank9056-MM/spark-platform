import { useQuery } from '@tanstack/react-query';

import { getRole } from '../api/get-role';

import { roleKeys } from './role-keys';

export function useRole(id: string) {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: ({ signal }) => getRole(id, signal),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}
