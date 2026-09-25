import { useQuery } from '@tanstack/react-query';

import { getAdmission } from '../api/get-admission';

import { admissionKeys } from './admission-keys';

export function useAdmission(id: string) {
  return useQuery({
    queryKey: admissionKeys.detail(id),
    queryFn: ({ signal }) => getAdmission(id, signal),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}
