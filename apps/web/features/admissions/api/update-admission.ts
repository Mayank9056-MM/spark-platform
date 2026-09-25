import {
  type Admission,
  admissionSchema,
  type UpdateAdmissionFormValues,
} from '../schemas/admission.schema';

import { apiRequest } from '@/lib/api/http-client';

export function updateAdmission(
  id: string,
  payload: UpdateAdmissionFormValues,
  signal?: AbortSignal,
): Promise<Admission> {
  return apiRequest(`/admissions/${id}`, admissionSchema, {
    method: 'PATCH',
    body: payload,
    signal,
  });
}
