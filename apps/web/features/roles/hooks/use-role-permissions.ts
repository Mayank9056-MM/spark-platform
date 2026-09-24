import { useQuery } from '@tanstack/react-query';

import { getRoleWithPermissions } from '../api/get-role-permissions';

import { roleKeys } from './role-keys';

export function useRolePermissions(roleId: string) {
  return useQuery({
    queryKey: roleKeys.permissions(roleId),
    queryFn: ({ signal }) => getRoleWithPermissions(roleId, signal),
    enabled: Boolean(roleId),
    staleTime: 30_000,
  });
}
