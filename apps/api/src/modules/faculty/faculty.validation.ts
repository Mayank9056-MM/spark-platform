// apps/api/src/modules/faculty/faculty.validation.ts

import { z } from 'zod';

export const submitAttendanceRecordSchema = z.object({
  semesterEnrollmentId: z.string().uuid(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
});

export const submitAttendanceBodySchema = z.object({
  records: z
    .array(submitAttendanceRecordSchema)
    .min(1, 'At least one student record must be marked'),
  lockSession: z.boolean().optional(),
});

export const listFacultyLecturesQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in YYYY-MM-DD format')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in YYYY-MM-DD format')
    .optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
});

export const facultyLectureIdParamsSchema = z.object({
  lectureId: z.string().uuid(),
});

export type SubmitAttendanceBody = z.infer<typeof submitAttendanceBodySchema>;
export type ListFacultyLecturesQuery = z.infer<typeof listFacultyLecturesQuerySchema>;
export type FacultyLectureIdParams = z.infer<typeof facultyLectureIdParamsSchema>;
