// apps/api/src/modules/lectures/lecture.types.ts

import type { SemesterCatalogId } from '../academic/SemesterCatalog/semester.types.js';
import type { AcademicYearId } from '../academic-years/academic-year.types.js';
import type {
  FacultyAssignmentId,
  SubjectComponentId,
} from '../faculty-assignments/facultyAssignment.types.js';
import type { SubjectOfferingId } from '../subject-offerings/subjectOffering.types.js';
import type { RoomId, TimetableId } from '../timetables/timetable.types.js';

/**
 * A Lecture is the ACTUAL DATED OCCURRENCE of a class — the row
 * attendance attaches to:
 *
 *   SubjectOffering -> FacultyAssignment -> Timetable -> Lecture ->
 *     AttendanceSession -> AttendanceRecord
 *
 * Timetable answers "this slot happens every Tuesday 10-11am in Room 204,
 * for as long as effectiveTo is null" — a recurring PATTERN. Lecture
 * answers "the Tuesday 10-11am OS class actually held on 2026-09-22" — a
 * single, dated FACT. One Timetable row produces MANY Lecture rows over a
 * term; this is never modeled one-to-one. The schema confirms it directly:
 * `Timetable.lectures Lecture[]`, and Lecture's own
 * `@@unique([subjectOfferingId, scheduledDate, startTime])` keys on the
 * offering + date + time, NOT on `timetableId`.
 *
 * DENORMALIZED COLUMNS ARE SERVICE-RESOLVED, NOT CLIENT-SUPPLIED. The
 * Prisma model stores `semesterCatalogId`, `academicYearId`, and
 * `facultyUserId` as copies, for the reasons its own comments give: the
 * PostgreSQL `btree_gist` EXCLUDE constraints that reject double-booking
 * need the conflicting value present on the row itself — an exclusion
 * constraint cannot join through `facultyAssignment`/`subjectOffering` at
 * constraint-check time. `facultyUserId` in particular is the actual
 * PERSON, not the assignment row, because one faculty member may hold two
 * different FacultyAssignment rows for different subjects and still
 * double-book themselves. These are persistence-mechanics fields. They
 * appear on the DTO (they are really stored) but never on the create
 * input — exactly the split `CreateTimetableInput` /
 * `CreateTimetablePersistenceInput` already establishes, where the domain
 * input carries three decisions and the repository payload carries ten
 * resolved fields.
 *
 * NOT MODELED HERE: `attendanceSession` is a real Prisma relation FROM
 * Lecture (`AttendanceSession` is `@unique` on `lectureId`), but it
 * belongs to the future attendance module and references a Lecture by
 * `lectureId`. Embedding it would force every ordinary lecture read to
 * load attendance state — the same line `timetable.types.ts` draws
 * against embedding `lectures`, and `facultyAssignment.types.ts` against
 * embedding `timetableEntries`/`lectures`.
 *
 * NO TENANT FIELD. Single-college deployment (see schema.prisma's header
 * comment) — there is no tenant column on any model in this schema, and
 * none is introduced here in anticipation of one.
 *
 * NO ACTOR FIELD. Lecture has no `createdByUserId`/`conductedByUserId`
 * column. The authenticated actor is a separate service parameter
 * (`service.createLecture(actorUserId, input)`), matching every sibling
 * module. `facultyUserId` is the person TEACHING, never the person
 * performing the API call — the two are structurally kept apart by this
 * file's create input not accepting either one.
 */

// Domain aliases / enums

export type LectureId = string;

/**
 * Mirrors schema.prisma's `LectureStatus` enum exactly — three values.
 * Declared as a local literal union rather than imported from the
 * generated Prisma client, matching every other enum mirror in this
 * codebase (`DayOfWeek` in `timetable.types.ts`,
 * `SemesterEnrollmentStatus`, `CurriculumStatus`) so this file stays
 * persistence-independent.
 *
 * Note what is ABSENT: there is no `RESCHEDULED` value. The schema does
 * not model rescheduling as a status, and Lecture has no
 * `rescheduledToLectureId`/`originalLectureId` column to express the link.
 * Moving a class is therefore CANCELLED + a new Lecture row on the new
 * date — which is also the only representation that keeps the original
 * lecture's AttendanceSession historically intact. This file does not
 * invent a fourth status the database cannot store.
 */
export type LectureStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

