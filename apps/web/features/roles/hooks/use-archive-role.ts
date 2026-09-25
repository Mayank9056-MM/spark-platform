import { useMutation, useQueryClient } from '@tanstack/react-query';

import { archiveRole } from '../api/archive-role';

import { roleKeys } from './role-keys';

export function useArchiveRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveRole(id),
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
