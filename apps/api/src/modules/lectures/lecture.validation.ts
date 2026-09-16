// apps/api/src/modules/lectures/lecture.validation.ts

import { z } from 'zod';

/**
 * HTTP-boundary validation for the Lecture module. Answers only "is this
 * HTTP body/params/query structurally valid?" — never whether
 * `timetableId` refers to an existing row, whether that Timetable is
 * active or its effective period contains `scheduledDate`, whether the
 * room/faculty/cohort is free at the resolved time, whether an
 * AttendanceSession already exists, or whether the caller is authorized.
 * All of that is either a service-layer concern or, per schema.prisma's
 * own comments on `Lecture`, a Postgres `btree_gist` EXCLUDE constraint —
 * neither belongs here. No Prisma import, no repository/service import,
 * no RBAC.
 *
 * ── three schemas, matching lecture.types.ts exactly ────────────────────
 * `lecture.types.ts` exports exactly one create input
 * (`CreateLectureInput`), one id (`LectureId`), and one filters/options
 * pair (`ListLecturesFilters` / `ListLecturesOptions`). There is no
 * `UpdateLectureInput`, and no `CancelLectureInput`/`CompleteLectureInput`
 * — that file documents at length why: Lecture identity must stay
 * immutable because `AttendanceSession.lectureId` is `@unique` and
 * `AttendanceRecord` hangs off it, and the status transitions are
 * dedicated service operations (`cancelLecture` / `completeLecture`)
 * carrying no payload beyond the id and actor, since the Prisma model has
 * no `cancellationReason`/`cancelledAt`/`completedAt` column. No
 * `updateLectureBodySchema`, `cancelLectureBodySchema`, or
 * `completeLectureBodySchema` is invented here — the validation layer does
 * not expand the domain API.
 *
 * ── create body: only the two genuine decisions ─────────────────────────
 * `CreateLectureInput` is exactly `{ timetableId, scheduledDate }`.
 * `subjectOfferingId`, `subjectComponentId`, `facultyAssignmentId`,
 * `facultyUserId`, `roomId`, `semesterCatalogId`, `academicYearId`,
 * `startTime`, and `endTime` are all real columns on the Prisma `Lecture`
 * model, but every one of them is fully determined by the referenced
 * Timetable row and is copied in by the service at write time — the same
 * `CreateTimetableInput` / `CreateTimetablePersistenceInput` split
 * `timetable.types.ts` already establishes. Accepting them here would let
 * a caller create a Lecture whose room or time DISAGREES with the
 * Timetable it claims to realize; the EXCLUDE constraints reject OVERLAP,
 * not DISAGREEMENT, so nothing downstream would catch it. Narrowing the
 * accepted command to the two independent decisions is the actual
 * attack-surface reduction.
 *
 * `status` is not accepted: the schema defaults it to `SCHEDULED`, and a
 * caller must never be able to create a row already `COMPLETED` (implying
 * teaching that never happened) or already `CANCELLED` — mirroring
 * `createTimetableBodySchema` excluding `isCancelled` and
 * `createSemesterEnrollmentBodySchema` excluding `status`.
 *
 * `timetableId` is REQUIRED even though the Prisma column is nullable.
 * Per `CreateLectureInput`'s own doc comment, the nullability exists for
 * future ad-hoc lectures, which are a materially wider input shape (the
 * caller would have to supply `facultyAssignmentId`, `roomId`,
 * `startTime`, `endTime` directly). No such operation exists yet, so no
 * `createAdHocLectureBodySchema` is defined here — a nullable column is
 * not, by itself, a contract.
 *
 * ── scheduledDate: a calendar day, not an instant ───────────────────────
 * `Lecture.scheduledDate` is `DateTime @db.Date` and `CalendarDate` in
 * `lecture.types.ts` is documented as `YYYY-MM-DD` with no time and no
 * timezone. `z.iso.date()` is therefore correct and `z.iso.datetime()`
 * would be actively wrong — "2026-09-22T00:00:00.000Z" silently acquires
 * a timezone and shifts across the date boundary for any consumer east or
 * west of UTC. `z.iso.date()` is also already this codebase's date
 * convention (`academic-year.validation.ts`'s `academicYearDateSchema`,
 * `timetable.validation.ts`'s `timetableEffectiveFromSchema`).
 *
 * No string is converted to a `Date` here. Persistence conversion belongs
 * to `lecture.mapper.ts` / the service, matching how `timetable.mapper.ts`
 * owns the `@db.Time` ↔ `HH:mm` conversion rather than the validation
 * layer.
 *
 * Deliberately NO range rules on `scheduledDate` — not "must be in the
 * future", not "must fall inside the AcademicYear", not "cannot be a
 * Sunday". Each is a business rule requiring either a clock or a database
 * read, and `DayOfWeek`'s missing `SUNDAY` value is enforced by the
 * Timetable the service resolves, not by this file.
 *
 * ── list filters: every field is a real, direct Lecture column ──────────
 * Mirrors `ListLecturesFilters` exactly, no more. Note there is no
 * `scheduledDate` equality filter: that type deliberately offers
 * `fromDate`/`toDate` inclusive bounds instead, so an exact-day query sets
 * both to the same value — two filters on one column would let a caller
 * supply contradictory predicates. No `subjectId`/`programId`/
 * `departmentId`/`facultyName`, and no `search` (Lecture has no own string
 * column), matching every sibling list schema's refusal to expose a filter
 * its repository cannot execute without an unestablished join.
 *
 * `facultyUserId` is validated as a UUID despite being typed plain
 * `string` in `lecture.types.ts` — that alias-free `string` is this
 * codebase's user-identity convention (no `UserId` type exists anywhere),
 * not a claim about the format. `User.id` is `@id @default(uuid())`, and
 * `facultyAssignment.validation.ts` already validates its own
 * `facultyUserId` as `z.uuid(...)` for exactly this reason.
 *
 * ── fromDate/toDate: no cross-field check ───────────────────────────────
 * `fromDate <= toDate` is NOT enforced. `academic-year.validation.ts` is
 * the only module in this codebase with a comparable pair and it
 * explicitly declines the check ("neither sibling module establishes a
 * cross-field `.refine()` convention"); its one `.refine` is a
 * non-empty-body guard on an update schema, not an ordering rule. There is
 * no project-wide cross-field query convention to follow, and inverted
 * bounds are structurally valid input that simply selects zero rows. See
 * "Findings outside this file" — if this should be a 400 rather than an
 * empty page, it belongs in the service, consistently for both modules.
 *
 * ── status: local literal union, not the generated Prisma enum ──────────
 * `lecture.types.ts` declares `LectureStatus` as a local three-value union
 * to stay persistence-independent, matching `DayOfWeek` in
 * `timetable.types.ts`. This file mirrors that list rather than importing
 * from the generated client. Notably absent: `RESCHEDULED` — the schema
 * cannot store it, and a move is modeled as CANCELLED + a new Lecture row.
 *
 * ── sortBy: explicit allow-list matching ListLecturesOptions exactly ────
 * `'scheduledDate' | 'startTime' | 'createdAt' | 'updatedAt'`. Never
 * `z.string()`: this value reaches a Prisma `orderBy` once
 * `lecture.repository.ts` exists, so an arbitrary client-supplied sort
 * field must never pass validation.
 *
 * ── no boolean query parameter ──────────────────────────────────────────
 * `ListLecturesFilters` contains no boolean field, so the two-literal
 * `z.enum(['true','false']).transform(...)` helper that
 * `timetable.validation.ts` / `subject.validation.ts` use for their own
 * boolean filters is not reproduced here. (It exists because
 * `z.coerce.boolean()` is unsafe — `Boolean('false') === true`.)
 *
 * ── pagination / unknown keys: same as every sibling module ─────────────
 * Default page size 20, max 100, `z.coerce.number()` since Express query
 * params arrive as strings. No `.strict()` anywhere — no sibling
 * validation file uses it, so unknown keys are silently stripped by Zod's
 * default object behavior here too.
 */

