// apps/api/src/modules/attendance/attendance.validation.ts

import { z } from 'zod';

/**
 * HTTP-boundary validation for the Attendance module (AttendanceSession +
 * AttendanceRecord). Answers only "is this HTTP body/params/query
 * structurally valid?" — never whether `lectureId` refers to an existing
 * Lecture, whether a session already exists for it, whether the session
 * is OPEN or LOCKED, whether a `semesterEnrollmentId` belongs to the
 * lecture's academic context, whether the caller is authorized, or
 * whether a `AttendanceRecord` already exists for a given
 * (attendanceSessionId, semesterEnrollmentId) pair. All of that is either
 * a service-layer concern or a Postgres constraint
 * (`@@unique([attendanceSessionId, semesterEnrollmentId])`), per
 * attendance.types.ts's own module header — neither belongs here. No
 * Prisma import, no repository/service import, no RBAC.
 *
 * attendance.types.ts remains the domain contract. This file defines the
 * narrower HTTP input shapes and exports its own inferred types, matching
 * every sibling validation module's convention exactly (no validation
 * file in this codebase imports its own `*.types.ts`).
 *
 * ── actor identity is never validated here ───────────────────────────
 * `takenByUserId`, `markedByUserId`, and `correctedByUserId` appear in no
 * schema below. Each is read from `req.user` by the service, exactly as
 * attendance.types.ts's module header documents ("ACTOR IDENTITY IS
 * NEVER A CLIENT-SUPPLIED FIELD") — the same pattern every sibling
 * module's validation file follows.
 *
 * ── server-owned fields are absent, not merely optional ──────────────
 * `id`, `status` (on session create), `lockedAt`, `correctedAt`,
 * `createdAt`, `updatedAt` appear in no schema below. No `.strict()` is
 * used anywhere in this codebase, so if a client sends one of these
 * anyway, Zod's default object behavior silently strips it before the
 * data reaches the controller/service — matching every sibling create
 * schema's identical treatment of database-generated/server-owned
 * columns.
 *
 * ── create session body: only the one genuine decision ────────────────
 * Mirrors `CreateAttendanceSessionInput` exactly: `lectureId` only.
 * `takenByUserId`, `status`, and `lockedAt` are excluded — see actor note
 * above and attendance.types.ts's own reasoning for why a session is
 * always opened `OPEN` with no `lockedAt`.
 *
 * ── lock session has no body schema ────────────────────────────────────
 * `POST /attendance/sessions/:id/lock` carries no client-supplied data —
 * attendance.types.ts explicitly declines an `UpdateAttendanceSessionInput`
 * because the schema has no `lockReason` column and the lifecycle is
 * OPEN → LOCKED only, no REOPENED. `attendanceSessionIdParamsSchema`
 * (below) is the only validation that route needs, matching
 * `promotion.validation.ts`'s identical treatment of
 * `POST /promotions/batches/:id/finalize` reusing
 * `promotionBatchIdParamsSchema` with no dedicated body schema.
 *
 * ── bulk mark is the one write operation on AttendanceRecord ──────────
 * Mirrors `BulkMarkAttendanceInput` exactly: `attendanceSessionId` plus
 * `records`, each validated against `MarkAttendanceRecordInput`'s two
 * fields (`semesterEnrollmentId`, `status`). `markedByUserId` is excluded
 * per the actor note above. `records` requires at least one entry — an
 * empty array accomplishes nothing and is rejected as a structurally
 * meaningless request, the same class of check
 * `updateDepartmentBodySchema` / `updateAdmissionBodySchema` apply via
 * their own "at least one field" `.refine()`. No upper bound is imposed:
 * per the task's explicit instruction, no sibling module establishes a
 * batch-size limit to reuse, and inventing one here would be undocumented
 * domain policy.
 *
 * Whether each `semesterEnrollmentId` exists, belongs to this lecture's
 * academic context, or is eligible is a database/service question — see
 * attendance.types.ts's own note on this being a service invariant, not a
 * type-level one. Duplicate `semesterEnrollmentId` values within one
 * `records` array are NOT rejected here: no sibling module in this
 * codebase performs array-uniqueness validation, and the database already
 * enforces this via `@@unique([attendanceSessionId,
 * semesterEnrollmentId])` — the same "leave it to the constraint" posture
 * the task requires when no existing precedent exists.
 *
 * ── correction body: the one legitimate status-change path ────────────
 * Mirrors `CorrectAttendanceRecordInput` exactly: `status` and
 * `correctionReason`, both required — `correctionReason` is required
 * (not `.optional()`) because the type itself declares it as
 * non-optional `string`, per attendance.types.ts's own note on the DB
 * CHECK constraint pairing `correctedAt`/`correctionReason`.
 * `correctedAt` and `correctedByUserId` are excluded — both are
 * server-derived at the moment of correction, per the actor note above.
 * The record being corrected is identified by
 * `attendanceRecordIdParamsSchema` (route context), not a body field,
 * matching `promotion.validation.ts`'s identical "parent id is route
 * context, not body" reasoning for `promotionBatchId`.
 *
 * `correctionReason`'s 500-character bound reuses the same limit
 * `promotion.validation.ts`'s `PROMOTION_DECISION_REMARKS_MAX_LENGTH`
 * already reuses from `studentEnrollment.validation.ts`'s
 * `REASON_MAX_LENGTH` — the same class of administrative free-text
 * justification, not a new number invented for this file.
 *
 * ── AttendanceStatus / AttendanceSessionStatus: local enums, exact ─────
 * Mirror `schema.prisma`'s `AttendanceStatus` (4 values) and
 * `AttendanceSessionStatus` (2 values) exactly, matching
 * attendance.types.ts's own local-literal-union convention rather than
 * importing from the generated Prisma client. No additional status is
 * introduced. `attendanceSessionStatusSchema` is used only in the list
 * sessions filter — there is no generic session-status mutation body, per
 * the lock-session note above.
 *
 * ── actor-reference filters validated as UUID ──────────────────────────
 * `takenByUserId` / `markedByUserId` / `correctedByUserId` are typed
 * plain `string` in attendance.types.ts (no `UserId` type exists in this
 * codebase — see its module header), but are validated as `z.uuid(...)`
 * here, exactly matching `lecture.validation.ts`'s identical treatment of
 * its own `facultyUserId` list filter: `User.id` is `@id
 * @default(uuid())`, so the format check is correct even though the
 * domain type stays alias-free.
 *
 * ── list filters: every field is a real, direct column ─────────────────
 * `ListAttendanceSessionsFilters` (`lectureId`, `takenByUserId`, `status`)
 * and `ListAttendanceRecordsFilters` (`attendanceSessionId`,
 * `semesterEnrollmentId`, `status`, `markedByUserId`,
 * `correctedByUserId`) are mirrored exactly, no more. No `search` on
 * either — neither AttendanceSession nor AttendanceRecord has an own
 * human-readable string field, matching `semesterEnrollment.validation.ts`
 * / `promotion.validation.ts`'s identical reasoning. No
 * `semesterCatalogId`/`academicYearId`/`facultyAssignmentId` filters —
 * none of those are stored directly on either model, matching every
 * sibling list schema's refusal to expose a filter its repository can't
 * execute without an unestablished join.
 *
 * ── sortBy: explicit allow-lists matching the Options types exactly ────
 * Sessions: `'createdAt' | 'updatedAt' | 'lockedAt'`. Records:
 * `'createdAt' | 'updatedAt' | 'correctedAt'`. `status` is excluded as a
 * sort key on both — a small enum with no ordering meaning beyond
 * declaration order, matching every sibling `List*Options`' identical
 * exclusion of its own status/enum fields. FK fields are excluded as sort
 * keys on the records query for the same reason. Never `z.string()`: this
 * value reaches a Prisma `orderBy` once `attendance.repository.ts`
 * exists.
 *
 * ── pagination / unknown keys: same as every sibling module ─────────────
 * Default page size 20, max 100, shared across both list schemas the way
 * `promotion.validation.ts`'s `PROMOTION_LIST_DEFAULT_PAGE_SIZE` /
 * `PROMOTION_LIST_MAX_PAGE_SIZE` are shared across its two list schemas
 * (Attendance likewise has two list endpoints, not one). `z.coerce.number()`
 * since Express query params arrive as strings. No `.strict()` — unknown
 * keys are silently stripped, matching every sibling schema.
 */

