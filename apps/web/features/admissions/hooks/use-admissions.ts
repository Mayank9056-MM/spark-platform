import { useQuery } from '@tanstack/react-query';

import { getAdmissions } from '../api/get-admissions';
import type { ListAdmissionsParams } from '../schemas/admission.schema';

import { admissionKeys } from './admission-keys';

export function useAdmissions(params?: ListAdmissionsParams) {
  return useQuery({
    queryKey: admissionKeys.list(params as Record<string, unknown>),
    queryFn: ({ signal }) => getAdmissions(params, signal),
    staleTime: 30_000,
  });
}
