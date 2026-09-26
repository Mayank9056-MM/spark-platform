// apps/api/src/modules/hod/hod.validation.ts

import { z } from 'zod';

export const listHodStudentsQuerySchema = z.object({
  programId: z.uuid().optional(),
  status: z.enum(['ACTIVE', 'ON_GAP_YEAR', 'WITHDRAWN', 'DISCONTINUED', 'GRADUATED', 'ALUMNI', 'CANCELLED']).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListHodStudentsQuery = z.infer<typeof listHodStudentsQuerySchema>;

export const hodTimetableQuerySchema = z.object({
  dayOfWeek: z
    .enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'])
    .optional(),
  programId: z.uuid().optional(),
});
export type HodTimetableQuery = z.infer<typeof hodTimetableQuerySchema>;

export const createHodFacultyAssignmentBodySchema = z.object({
  subjectOfferingId: z.uuid('Subject offering ID must be a valid UUID'),
  subjectComponentId: z.uuid('Subject component ID must be a valid UUID'),
  facultyUserId: z.uuid('Faculty user ID must be a valid UUID'),
});
export type CreateHodFacultyAssignmentBody = z.infer<typeof createHodFacultyAssignmentBodySchema>;

export const createHodTimetableBodySchema = z.object({
  facultyAssignmentId: z.uuid('Faculty assignment ID must be a valid UUID'),
  roomId: z.uuid('Room ID must be a valid UUID'),
  timeSlotId: z.uuid('Time slot ID must be a valid UUID'),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'effectiveFrom must be in YYYY-MM-DD format'),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'effectiveTo must be in YYYY-MM-DD format').nullable().optional(),
});
export type CreateHodTimetableBody = z.infer<typeof createHodTimetableBodySchema>;