// ─────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────

/**
 * The `YYYY-MM-DD` representation of `lecture.types.ts`'s `CalendarDate`,
 * shared by the create body's `scheduledDate` and the list query's
 * `fromDate`/`toDate` — the same single-const reuse
 * `academic-year.validation.ts` applies to its own `startDate`/`endDate`.
 */
const lectureCalendarDateSchema = z.iso.date();

// ─────────────────────────────────────────────────────────────────────────
// Create lecture
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors CreateLectureInput exactly: `timetableId` and `scheduledDate`,
 * both required, nothing else. See the file-level comment for why the nine
 * other real `Lecture` columns are intentionally absent, why `status` is
 * not a create-time field, and why `timetableId` is required despite the
 * column being nullable.
 */
export const createLectureBodySchema = z.object({
  timetableId: z.uuid('Timetable ID must be a valid UUID'),
  scheduledDate: lectureCalendarDateSchema,
});
export type CreateLectureBody = z.infer<typeof createLectureBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Lecture ID params
// ─────────────────────────────────────────────────────────────────────────

/**
 * `id` (not `lectureId`) — matches timetableIdParamsSchema /
 * facultyAssignmentIdParamsSchema / subjectOfferingIdParamsSchema's
 * convention for generic single-resource routes. `Lecture.id` is
 * `@id @default(uuid())`, so a UUID check is correct.
 */
