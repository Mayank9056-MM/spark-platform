import { z } from 'zod';

export const STUDENT_LIFECYCLE_STATUSES = [
  'ACTIVE',
  'ON_GAP_YEAR',
  'WITHDRAWN',
  'DISCONTINUED',
  'GRADUATED',
  'ALUMNI',
  'CANCELLED',
] as const;
export type StudentLifecycleStatus = (typeof STUDENT_LIFECYCLE_STATUSES)[number];

export const studentEnrollmentSchema = z.object({
  id: z.string(),
  admissionId: z.string(),
  userId: z.string(),
  programId: z.string(),
  curriculumVersionId: z.string(),
  rollNumber: z.string(),
  admissionDate: z.string(),
  status: z.enum(STUDENT_LIFECYCLE_STATUSES),
  statusReason: z.string().nullable().optional(),
  statusChangedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StudentEnrollment = z.infer<typeof studentEnrollmentSchema>;

export const createStudentEnrollmentSchema = z.object({
  admissionId: z.string().uuid('Valid admission ID required'),
  rollNumber: z.string().trim().min(1, 'Roll number is required').max(50),
});
export type CreateStudentEnrollmentInput = z.infer<typeof createStudentEnrollmentSchema>;

export const cancelStudentEnrollmentSchema = z.object({
  reason: z.string().trim().min(1, 'Reason is required').max(500),
});
export type CancelStudentEnrollmentInput = z.infer<typeof cancelStudentEnrollmentSchema>;

export const withdrawStudentEnrollmentSchema = z.object({
  reason: z.string().trim().min(1, 'Reason is required').max(500),
});
export type WithdrawStudentEnrollmentInput = z.infer<typeof withdrawStudentEnrollmentSchema>;

export interface ListStudentEnrollmentsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: StudentLifecycleStatus;
  programId?: string;
  curriculumVersionId?: string;
  sortBy?: 'rollNumber' | 'admissionDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}
