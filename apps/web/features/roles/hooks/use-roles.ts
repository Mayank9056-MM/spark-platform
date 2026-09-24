import { useQuery } from '@tanstack/react-query';

import { getRoles, type ListRolesParams } from '../api/get-roles';

import { roleKeys } from './role-keys';

export function useRoles(params?: ListRolesParams) {
  return useQuery({
    queryKey: roleKeys.list(params as Record<string, unknown>),
    queryFn: () => getRoles(params),
    staleTime: 30_000,
  });
}
