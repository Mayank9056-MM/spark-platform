import { z } from 'zod';

export const DayOfWeekEnum = z.enum([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
]);
export type DayOfWeek = z.infer<typeof DayOfWeekEnum>;

export const timetableSchema = z.object({
  id: z.string().uuid(),
  subjectOfferingId: z.string().uuid(),
  subjectComponentId: z.string().uuid(),
  facultyAssignmentId: z.string().uuid(),
  semesterCatalogId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  timeSlotId: z.string().uuid(),
  roomId: z.string().uuid(),
  dayOfWeek: DayOfWeekEnum,
  startTime: z.string(),
  endTime: z.string(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  isCancelled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TimetableEntry = z.infer<typeof timetableSchema>;

export const createTimetableInputSchema = z.object({
  facultyAssignmentId: z.string().uuid('Faculty assignment ID must be a valid UUID'),
  timeSlotId: z.string().uuid('Time slot ID must be a valid UUID'),
  roomId: z.string().uuid('Room ID must be a valid UUID'),
  effectiveFrom: z.string().optional(),
});
export type CreateTimetableInput = z.infer<typeof createTimetableInputSchema>;

export const listTimetablesQuerySchema = z.object({
  subjectOfferingId: z.string().uuid().optional(),
  subjectComponentId: z.string().uuid().optional(),
  facultyAssignmentId: z.string().uuid().optional(),
  semesterCatalogId: z.string().uuid().optional(),
  academicYearId: z.string().uuid().optional(),
  timeSlotId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  dayOfWeek: DayOfWeekEnum.optional(),
  isCancelled: z.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  sortBy: z
    .enum(['dayOfWeek', 'startTime', 'createdAt', 'updatedAt'])
    .default('dayOfWeek')
    .optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc').optional(),
});
export type ListTimetablesParams = z.infer<typeof listTimetablesQuerySchema>;