export const lectureIdParamsSchema = z.object({
  id: z.uuid('Lecture ID must be a valid UUID'),
});
export type LectureIdParams = z.infer<typeof lectureIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// List lectures query
// ─────────────────────────────────────────────────────────────────────────

const LECTURE_LIST_DEFAULT_PAGE_SIZE = 20;
const LECTURE_LIST_MAX_PAGE_SIZE = 100;

/** Mirrors schema.prisma's LectureStatus enum / lecture.types.ts's LectureStatus union exactly. */
const LECTURE_STATUS_VALUES = ['SCHEDULED', 'COMPLETED', 'CANCELLED'] as const;

/**
 * Combines ListLecturesFilters and ListLecturesOptions into a single query
 * schema, matching every sibling module's identical Filters+Options merge.
 * Every filter is a structural UUID/enum/date check only — whether the
 * referenced rows exist is irrelevant to a list query, which simply
 * returns zero rows.
 */
export const listLecturesQuerySchema = z.object({
  timetableId: z.uuid('Timetable ID must be a valid UUID').optional(),
  subjectOfferingId: z.uuid('Subject offering ID must be a valid UUID').optional(),
  subjectComponentId: z.uuid('Subject component ID must be a valid UUID').optional(),
  facultyAssignmentId: z.uuid('Faculty assignment ID must be a valid UUID').optional(),
  facultyUserId: z.uuid('Faculty user ID must be a valid UUID').optional(),
  semesterCatalogId: z.uuid('Semester catalog ID must be a valid UUID').optional(),
  academicYearId: z.uuid('Academic year ID must be a valid UUID').optional(),
  roomId: z.uuid('Room ID must be a valid UUID').optional(),
  status: z.enum(LECTURE_STATUS_VALUES).optional(),
  fromDate: lectureCalendarDateSchema.optional(),
  toDate: lectureCalendarDateSchema.optional(),
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, `Limit must be between 1 and ${LECTURE_LIST_MAX_PAGE_SIZE}`)
    .max(LECTURE_LIST_MAX_PAGE_SIZE, `Limit must be between 1 and ${LECTURE_LIST_MAX_PAGE_SIZE}`)
    .default(LECTURE_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['scheduledDate', 'startTime', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListLecturesQuery = z.infer<typeof listLecturesQuerySchema>;
