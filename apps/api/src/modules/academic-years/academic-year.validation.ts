// apps/api/src/modules/academic-years/academic-year.validation.ts

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────
// Academic year label
// ─────────────────────────────────────────────────────────────────────────

const ACADEMIC_YEAR_LABEL_MAX_LENGTH = 150;

const academicYearLabelSchema = z
  .string()
  .trim()
  .min(1, 'Label is required')
  .max(
    ACADEMIC_YEAR_LABEL_MAX_LENGTH,
    `Label must be at most ${ACADEMIC_YEAR_LABEL_MAX_LENGTH} characters`,
  );

// ─────────────────────────────────────────────────────────────────────────
// Start date / end date
// ─────────────────────────────────────────────────────────────────────────

const academicYearDateSchema = z.iso.date();

// ─────────────────────────────────────────────────────────────────────────
// Create academic year
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors CreateAcademicYearInput exactly: label, startDate, endDate —
 * all required, matching the schema's non-nullable, no-default columns
 * (aside from `isActive`, which defaults at the database level and is
 * intentionally not accepted here — see file-level note above). `id`,
 * `createdAt`, `updatedAt` are database-generated and excluded, same
 * convention as createDepartmentBodySchema / createProgramBodySchema.
 *
 * Cross-field ordering (startDate before endDate) is deliberately NOT
 * validated here — neither sibling module establishes a cross-field
 * `.refine()` convention, and the task reserves domain rules like this
 * for the service layer unless already established elsewhere.
 */
export const createAcademicYearBodySchema = z.object({
  label: academicYearLabelSchema,
  startDate: academicYearDateSchema,
  endDate: academicYearDateSchema,
});
export type CreateAcademicYearBody = z.infer<typeof createAcademicYearBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Update academic year
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors UpdateAcademicYearInput exactly: label, startDate, and
 * endDate are all independently optional; `isActive` has no key at all
 * (see file-level note above). Rejects an empty body via `.refine`,
 * matching updateDepartmentBodySchema / updateProgramBodySchema exactly.
 */
export const updateAcademicYearBodySchema = z
  .object({
    label: academicYearLabelSchema.optional(),
    startDate: academicYearDateSchema.optional(),
    endDate: academicYearDateSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateAcademicYearBody = z.infer<typeof updateAcademicYearBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Academic year ID params
// ─────────────────────────────────────────────────────────────────────────

/**
 * `id` (not `academicYearId`) — matches departmentIdParamsSchema /
 * programIdParamsSchema's convention for generic single-resource routes.
 * AcademicYear.id is `@id @default(uuid())` in schema.prisma, so a UUID
 * check is correct here, same as every other module's ID params schema.
 */
export const academicYearIdParamsSchema = z.object({
  id: z.uuid(),
});
export type AcademicYearIdParams = z.infer<typeof academicYearIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// List academic years query
// ─────────────────────────────────────────────────────────────────────────

const ACADEMIC_YEAR_LIST_DEFAULT_PAGE_SIZE = 20;
const ACADEMIC_YEAR_LIST_MAX_PAGE_SIZE = 100;
const ACADEMIC_YEAR_SEARCH_MAX_LENGTH = 200;

export const listAcademicYearsQuerySchema = z.object({
  search: z.string().trim().min(1).max(ACADEMIC_YEAR_SEARCH_MAX_LENGTH).optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(ACADEMIC_YEAR_LIST_MAX_PAGE_SIZE)
    .default(ACADEMIC_YEAR_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['label', 'startDate', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListAcademicYearsQuery = z.infer<typeof listAcademicYearsQuerySchema>;
