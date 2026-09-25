import { useQuery } from '@tanstack/react-query';

import { getDepartment } from '../api/departments';

import { academicKeys } from './academic-keys';

export function useDepartment(id: string) {
  return useQuery({
    queryKey: academicKeys.departmentDetail(id),
    queryFn: ({ signal }) => getDepartment(id, signal),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}
