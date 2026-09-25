import { useQuery } from '@tanstack/react-query';

import { getPrograms, type ListProgramsParams } from '../api/programs';

import { academicKeys } from './academic-keys';

export function usePrograms(params?: ListProgramsParams) {
  return useQuery({
    queryKey: academicKeys.programList(params as Record<string, unknown>),
    queryFn: ({ signal }) => getPrograms(params, signal),
    staleTime: 60_000,
  });
}
