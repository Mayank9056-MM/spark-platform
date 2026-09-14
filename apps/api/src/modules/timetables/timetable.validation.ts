// apps/api/src/modules/timetables/timetable.validation.ts

import { z } from 'zod';

/**
 * HTTP-boundary validation for the Timetable module. Answers only "is this
 * HTTP input structurally valid?" — never whether `facultyAssignmentId` /
 * `timeSlotId` / `roomId` refer to existing rows, whether the room is free
 * at that slot, whether the faculty member is already teaching elsewhere at
 * that time, whether the cohort (`semesterCatalogId` + `academicYearId`)
 * already has a class then, or whether the caller is authorized. All of
 * that is either a service-layer concern or, per schema.prisma's own
 * comments on `Timetable`, a Postgres `btree_gist` EXCLUDE constraint —
 * neither belongs here. `timetable.repository.ts` and
 * `timetable.controller.ts` do not exist yet, so there is nothing further
 * to cross-check request shapes against beyond `timetable.types.ts` itself.
 *
 * ── only three schemas, matching timetable.types.ts exactly ─────────────
 * `timetable.types.ts` exports exactly one create input
 * (`CreateTimetableInput`), one id (`TimetableId`), and one filters/options
 * pair (`ListTimetablesFilters` / `ListTimetablesOptions`) — no
 * `UpdateTimetableInput` exists. Per the file-level comment on
 * `CreateTimetableInput`, closing/reopening/cancelling a Timetable row are
 * explicitly future, dedicated lifecycle actions, not a PATCH — so no
 * `updateTimetableBodySchema` is invented here.
 *
 * ── create body: only the three independent decisions ───────────────────
 * `CreateTimetableInput` accepts exactly `facultyAssignmentId`,
 * `timeSlotId`, `roomId`, and an optional `effectiveFrom` — nothing else.
 * `subjectOfferingId`, `subjectComponentId`, `semesterCatalogId`,
 * `academicYearId`, `dayOfWeek`, `startTime`, and `endTime` are all real
 * columns on the Prisma `Timetable` model, but per `CreateTimetableInput`'s
 * own doc comment they are fully determined by `facultyAssignmentId` /
 * `timeSlotId` and copied in by the service at write time — accepting them
 * independently here would let a caller submit a `dayOfWeek` that
 * disagrees with the referenced `timeSlotId`, exactly the inconsistency
 * that denormalization pattern exists to prevent. None of them are
 * accepted as create fields.
 *
 * ── effectiveFrom: dates, not full datetimes ─────────────────────────────
 * `Timetable.effectiveFrom` is a Postgres `DateTime` with
 * `@default(now())`, same column type as `AcademicYear.startDate` /
 * `endDate`. `academic-year.validation.ts` is the only existing precedent
 * in this codebase for validating a plain (non-`@db.Date`) `DateTime`
 * column, and it uses `z.iso.date()`, not a full ISO datetime — that
 * precedent is followed here rather than inventing a new
 * `z.iso.datetime()` convention with no basis in the repository. Optional
 * only (no `.default()`), matching `subject.validation.ts`'s identical
 * treatment of `isElective`'s `@default(false)`: the DB default is not
 * duplicated at the validation layer.
 *
 * ── list filters: every field is a real, direct Timetable column ────────
 * `subjectOfferingId`, `subjectComponentId`, `facultyAssignmentId`,
 * `semesterCatalogId`, `academicYearId`, `timeSlotId`, `roomId`,
 * `dayOfWeek`, `isCancelled` — matches `ListTimetablesFilters` exactly, no
 * more. No `departmentId` / `programId` / `facultyName` / `subjectName`:
 * none of those are stored on `Timetable`, matching every sibling list
 * schema's identical refusal to expose a filter its repository can't
 * execute without an unestablished join. No `search`: `Timetable` has no
 * own human-readable field, matching `facultyAssignment.validation.ts` /
 * `subjectOffering.validation.ts`'s identical reasoning.
 *
 * ── dayOfWeek: local enum, not the generated Prisma enum ────────────────
 * `timetable.types.ts` deliberately declares `DayOfWeek` as a local
 * literal union rather than importing Prisma's generated enum, to keep
 * that file persistence-independent. This validation schema mirrors that
 * same six-value list (`MONDAY`…`SATURDAY`, no `SUNDAY`) rather than
 * importing from `@prisma/client`, for the same reason.
 *
 * ── isCancelled: explicit two-value query coercion ───────────────────────
 * Copied verbatim from `subject.validation.ts`'s `isElective` /
 * `role.validation.ts`'s `isSystemDefined` precedent. `z.coerce.boolean()`
 * is deliberately not used — `Boolean('false')` is `true` in JavaScript, so
 * it would silently misinterpret the literal query string
 * `isCancelled=false` as `true`. Only the two literal strings `'true'` /
 * `'false'` are accepted and explicitly mapped.
 *
 * ── sortBy: explicit allow-list matching ListTimetablesOptions exactly ──
 * `'dayOfWeek' | 'startTime' | 'createdAt' | 'updatedAt'` — the exact union
 * `ListTimetablesOptions['sortBy']` declares. Never `z.string()`: this
 * value will reach a Prisma `orderBy` once `timetable.repository.ts`
 * exists, so an arbitrary client-supplied sort field must never pass
 * validation, matching every sibling list schema's identical reasoning.
 *
 * ── pagination: same bounds as every sibling module ──────────────────────
 * Default page size 20 / max 100, `z.coerce.number()` since Express query
 * params arrive as strings — copied from
 * `facultyAssignment.validation.ts` / `subjectOffering.validation.ts`,
 * with no repository-specific reason found to diverge.
 *
 * ── unknown keys: no .strict() ────────────────────────────────────────────
 * No sibling validation file in this codebase calls `.strict()`; unknown
 * keys are silently stripped by Zod's default object behavior here too,
 * matching every other create/list schema.
 */

