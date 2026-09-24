import { useQuery } from '@tanstack/react-query';

import { listRoleAssignments } from '../api/role-assignments';

import { roleKeys } from './role-keys';

export function useUserRoleAssignments(userId: string) {
  return useQuery({
    queryKey: roleKeys.userAssignments(userId),
    queryFn: () => listRoleAssignments({ userId, limit: 100 }),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
}
