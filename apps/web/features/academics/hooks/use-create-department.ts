import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createDepartment } from '../api/departments';
import type { CreateDepartmentFormValues } from '../schemas/academic.schema';

import { academicKeys } from './academic-keys';

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateDepartmentFormValues) => createDepartment(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: academicKeys.departments(),
      });
    },
  });
}
