import {
  type Admission,
  admissionSchema,
  type ListAdmissionsParams,
} from '../schemas/admission.schema';

import type { PaginatedResult } from '@/lib/api/envelope';
import { apiPaginatedRequest } from '@/lib/api/http-client';

export function getAdmissions(
  params?: ListAdmissionsParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<Admission>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.admissionType) query.set('admissionType', params.admissionType);
  if (params?.quota) query.set('quota', params.quota);
  if (params?.initialProgramId) query.set('initialProgramId', params.initialProgramId);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const endpoint = `/admissions${query.toString() ? `?${query.toString()}` : ''}`;
  return apiPaginatedRequest(endpoint, admissionSchema, { method: 'GET', signal });
}
