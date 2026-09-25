import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createRole } from '../api/create-role';
import type { CreateRoleFormValues } from '../schemas/role.schema';

import { roleKeys } from './role-keys';

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateRoleFormValues) => createRole(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: roleKeys.lists(),
      });
    },
  });
}
