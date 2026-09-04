// apps/api/src/modules/admissions/admission.types.ts

import type { CurriculumVersionId } from '../academic/curricula/curriculum.types.js';
import type { ProgramId } from '../academic/programs/program.types.js';
import type { SemesterCatalogId } from '../academic/SemesterCatalog/semester.types.js';

export type AdmissionId = string;
export type AdmissionType = 'NORMAL' | 'LATERAL' | 'EXCEPTION';
export type AdmissionQuota = 'GOVERNMENT_QUOTA' | 'MANAGEMENT_QUOTA';
export type AdmissionStatus = 'CONFIRMED' | 'CANCELLED';

export interface AdmissionDTO {
  readonly id: AdmissionId;
  readonly userId: string;
  readonly admissionNumber: string;
  readonly admissionDate: string;
  readonly admissionType: AdmissionType;
  readonly entrySemesterCatalogId: SemesterCatalogId;
  readonly quota: AdmissionQuota;
  readonly status: AdmissionStatus;
  readonly admittedByUserId: string;
  readonly initialProgramId: ProgramId;
  readonly initialCurriculumId: CurriculumVersionId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateAdmissionInput {
  readonly userId: string;
  readonly admissionNumber: string;
  readonly admissionDate: string;
  readonly admissionType: AdmissionType;
  readonly entrySemesterCatalogId: SemesterCatalogId;
  readonly quota: AdmissionQuota;
  readonly initialProgramId: ProgramId;
  readonly initialCurriculumId: CurriculumVersionId;
}

export interface UpdateAdmissionInput {
  readonly admissionDate?: string | undefined;
  readonly quota?: AdmissionQuota | undefined;
}

export interface ListAdmissionsFilters {
  readonly search?: string | undefined;
  readonly status?: AdmissionStatus | undefined;
  readonly admissionType?: AdmissionType | undefined;
  readonly quota?: AdmissionQuota | undefined;
  readonly userId?: string | undefined;
  readonly initialProgramId?: ProgramId | undefined;
  readonly initialCurriculumId?: CurriculumVersionId | undefined;
  readonly entrySemesterCatalogId?: SemesterCatalogId | undefined;
}

export interface ListAdmissionsOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'admissionNumber' | 'admissionDate' | 'createdAt';
  readonly sortOrder: 'asc' | 'desc';
}

export interface ListAdmissionsResult {
  readonly admissions: AdmissionDTO[];
  readonly total: number;
}
