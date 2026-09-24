import { useMutation, useQueryClient } from '@tanstack/react-query';

import { revokePermission } from '../api/revoke-permission';

import { roleKeys } from './role-keys';

export function useRevokePermission(roleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (permissionId: string) => revokePermission(roleId, permissionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: roleKeys.permissions(roleId),
      });
    },
  });
}
