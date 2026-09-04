// apps/api/src/modules/admissions/admission.mapper.ts

import type { Admission } from '@spark/database/client';

import type { AdmissionDTO } from './admission.types.js';

export function toAdmissionDTO(admission: Admission): AdmissionDTO {
  return {
    id: admission.id,
    userId: admission.userId,
    admissionNumber: admission.admissionNumber,
    admissionDate: admission.admissionDate.toISOString(),
    admissionType: admission.admissionType,
    entrySemesterCatalogId: admission.entrySemesterCatalogId,
    quota: admission.quota,
    status: admission.status,
    admittedByUserId: admission.admittedByUserId,
    initialProgramId: admission.initialProgramId,
    initialCurriculumId: admission.initialCurriculumId,
    createdAt: admission.createdAt.toISOString(),
    updatedAt: admission.updatedAt.toISOString(),
  };
}

export function toAdmissionDTOList(admissions: readonly Admission[]): AdmissionDTO[] {
  return admissions.map(toAdmissionDTO);
}
