import { useQuery } from '@tanstack/react-query';

import { getPermissions, type ListPermissionsParams } from '../api/get-permissions';

import { roleKeys } from '@/features/roles/hooks/role-keys';

export function usePermissions(params?: ListPermissionsParams) {
  return useQuery({
    queryKey: [...roleKeys.catalogPermissions(), params ?? {}],
    queryFn: ({ signal }) => getPermissions(params, signal),
    staleTime: 60_000,
  });
}
