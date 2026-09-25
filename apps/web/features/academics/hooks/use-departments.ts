import { useQuery } from '@tanstack/react-query';

import { getDepartments, type ListDepartmentsParams } from '../api/departments';

import { academicKeys } from './academic-keys';

export function useDepartments(params?: ListDepartmentsParams) {
  return useQuery({
    queryKey: academicKeys.departmentList(params as Record<string, unknown>),
    queryFn: ({ signal }) => getDepartments(params, signal),
    staleTime: 60_000,
  });
}