/**
 * A calendar day in `YYYY-MM-DD` form, with no time and no timezone
 * component — the domain representation of Lecture's `scheduledDate`
 * (`DateTime @db.Date`).
 *
 * This is the FIRST `@db.Date` column in the schema: every other date
 * (`AcademicYear.startDate`, `Admission.admissionDate`,
 * `Timetable.effectiveFrom`) is a plain `DateTime` representing a real
 * instant, and is correctly serialized as a full ISO 8601 string by its
 * mapper. There is therefore no existing convention to copy for a
 * calendar-only value, and reusing the full-timestamp convention would be
 * wrong in the same way `timetable.mapper.ts` already identifies for
 * `@db.Time`: it formats `startTime`/`endTime` as `HH:mm` rather than
 * ISO-serializing them, "since they represent a time of day, not a point
 * in time." A lecture date is a day, not an instant — "2026-09-22", not
 * "2026-09-22T00:00:00.000Z", which would silently acquire a timezone
 * and shift across the date boundary for any consumer east or west of
 * UTC.
 *
 * This alias exists to make that contract explicit at every use site. It
 * is a documentation device, not a validated/branded type — enforcement
 * of the format belongs to `lecture.validation.ts`, and conversion to and
 * from `Date` belongs to `lecture.mapper.ts` / the service. No timezone
 * arithmetic happens in this file.
 */
export type CalendarDate = string;

/**
 * A wall-clock time of day in `HH:mm` form, matching exactly what
 * `timetable.mapper.ts` already produces for `@db.Time` columns via its
 * `formatTimeOnly` helper (UTC accessors, so the result is independent of
 * the server process's local timezone). Lecture's `startTime`/`endTime`
 * are `@db.Time`, the same as Timetable's, and are represented
 * identically.
 */
export type TimeOfDay = string;

// Create Lecture

/**
 * Fields a caller may supply when creating a Lecture. `id`, `createdAt`,
 * `updatedAt` are database-generated and excluded, matching every sibling
 * `Create*Input`.
 *
 * Exactly TWO decisions are genuinely the caller's: WHICH recurring
 * pattern this session realizes (`timetableId`) and WHICH day it occurs
 * on (`scheduledDate`). Everything else the Prisma row stores —
 * `subjectOfferingId`, `subjectComponentId`, `facultyAssignmentId`,
 * `facultyUserId`, `roomId`, `startTime`, `endTime`,
 * `semesterCatalogId`, `academicYearId` — is fully determined by the
 * referenced Timetable row and is copied by the service at write time,
 * precisely as `CreateTimetableInput` accepts three ids and
 * `CreateTimetablePersistenceInput` carries the seven fields the service
 * resolved from them.
 *
 * ONE SOURCE OF TRUTH FOR SCHEDULE DATA. Accepting `roomId` or
 * `startTime` here would let a caller create a Lecture whose room or time
 * disagrees with the Timetable it claims to realize, with nothing in the
 * schema to reject the contradiction — the EXCLUDE constraints prevent
 * OVERLAP, not DISAGREEMENT. The Timetable is authoritative for all of
 * it; if the room or time genuinely differs, the Timetable row is closed
 * (`effectiveTo`) and a new one opened, which is the schema's own
 * documented mechanism ("row is closed, never edited in place").
 *
 * `status` is excluded. The schema defaults it to `SCHEDULED`, and every
 * lecture is created scheduled with no exception — a caller must never be
 * able to create a row already `COMPLETED` (which would imply teaching
 * that never happened) or already `CANCELLED`. This mirrors
 * `CreateTimetableInput` excluding `isCancelled` and
 * `CreateSemesterEnrollmentInput` excluding `status` for the identical
 * reason.
 *
 * `timetableId` is REQUIRED here even though the column is nullable. The
 * schema's comment explains the nullability: "timetableId is nullable so
 * an ad-hoc extra class doesn't need a fake recurring pattern behind
 * it." An ad-hoc lecture is a materially different operation — with no
 * Timetable to resolve from, the caller would have to supply
 * `facultyAssignmentId`, `roomId`, `startTime`, and `endTime` directly,
 * which is a second, wider input shape. No service operation for that
 * exists yet, and this file does not speculatively define its contract —
 * the same restraint `timetable.repository.ts` documents for the
 * conflict-check helpers it declines to add ahead of a consumer. When an
 * ad-hoc creation operation is specified, add a sibling
 * `CreateAdHocLectureInput` rather than loosening this one into a shape
 * where the derived fields are "sometimes required".
 *
 * The `@@unique([subjectOfferingId, scheduledDate, startTime])`
 * constraint is not re-expressed as a type — this file describes the
 * shape of a valid request, not the repository's duplicate-check
 * behavior. Note that the constraint keys on the resolved
 * `subjectOfferingId`/`startTime`, not on the `timetableId` the caller
 * passes, so two different Timetable rows for the same offering cannot
 * produce two lectures at the same instant on the same day.
 */
