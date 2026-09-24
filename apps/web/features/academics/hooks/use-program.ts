import { useQuery } from '@tanstack/react-query';

import { getProgram } from '../api/programs';

import { academicKeys } from './academic-keys';

export function useProgram(id: string) {
  return useQuery({
    queryKey: academicKeys.programDetail(id),
    queryFn: ({ signal }) => getProgram(id, signal),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}
