import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteDepartment } from '../api/departments';

import { academicKeys } from './academic-keys';

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDepartment(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({
        queryKey: academicKeys.departmentDetail(id),
      });
      void queryClient.invalidateQueries({
        queryKey: academicKeys.departments(),
      });
    },
  });
}
