import { z } from 'zod';

export const SEMESTER_ENROLLMENT_STATUSES = [
  'IN_PROGRESS',
  'PROMOTED',
  'REPEATED',
  'DETAINED',
  'WITHDRAWN',
  'DISCONTINUED',
  'GRADUATED',
] as const;

export type SemesterEnrollmentStatus = (typeof SEMESTER_ENROLLMENT_STATUSES)[number];

export const semesterEnrollmentStatusSchema = z.enum(SEMESTER_ENROLLMENT_STATUSES);

export const semesterEnrollmentSchema = z.object({
  id: z.string().uuid(),
  studentEnrollmentId: z.string().uuid(),
  semesterCatalogId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  attemptNumber: z.number().int().positive(),
  status: semesterEnrollmentStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SemesterEnrollment = z.infer<typeof semesterEnrollmentSchema>;

export const createSemesterEnrollmentSchema = z.object({
  studentEnrollmentId: z.string().uuid('Student enrollment ID must be a valid UUID'),
  semesterCatalogId: z.string().uuid('Semester catalog ID must be a valid UUID'),
  academicYearId: z.string().uuid('Academic year ID must be a valid UUID'),
});

export type CreateSemesterEnrollmentInput = z.infer<typeof createSemesterEnrollmentSchema>;

export const listSemesterEnrollmentsQuerySchema = z.object({
  studentEnrollmentId: z.string().uuid().optional(),
  semesterCatalogId: z.string().uuid().optional(),
  academicYearId: z.string().uuid().optional(),
  attemptNumber: z.coerce.number().int().positive().optional(),
  status: semesterEnrollmentStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  sortBy: z.enum(['attemptNumber', 'createdAt']).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});

export type ListSemesterEnrollmentsParams = z.infer<typeof listSemesterEnrollmentsQuerySchema>;
