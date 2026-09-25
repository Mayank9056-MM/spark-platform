import { useQuery } from '@tanstack/react-query';

import { getAcademicYears, type ListAcademicYearsParams } from '../api/academic-years';

import { academicKeys } from './academic-keys';

export function useAcademicYears(params?: ListAcademicYearsParams, enabled = true) {
  return useQuery({
    queryKey: academicKeys.academicYearList(params as Record<string, unknown>),
    queryFn: ({ signal }) => getAcademicYears(params, signal),
    enabled,
    staleTime: 60_000,
  });
}