export interface CreateLectureInput {
  readonly timetableId: TimetableId;
  readonly scheduledDate: CalendarDate;
}

/**
 * No `UpdateLectureInput` is defined.
 *
 * Every field on this model is either an identity/context field or a
 * lifecycle field; there is no administrative attribute (no `topic`,
 * `notes`, `remarks`) left over for a generic PATCH to touch — the same
 * situation `facultyAssignment.types.ts` and `subjectOffering.types.ts`
 * document for their own absent update inputs.
 *
 * The identity fields must stay immutable because attendance already
 * depends on them. `AttendanceSession.lectureId` is `@unique` with
 * `onDelete: Cascade`, and `AttendanceRecord` hangs off that session.
 * Rewriting `scheduledDate`, `roomId`, `facultyAssignmentId`, or
 * `subjectOfferingId` after attendance exists would retroactively change
 * which session a student's attendance record is understood to describe,
 * with no schema-level guard against it. Attendance correctness is
 * historical correctness; the Lecture identity it points at must not move
 * underneath it.
 *
 * `status` is the only remaining field, and it is deliberately not
 * exposed as `{ status?: LectureStatus }`. The transitions are not
 * free-form: SCHEDULED -> COMPLETED is a claim that teaching occurred and
 * belongs with the attendance workflow; SCHEDULED -> CANCELLED is a claim
 * that it did not; COMPLETED -> SCHEDULED is not a meaningful operation
 * at all. A generic `PATCH /lectures/:id { status }` would permit every
 * one of those equally. These belong as dedicated service operations
 * (`cancelLecture(actorUserId, id)` / `completeLecture(actorUserId,
 * id)`), matching how `semesterEnrollment.types.ts` refuses to expose its
 * own status outside the promotion workflow that owns it.
 *
 * No `CancelLectureInput`/`CompleteLectureInput` is defined either. The
 * Prisma model has no `cancellationReason`, `cancelledAt`, or
 * `completedAt` column — those operations carry no payload beyond the
 * lecture id and the actor, so there is no shape to type. If a
 * cancellation reason is later required, it needs a schema column first;
 * defining the input type ahead of the column it would write to would
 * document an assumption as a fact.
 */

// Lecture DTO

/**
 * The API-safe representation of a Lecture row. Deliberately NOT the
 * Prisma model — `timetable`, `subjectOffering`, `subjectComponent`,
 * `facultyAssignment`, `facultyUser`, `room`, `semesterCatalog`,
 * `academicYear`, and `attendanceSession` are all represented as plain
 * ids or omitted, matching every sibling DTO's convention of never
 * embedding relations. This DTO can always be constructed from a bare
 * `prisma.lecture.findUnique(...)` / `findMany` row with no `include`.
 *
 * The denormalized columns (`semesterCatalogId`, `academicYearId`,
 * `facultyUserId`) ARE exposed, for the same reason `TimetableDTO`
 * exposes its own denormalized `dayOfWeek`/`startTime`/`endTime`: this
 * DTO reflects what is actually stored, not just what is minimally
 * necessary to reconstruct it. `facultyUserId` in particular is the field
 * a client needs to answer "whose lecture is this" without a second
 * round-trip through `facultyAssignmentId`.
 *
 * `timetableId` is `TimetableId | null`, not `TimetableId | undefined` —
 * the Prisma column is nullable (`String?`), not optional-on-write. A
 * serialized Lecture always HAS this key; a null value means an ad-hoc
 * session with no recurring pattern behind it. This mirrors
 * `TimetableDTO.effectiveTo`'s identical treatment.
 *
 * `scheduledDate` is `YYYY-MM-DD` and `startTime`/`endTime` are `HH:mm`
 * — see the `CalendarDate`/`TimeOfDay` comments. `createdAt`/`updatedAt`
 * are full ISO 8601 strings, matching every sibling DTO, because those
 * genuinely are instants.
 */