// ─────────────────────────────────────────────────────────────────────────
// Shared enums
// ─────────────────────────────────────────────────────────────────────────

/** Mirrors schema.prisma's AttendanceStatus enum exactly (4 values). */
const attendanceStatusSchema = z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']);

/** Mirrors schema.prisma's AttendanceSessionStatus enum exactly (2 values). */
const attendanceSessionStatusSchema = z.enum(['OPEN', 'LOCKED']);

// ─────────────────────────────────────────────────────────────────────────
// Correction reason
// ─────────────────────────────────────────────────────────────────────────

/**
 * Reuses the 500-character bound promotion.validation.ts's
 * PROMOTION_DECISION_REMARKS_MAX_LENGTH already reuses from
 * studentEnrollment.validation.ts's REASON_MAX_LENGTH — the same class
 * of administrative free-text justification, not a new number invented
 * for this file.
 */
const ATTENDANCE_CORRECTION_REASON_MAX_LENGTH = 500;

const attendanceCorrectionReasonSchema = z
  .string()
  .trim()
  .min(1, 'Correction reason is required')
  .max(
    ATTENDANCE_CORRECTION_REASON_MAX_LENGTH,
    `Correction reason must be at most ${ATTENDANCE_CORRECTION_REASON_MAX_LENGTH} characters`,
  );

