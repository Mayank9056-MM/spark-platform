import { z } from 'zod';

export const facultyAssignmentSchema = z.object({
  id: z.string().uuid(),
  subjectOfferingId: z.string().uuid('Subject offering ID must be a valid UUID'),
  subjectComponentId: z.string().uuid('Subject component ID must be a valid UUID'),
  facultyUserId: z.string().uuid('Faculty user ID must be a valid UUID'),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FacultyAssignment = z.infer<typeof facultyAssignmentSchema>;

export const createFacultyAssignmentSchema = z.object({
  subjectOfferingId: z.string().uuid('Subject offering ID must be a valid UUID'),
  subjectComponentId: z.string().uuid('Subject component ID must be a valid UUID'),
  facultyUserId: z.string().uuid('Faculty user ID must be a valid UUID'),
});

export type CreateFacultyAssignmentInput = z.infer<typeof createFacultyAssignmentSchema>;

export const listFacultyAssignmentsQuerySchema = z.object({
  subjectOfferingId: z.string().uuid().optional(),
  subjectComponentId: z.string().uuid().optional(),
  facultyUserId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt']).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});

export type ListFacultyAssignmentsParams = z.infer<typeof listFacultyAssignmentsQuerySchema>;
