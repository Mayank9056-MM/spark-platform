// apps/api/src/modules/student/student.validation.ts

import { z } from 'zod';

export const updateStudentProfileBodySchema = z.object({
  phone: z.string().trim().max(20, 'Phone must not exceed 20 characters').nullable().optional(),
});

export type UpdateStudentProfileBody = z.infer<typeof updateStudentProfileBodySchema>;
