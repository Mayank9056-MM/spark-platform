// apps/api/src/modules/student-enrollments/studentEnrollment.validation.ts

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────
// Lifecycle status enum
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors schema.prisma's StudentLifecycleStatus enum exactly (7 values).
 * Used only for the list-query `status` filter — never accepted on
 * create/update/cancel/withdraw, all of which are dedicated lifecycle
 * commands rather than generic status setters.
 */
const studentLifecycleStatusSchema = z.enum([
  'ACTIVE',
  'ON_GAP_YEAR',
  'WITHDRAWN',
  'DISCONTINUED',
  'GRADUATED',
  'ALUMNI',
  'CANCELLED',
]);

// ─────────────────────────────────────────────────────────────────────────
// Roll number
// ─────────────────────────────────────────────────────────────────────────

/**
 * ROLL_NUMBER_MAX_LENGTH mirrors admission.validation.ts's
 * ADMISSION_NUMBER_MAX_LENGTH (50) — no sibling module has a roll-number
 * field to copy directly, but rollNumber is the same class of
 * institution-assigned identifier as admissionNumber (schema.prisma:
 * both are plain unbounded `String @unique`), so the same bound is
 * reused rather than inventing a new number. No character-class regex is
 * imposed: real roll numbers legitimately vary in format (23CS001,
 * BE-CSE-2025-001, 2025/CS/001), and nothing in schema.prisma constrains
 * the format beyond `@@unique([rollNumber])`.
 */
const ROLL_NUMBER_MAX_LENGTH = 50;

const rollNumberSchema = z
  .string()
  .trim()
  .min(1, 'Roll number is required')
  .max(ROLL_NUMBER_MAX_LENGTH, `Roll number must be at most ${ROLL_NUMBER_MAX_LENGTH} characters`);

// ─────────────────────────────────────────────────────────────────────────
// Lifecycle command reason (cancel / withdraw)
// ─────────────────────────────────────────────────────────────────────────

/**
 * REASON_MAX_LENGTH is a flagged assumption, not derived from an
 * existing convention — no sibling module has a free-text
 * justification field to mirror (schema.prisma's StudentEnrollment
 * .statusReason is an unbounded nullable String). 500 is chosen as
 * generous enough for a real administrative explanation while still
 * bounding request size, following the same "reason from schema
 * shape, not an invented regex" approach admission/department take for
 * their own unprecedented fields.
 */
const REASON_MAX_LENGTH = 500;

const lifecycleReasonSchema = z
  .string()
  .trim()
  .min(1, 'Reason is required')
  .max(REASON_MAX_LENGTH, `Reason must be at most ${REASON_MAX_LENGTH} characters`);

// ─────────────────────────────────────────────────────────────────────────
// Create student enrollment
// ─────────────────────────────────────────────────────────────────────────

/**
 * Only admissionId + rollNumber — every other field on
 * CreateStudentEnrollmentInput (userId, programId, curriculumVersionId,
 * admissionDate) is derived server-side from the referenced Admission,
 * never supplied by the client. status/statusReason/statusChangedAt are
 * likewise never client-controlled. Unknown keys (e.g. a client sending
 * "status": "GRADUATED" alongside these) are silently stripped by Zod's
 * default object behavior, matching every sibling write schema — no
 * `.strict()` is used here since none is used anywhere else in the
 * project.
 */
export const createStudentEnrollmentBodySchema = z.object({
  admissionId: z.uuid(),
  rollNumber: rollNumberSchema,
});
export type CreateStudentEnrollmentBody = z.infer<typeof createStudentEnrollmentBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Update student enrollment
// ─────────────────────────────────────────────────────────────────────────

/**
 * rollNumber is the only editable field — matches
 * UpdateStudentEnrollmentInput exactly. admissionId/userId/programId/
 * curriculumVersionId/status/statusReason/statusChangedAt/createdAt/
 * updatedAt are never accepted here; status changes go exclusively
 * through the dedicated cancel/withdraw commands below, never a generic
 * PATCH. Empty-body rejection mirrors
 * updateAdmissionBodySchema/updateDepartmentBodySchema exactly.
 */
export const updateStudentEnrollmentBodySchema = z
  .object({
    rollNumber: rollNumberSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateStudentEnrollmentBody = z.infer<typeof updateStudentEnrollmentBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Cancel student enrollment
// ─────────────────────────────────────────────────────────────────────────

/**
 * reason only. Whether cancellation is actually permitted (no academic
 * records exist yet) is a service-layer check, not validated here.
 */
export const cancelStudentEnrollmentBodySchema = z.object({
  reason: lifecycleReasonSchema,
});
export type CancelStudentEnrollmentBody = z.infer<typeof cancelStudentEnrollmentBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Withdraw student enrollment
// ─────────────────────────────────────────────────────────────────────────

/**
 * reason only. Whether withdrawal is actually eligible (vs. cancellation)
 * is a service-layer decision, not validated here.
 */
export const withdrawStudentEnrollmentBodySchema = z.object({
  reason: lifecycleReasonSchema,
});
export type WithdrawStudentEnrollmentBody = z.infer<typeof withdrawStudentEnrollmentBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Student enrollment ID params
// ─────────────────────────────────────────────────────────────────────────

export const studentEnrollmentIdParamsSchema = z.object({
  id: z.uuid(),
});
export type StudentEnrollmentIdParams = z.infer<typeof studentEnrollmentIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// List student enrollments query
// ─────────────────────────────────────────────────────────────────────────

const STUDENT_ENROLLMENT_LIST_DEFAULT_PAGE_SIZE = 20;
const STUDENT_ENROLLMENT_LIST_MAX_PAGE_SIZE = 100;
const STUDENT_ENROLLMENT_SEARCH_MAX_LENGTH = 200;

/**
 * Filters match ListStudentEnrollmentsFilters exactly — no invented
 * fields (no admissionDateFrom/To, activeOnly, etc.). sortBy is an
 * explicit allow-list matching ListStudentEnrollmentsOptions['sortBy']
 * so an arbitrary string can never reach a Prisma `orderBy`. page/limit
 * use z.coerce.number() since query params arrive as strings — same
 * mechanism as every sibling list-query schema.
 */
export const listStudentEnrollmentsQuerySchema = z.object({
  search: z.string().trim().min(1).max(STUDENT_ENROLLMENT_SEARCH_MAX_LENGTH).optional(),
  status: studentLifecycleStatusSchema.optional(),
  userId: z.uuid().optional(),
  admissionId: z.uuid().optional(),
  programId: z.uuid().optional(),
  curriculumVersionId: z.uuid().optional(),
  rollNumber: z.string().trim().min(1).max(ROLL_NUMBER_MAX_LENGTH).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(STUDENT_ENROLLMENT_LIST_MAX_PAGE_SIZE)
    .default(STUDENT_ENROLLMENT_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['rollNumber', 'admissionDate', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListStudentEnrollmentsQuery = z.infer<typeof listStudentEnrollmentsQuerySchema>;