export interface LectureDTO {
  readonly id: LectureId;
  readonly timetableId: TimetableId | null;
  readonly subjectOfferingId: SubjectOfferingId;
  readonly subjectComponentId: SubjectComponentId;
  readonly facultyAssignmentId: FacultyAssignmentId;
  readonly facultyUserId: string;
  readonly semesterCatalogId: SemesterCatalogId;
  readonly academicYearId: AcademicYearId;
  readonly roomId: RoomId;
  readonly scheduledDate: CalendarDate;
  readonly startTime: TimeOfDay;
  readonly endTime: TimeOfDay;
  readonly status: LectureStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// List filters

/**
 * Filtering only — pagination/sorting live in `ListLecturesOptions`,
 * matching the Filters/Options split used by every sibling module.
 *
 * Every field here is a real, direct column on `Lecture`. No
 * `subjectId`/`programId`/`departmentId`/`facultyName`/`subjectName` —
 * none are stored on this model, and adding them would imply a join this
 * module's repository does not establish, exactly the line
 * `ListTimetablesFilters` and `ListFacultyAssignmentsFilters` already
 * draw. No `search` — Lecture has no own string field to match against.
 *
 * `facultyUserId` is included alongside `facultyAssignmentId` and is not
 * redundant with it: "every lecture Dr. Sharma teaches this week, across
 * all her subjects" is a different query from "every lecture for this one
 * (offering, component) assignment", and only the denormalized person
 * column can answer the first in a single predicate. It has no dedicated
 * index, but neither do `ListTimetablesFilters`' `dayOfWeek`/
 * `isCancelled`; it is a plain equality filter on a real own column and
 * is, in practice, always paired with a date range below.
 *
 * DATE RANGE, NOT EXACT DATE. `fromDate`/`toDate` are inclusive bounds on
 * `scheduledDate`; an exact-day query is expressed by setting both to the
 * same value, so no separate `scheduledDate` equality filter is offered
 * (two filters for one column would let a caller supply contradictory
 * predicates). This is the one place this file goes beyond existing
 * sibling precedent, and it is schema-derived rather than speculative:
 * BOTH of Lecture's compound indexes —
 * `@@index([facultyAssignmentId, scheduledDate])` and
 * `@@index([semesterCatalogId, scheduledDate])` — place `scheduledDate`
 * in second position, which is the shape of an index built for a range
 * scan under an equality prefix, not for equality on the date alone. No
 * sibling module establishes a range filter because no sibling model has
 * a dated-occurrence column; Lecture is the first, and "the week's
 * timetable for this cohort" is its defining query. The bounds translate
 * to a single `scheduledDate: { gte, lte }` clause, well within the
 * spread-conditional `where`-building pattern
 * `timetable.repository.ts` already uses.
 */
export interface ListLecturesFilters {
  readonly timetableId?: TimetableId;
  readonly subjectOfferingId?: SubjectOfferingId;
  readonly subjectComponentId?: SubjectComponentId;
  readonly facultyAssignmentId?: FacultyAssignmentId;
  readonly facultyUserId?: string;
  readonly semesterCatalogId?: SemesterCatalogId;
  readonly academicYearId?: AcademicYearId;
  readonly roomId?: RoomId;
  readonly status?: LectureStatus;
  readonly fromDate?: CalendarDate;
  readonly toDate?: CalendarDate;
}

// List options

/**
 * Pagination + sort options, mirroring every sibling `List*Options`.
 *
 * `sortBy` is restricted to Lecture's own genuine non-FK scalars:
 * `scheduledDate` + `startTime` (the natural chronological reading order
 * of an occurrence log, and the same pair
 * `@@unique([subjectOfferingId, scheduledDate, startTime])` uses to
 * identify a session) plus `createdAt`/`updatedAt` for the
 * administrative ordering every sibling module also offers. This is the
 * direct analogue of `ListTimetablesOptions`' `dayOfWeek`/`startTime`
 * pair — a Timetable is ordered by weekday because it recurs; a Lecture
 * is ordered by date because it does not.
 *
 * `status` is excluded as a sort key — an enum whose declaration order
 * (SCHEDULED/COMPLETED/CANCELLED) carries no ordering meaning. FK fields
 * are excluded for the same "not a meaningful ordering" reason every
 * sibling `List*Options` gives.
 *
 * The repository is expected to append `id` as a secondary key after the
 * chosen primary sort, matching `timetable.repository.ts`'s existing
 * tiebreaker shape — necessary here in particular, since many lectures
 * legitimately share one `scheduledDate`.
 */
export interface ListLecturesOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'scheduledDate' | 'startTime' | 'createdAt' | 'updatedAt';
  readonly sortOrder: 'asc' | 'desc';
}

// List result

/**
 * API-level list result — `LectureDTO[]`, not the persistence-level row
 * shape. Matching `TimetableListQueryResult`/`SubjectOfferingListQueryResult`,
 * the raw-row equivalent of this type belongs in the future
 * `lecture.repository.ts`, not here — this file only defines the
 * API-facing contract.
 */
export interface ListLecturesResult {
  readonly lectures: readonly LectureDTO[];
  readonly total: number;
}
