import {
  type Admission,
  admissionSchema,
  type CreateAdmissionFormValues,
} from '../schemas/admission.schema';

import { apiRequest } from '@/lib/api/http-client';

export function createAdmission(
  payload: CreateAdmissionFormValues,
  signal?: AbortSignal,
): Promise<Admission> {
  return apiRequest('/admissions', admissionSchema, {
    method: 'POST',
    body: payload,
    signal,
  });
}
