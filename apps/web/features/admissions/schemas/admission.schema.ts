import { z } from 'zod';

export const ADMISSION_TYPES = ['NORMAL', 'LATERAL', 'EXCEPTION'] as const;
export type AdmissionType = (typeof ADMISSION_TYPES)[number];

export const ADMISSION_QUOTAS = ['GOVERNMENT_QUOTA', 'MANAGEMENT_QUOTA'] as const;
export type AdmissionQuota = (typeof ADMISSION_QUOTAS)[number];

export const ADMISSION_STATUSES = ['CONFIRMED', 'CANCELLED'] as const;
export type AdmissionStatus = (typeof ADMISSION_STATUSES)[number];

export const admissionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  admissionNumber: z.string(),
  admissionDate: z.string(),
  admissionType: z.enum(ADMISSION_TYPES),
  entrySemesterCatalogId: z.string(),
  quota: z.enum(ADMISSION_QUOTAS),
  status: z.enum(ADMISSION_STATUSES),
  admittedByUserId: z.string(),
  initialProgramId: z.string(),
  initialCurriculumId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Admission = z.infer<typeof admissionSchema>;

export const createAdmissionSchema = z.object({
  userId: z.string().uuid('Valid user ID required'),
  admissionNumber: z.string().trim().min(1, 'Admission number is required'),
  admissionDate: z.string().min(1, 'Admission date is required'),
  admissionType: z.enum(ADMISSION_TYPES),
  entrySemesterCatalogId: z.string().uuid('Valid semester catalog ID required'),
  quota: z.enum(ADMISSION_QUOTAS),
  initialProgramId: z.string().uuid('Valid program ID required'),
  initialCurriculumId: z.string().uuid('Valid curriculum ID required'),
});
export type CreateAdmissionFormValues = z.infer<typeof createAdmissionSchema>;

export const updateAdmissionSchema = z.object({
  admissionDate: z.string().optional(),
  quota: z.enum(ADMISSION_QUOTAS).optional(),
});
export type UpdateAdmissionFormValues = z.infer<typeof updateAdmissionSchema>;

export interface ListAdmissionsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: AdmissionStatus;
  admissionType?: AdmissionType;
  quota?: AdmissionQuota;
  initialProgramId?: string;
  sortBy?: 'admissionNumber' | 'admissionDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
