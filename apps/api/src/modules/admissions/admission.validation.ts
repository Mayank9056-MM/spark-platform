// apps/api/src/modules/admissions/admission.validation.ts

import { z } from 'zod';

const admissionTypeSchema = z.enum(['NORMAL', 'LATERAL', 'EXCEPTION']);
const admissionQuotaSchema = z.enum(['GOVERNMENT_QUOTA', 'MANAGEMENT_QUOTA']);
const admissionStatusSchema = z.enum(['CONFIRMED', 'CANCELLED']);

const ADMISSION_NUMBER_MAX_LENGTH = 50;
const admissionNumberSchema = z
  .string()
  .trim()
  .min(1, 'Admission number is required')
  .max(
    ADMISSION_NUMBER_MAX_LENGTH,
    `Admission number must be at most ${ADMISSION_NUMBER_MAX_LENGTH} characters`,
  );

const admissionDateSchema = z.iso.date();

export const createAdmissionBodySchema = z.object({
  userId: z.uuid(),
  admissionNumber: admissionNumberSchema,
  admissionDate: admissionDateSchema,
  admissionType: admissionTypeSchema,
  entrySemesterCatalogId: z.uuid(),
  quota: admissionQuotaSchema,
  initialProgramId: z.uuid(),
  initialCurriculumId: z.uuid(),
});
export type CreateAdmissionBody = z.infer<typeof createAdmissionBodySchema>;

export const updateAdmissionBodySchema = z
  .object({
    admissionDate: admissionDateSchema.optional(),
    quota: admissionQuotaSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateAdmissionBody = z.infer<typeof updateAdmissionBodySchema>;

export const admissionIdParamsSchema = z.object({ id: z.uuid() });
export type AdmissionIdParams = z.infer<typeof admissionIdParamsSchema>;

const ADMISSION_LIST_DEFAULT_PAGE_SIZE = 20;
const ADMISSION_LIST_MAX_PAGE_SIZE = 100;
const ADMISSION_SEARCH_MAX_LENGTH = 200;

export const listAdmissionsQuerySchema = z.object({
  search: z.string().trim().min(1).max(ADMISSION_SEARCH_MAX_LENGTH).optional(),
  status: admissionStatusSchema.optional(),
  admissionType: admissionTypeSchema.optional(),
  quota: admissionQuotaSchema.optional(),
  userId: z.uuid().optional(),
  initialProgramId: z.uuid().optional(),
  initialCurriculumId: z.uuid().optional(),
  entrySemesterCatalogId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(ADMISSION_LIST_MAX_PAGE_SIZE)
    .default(ADMISSION_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['admissionNumber', 'admissionDate', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListAdmissionsQuery = z.infer<typeof listAdmissionsQuerySchema>;
