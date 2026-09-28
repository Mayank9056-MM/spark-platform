import { z } from 'zod';

export const AttendanceSessionStatusEnum = z.enum(['OPEN', 'LOCKED']);
export type AttendanceSessionStatus = z.infer<typeof AttendanceSessionStatusEnum>;

export const AttendanceStatusEnum = z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']);
export type AttendanceStatus = z.infer<typeof AttendanceStatusEnum>;

export const attendanceSessionSchema = z.object({
  id: z.string().uuid(),
  lectureId: z.string().uuid(),
  takenByUserId: z.string(),
  status: AttendanceSessionStatusEnum,
  lockedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AttendanceSession = z.infer<typeof attendanceSessionSchema>;

export const attendanceRecordSchema = z.object({
  id: z.string().uuid(),
  attendanceSessionId: z.string().uuid(),
  semesterEnrollmentId: z.string().uuid(),
  status: AttendanceStatusEnum,
  markedByUserId: z.string(),
  correctedAt: z.string().nullable(),
  correctionReason: z.string().nullable(),
  correctedByUserId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;

export const listAttendanceSessionsParamsSchema = z.object({
  lectureId: z.string().uuid().optional(),
  takenByUserId: z.string().uuid().optional(),
  status: AttendanceSessionStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'lockedAt']).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});
export type ListAttendanceSessionsParams = z.infer<typeof listAttendanceSessionsParamsSchema>;

export const listAttendanceRecordsParamsSchema = z.object({
  attendanceSessionId: z.string().uuid().optional(),
  semesterEnrollmentId: z.string().uuid().optional(),
  status: AttendanceStatusEnum.optional(),
  markedByUserId: z.string().uuid().optional(),
  correctedByUserId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'correctedAt']).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});
export type ListAttendanceRecordsParams = z.infer<typeof listAttendanceRecordsParamsSchema>;
