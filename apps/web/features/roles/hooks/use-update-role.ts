import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateRole } from '../api/update-role';
import type { UpdateRoleFormValues } from '../schemas/role.schema';

import { roleKeys } from './role-keys';

export function useUpdateRole(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: UpdateRoleFormValues) => updateRole(id, values),
    onSuccess: (updatedRole) => {
      queryClient.setQueryData(roleKeys.detail(id), updatedRole);
      void queryClient.invalidateQueries({
        queryKey: roleKeys.lists(),
      });
    },
  });
}
