import { type Admission, admissionSchema } from '../schemas/admission.schema';

import { apiRequest } from '@/lib/api/http-client';

export function cancelAdmission(id: string, signal?: AbortSignal): Promise<Admission> {
  return apiRequest(`/admissions/${id}/cancel`, admissionSchema, {
    method: 'POST',
    signal,
  });
}