// ─────────────────────────────────────────────────────────────────────────
// Create attendance session
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors CreateAttendanceSessionInput exactly: lectureId only.
 * takenByUserId/status/lockedAt are intentionally absent — see file-level
 * comment.
 */
export const createAttendanceSessionBodySchema = z.object({
  lectureId: z.uuid('Lecture ID must be a valid UUID'),
});
export type CreateAttendanceSessionBody = z.infer<typeof createAttendanceSessionBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Attendance session ID params
// ─────────────────────────────────────────────────────────────────────────

/**
 * `id` — matches lectureIdParamsSchema / timetableIdParamsSchema's
 * convention for generic single-resource routes. Covers
 * GET /attendance/sessions/:id and POST /attendance/sessions/:id/lock —
 * lock carries no body, so this params schema is the only validation
 * that route needs (see file-level comment).
 */
export const attendanceSessionIdParamsSchema = z.object({
  id: z.uuid('Attendance session ID must be a valid UUID'),
});
export type AttendanceSessionIdParams = z.infer<typeof attendanceSessionIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// Attendance record ID params
// ─────────────────────────────────────────────────────────────────────────

/** `id` — for PATCH /attendance/records/:id/correct. */
export const attendanceRecordIdParamsSchema = z.object({
  id: z.uuid('Attendance record ID must be a valid UUID'),
});
export type AttendanceRecordIdParams = z.infer<typeof attendanceRecordIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// Bulk mark attendance
// ─────────────────────────────────────────────────────────────────────────

/**
 * One record within a bulk-marking request. Mirrors
 * MarkAttendanceRecordInput exactly: semesterEnrollmentId and status
 * only. markedByUserId is excluded — see file-level comment.
 */
const markAttendanceRecordSchema = z.object({
  semesterEnrollmentId: z.uuid('Semester enrollment ID must be a valid UUID'),
  status: attendanceStatusSchema,
});

