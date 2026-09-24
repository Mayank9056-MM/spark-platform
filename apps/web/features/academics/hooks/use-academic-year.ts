import { useQuery } from '@tanstack/react-query';

import { getAcademicYear } from '../api/academic-years';

import { academicKeys } from './academic-keys';

export function useAcademicYear(id: string) {
  return useQuery({
    queryKey: academicKeys.academicYearDetail(id),
    queryFn: ({ signal }) => getAcademicYear(id, signal),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}
