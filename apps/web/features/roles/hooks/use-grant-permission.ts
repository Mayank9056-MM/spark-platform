import { useMutation, useQueryClient } from '@tanstack/react-query';

import { grantPermission } from '../api/grant-permission';

import { roleKeys } from './role-keys';

export function useGrantPermission(roleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (permissionId: string) => grantPermission(roleId, permissionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: roleKeys.permissions(roleId),
      });
    },
  });
}