/**
 * Mirrors BulkMarkAttendanceInput exactly: attendanceSessionId and
 * records. records requires at least one entry — see file-level comment
 * for why this is a structural check, not a business rule, and why no
 * upper bound is imposed.
 */
export const bulkMarkAttendanceBodySchema = z.object({
  attendanceSessionId: z.uuid('Attendance session ID must be a valid UUID'),
  records: z.array(markAttendanceRecordSchema).min(1, 'At least one record is required'),
});
export type BulkMarkAttendanceBody = z.infer<typeof bulkMarkAttendanceBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Correct attendance record
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors CorrectAttendanceRecordInput exactly: status and
 * correctionReason, both required. correctedAt/correctedByUserId are
 * excluded — see file-level comment. The record being corrected comes
 * from attendanceRecordIdParamsSchema (route context), not this body.
 */
export const correctAttendanceRecordBodySchema = z.object({
  status: attendanceStatusSchema,
  correctionReason: attendanceCorrectionReasonSchema,
});
export type CorrectAttendanceRecordBody = z.infer<typeof correctAttendanceRecordBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// List attendance sessions query
// ─────────────────────────────────────────────────────────────────────────

const ATTENDANCE_LIST_DEFAULT_PAGE_SIZE = 20;
const ATTENDANCE_LIST_MAX_PAGE_SIZE = 100;

/**
 * Combines ListAttendanceSessionsFilters and ListAttendanceSessionsOptions
 * into one query schema, matching every sibling module's identical
 * Filters+Options merge. takenByUserId is validated as UUID despite being
 * typed plain string in attendance.types.ts — see file-level comment.
 */
export const listAttendanceSessionsQuerySchema = z.object({
  lectureId: z.uuid('Lecture ID must be a valid UUID').optional(),
  takenByUserId: z.uuid('Taken-by user ID must be a valid UUID').optional(),
  status: attendanceSessionStatusSchema.optional(),
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, `Limit must be between 1 and ${ATTENDANCE_LIST_MAX_PAGE_SIZE}`)
    .max(
      ATTENDANCE_LIST_MAX_PAGE_SIZE,
      `Limit must be between 1 and ${ATTENDANCE_LIST_MAX_PAGE_SIZE}`,
    )
    .default(ATTENDANCE_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['createdAt', 'updatedAt', 'lockedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListAttendanceSessionsQuery = z.infer<typeof listAttendanceSessionsQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────
// List attendance records query
// ─────────────────────────────────────────────────────────────────────────

/**
 * Combines ListAttendanceRecordsFilters and ListAttendanceRecordsOptions
 * into one query schema, matching every sibling module's identical
 * Filters+Options merge. markedByUserId/correctedByUserId are validated
 * as UUID despite being typed plain string in attendance.types.ts — see
 * file-level comment.
 */
export const listAttendanceRecordsQuerySchema = z.object({
  attendanceSessionId: z.uuid('Attendance session ID must be a valid UUID').optional(),
  semesterEnrollmentId: z.uuid('Semester enrollment ID must be a valid UUID').optional(),
  status: attendanceStatusSchema.optional(),
  markedByUserId: z.uuid('Marked-by user ID must be a valid UUID').optional(),
  correctedByUserId: z.uuid('Corrected-by user ID must be a valid UUID').optional(),
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, `Limit must be between 1 and ${ATTENDANCE_LIST_MAX_PAGE_SIZE}`)
    .max(
      ATTENDANCE_LIST_MAX_PAGE_SIZE,
      `Limit must be between 1 and ${ATTENDANCE_LIST_MAX_PAGE_SIZE}`,
    )
    .default(ATTENDANCE_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['createdAt', 'updatedAt', 'correctedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListAttendanceRecordsQuery = z.infer<typeof listAttendanceRecordsQuerySchema>;
