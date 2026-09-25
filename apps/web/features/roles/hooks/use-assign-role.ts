import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createRoleAssignment, type CreateRoleAssignmentPayload } from '../api/role-assignments';

import { roleKeys } from './role-keys';

import { CURRENT_USER_QUERY_KEY } from '@/features/auth/hooks/use-current-user';
import { userKeys } from '@/features/users/hooks/user-keys';

export function useAssignRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRoleAssignmentPayload) => createRoleAssignment(payload),
    onSuccess: (_, variables) => {
      // Invalidate the specific user's role assignments list
      void queryClient.invalidateQueries({
        queryKey: roleKeys.userAssignments(variables.userId),
      });
      // Invalidate general role assignments
      void queryClient.invalidateQueries({
        queryKey: roleKeys.assignments(),
      });
      // Invalidate targeted user detail
      void queryClient.invalidateQueries({
        queryKey: userKeys.detail(variables.userId),
      });
      // Invalidate current-user query in case mutation affected active session
      void queryClient.invalidateQueries({
        queryKey: CURRENT_USER_QUERY_KEY,
      });
    },
  });
}
