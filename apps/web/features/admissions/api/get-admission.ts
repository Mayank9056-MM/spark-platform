import { type Admission, admissionSchema } from '../schemas/admission.schema';

import { apiRequest } from '@/lib/api/http-client';

export function getAdmission(id: string, signal?: AbortSignal): Promise<Admission> {
  return apiRequest(`/admissions/${id}`, admissionSchema, { method: 'GET', signal });
}
