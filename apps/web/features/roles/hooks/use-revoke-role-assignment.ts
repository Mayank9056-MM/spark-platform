import { useMutation, useQueryClient } from '@tanstack/react-query';

import { revokeRoleAssignment } from '../api/role-assignments';

import { roleKeys } from './role-keys';

import { CURRENT_USER_QUERY_KEY } from '@/features/auth/hooks/use-current-user';
import { userKeys } from '@/features/users/hooks/user-keys';

export function useRevokeRoleAssignment(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleAssignmentId: string) => revokeRoleAssignment(roleAssignmentId),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: roleKeys.userAssignments(userId),
        });
        void queryClient.invalidateQueries({
          queryKey: userKeys.detail(userId),
        });
      }
      void queryClient.invalidateQueries({
        queryKey: roleKeys.assignments(),
      });
      void queryClient.invalidateQueries({
        queryKey: CURRENT_USER_QUERY_KEY,
      });
    },
  });
}
