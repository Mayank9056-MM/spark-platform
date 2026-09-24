import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateDepartment } from '../api/departments';
import type { UpdateDepartmentFormValues } from '../schemas/academic.schema';

import { academicKeys } from './academic-keys';

export function useUpdateDepartment(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: UpdateDepartmentFormValues) => updateDepartment(id, values),
    onSuccess: (updated) => {
      queryClient.setQueryData(academicKeys.departmentDetail(id), updated);
      void queryClient.invalidateQueries({
        queryKey: academicKeys.departments(),
      });
    },
  });
}