// ─────────────────────────────────────────────────────────────────────────
// Create timetable
// ─────────────────────────────────────────────────────────────────────────

const timetableEffectiveFromSchema = z.iso.date();

/**
 * Mirrors CreateTimetableInput exactly: facultyAssignmentId, timeSlotId,
 * roomId are required; effectiveFrom is optional. See file-level comment
 * for why subjectOfferingId/subjectComponentId/semesterCatalogId/
 * academicYearId/dayOfWeek/startTime/endTime are all intentionally absent
 * despite being real Timetable columns, and why effectiveTo/isCancelled
 * are not create-time fields at all.
 */
export const createTimetableBodySchema = z.object({
  facultyAssignmentId: z.uuid('Faculty assignment ID must be a valid UUID'),
  timeSlotId: z.uuid('Time slot ID must be a valid UUID'),
  roomId: z.uuid('Room ID must be a valid UUID'),
  effectiveFrom: timetableEffectiveFromSchema.optional(),
});
export type CreateTimetableBody = z.infer<typeof createTimetableBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Timetable ID params
// ─────────────────────────────────────────────────────────────────────────

export const timetableIdParamsSchema = z.object({
  id: z.uuid('Timetable ID must be a valid UUID'),
});
export type TimetableIdParams = z.infer<typeof timetableIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// List timetables query
// ─────────────────────────────────────────────────────────────────────────

const TIMETABLE_LIST_DEFAULT_PAGE_SIZE = 20;
const TIMETABLE_LIST_MAX_PAGE_SIZE = 100;

/** Mirrors schema.prisma's DayOfWeek enum / timetable.types.ts's DayOfWeek union exactly. */
const TIMETABLE_DAY_OF_WEEK_VALUES = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

/**
 * Copied verbatim from subject.validation.ts's `queryBooleanSchema` /
 * role.validation.ts's `isSystemDefined` precedent — see file-level
 * "isCancelled" note for why z.coerce.boolean() is unsafe here.
 */
const timetableIsCancelledQuerySchema = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

/**
 * Combines ListTimetablesFilters and ListTimetablesOptions into a single
 * query schema, matching every sibling module's identical Filters+Options
 * merge. Every filter is a structural-UUID/enum/boolean check only —
 * whether the referenced rows exist is irrelevant to a list query, it
 * simply returns zero rows, matching every sibling list schema's identical
 * treatment of its own FK filters.
 */
export const listTimetablesQuerySchema = z.object({
  subjectOfferingId: z.uuid('Subject offering ID must be a valid UUID').optional(),
  subjectComponentId: z.uuid('Subject component ID must be a valid UUID').optional(),
  facultyAssignmentId: z.uuid('Faculty assignment ID must be a valid UUID').optional(),
  semesterCatalogId: z.uuid('Semester catalog ID must be a valid UUID').optional(),
  academicYearId: z.uuid('Academic year ID must be a valid UUID').optional(),
  timeSlotId: z.uuid('Time slot ID must be a valid UUID').optional(),
  roomId: z.uuid('Room ID must be a valid UUID').optional(),
  dayOfWeek: z.enum(TIMETABLE_DAY_OF_WEEK_VALUES).optional(),
  isCancelled: timetableIsCancelledQuerySchema.optional(),
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, `Limit must be between 1 and ${TIMETABLE_LIST_MAX_PAGE_SIZE}`)
    .max(
      TIMETABLE_LIST_MAX_PAGE_SIZE,
      `Limit must be between 1 and ${TIMETABLE_LIST_MAX_PAGE_SIZE}`,
    )
    .default(TIMETABLE_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['dayOfWeek', 'startTime', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListTimetablesQuery = z.infer<typeof listTimetablesQuerySchema>;
