import { useMutation, useQueryClient } from '@tanstack/react-query';

import { restoreRole } from '../api/restore-role';

import { roleKeys } from './role-keys';

export function useRestoreRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => restoreRole(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({
        queryKey: roleKeys.detail(id),
      });
      void queryClient.invalidateQueries({
        queryKey: roleKeys.lists(),
      });
    },
  });
}
