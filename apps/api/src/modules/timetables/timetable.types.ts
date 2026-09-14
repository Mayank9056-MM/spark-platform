// apps/api/src/modules/timetable/timetable.types.ts

import type { SemesterCatalogId } from '../academic/SemesterCatalog/semester.types.js';
import type { AcademicYearId } from '../academic-years/academic-year.types.js';
import type {
  FacultyAssignmentId,
  SubjectComponentId,
} from '../faculty-assignments/facultyAssignment.types.js';
import type { SubjectOfferingId } from '../subject-offerings/subjectOffering.types.js';

// IDs

export type TimetableId = string;

/** See the file-level comment: no `rooms/` module exists yet. */
export type RoomId = string;

/** See the file-level comment: no `time-slots/` module exists yet. */
export type TimeSlotId = string;

// Day of week

/**
 * Mirrors schema.prisma's `DayOfWeek` enum exactly — six values,
 * deliberately no `SUNDAY`. Declared as a local literal union rather than
 * imported from the generated Prisma client, matching every other enum
 * mirror in this codebase (`CurriculumStatus`, `SemesterEnrollmentStatus`,
 * etc.) so this file stays persistence-independent. A finite set, not a
 * free-form string — there is no "Holiday"/"Working Day" value in the
 * domain.
 */
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';

// DTO

/**
 * The API-safe representation of a Timetable row. Deliberately NOT the
 * Prisma model — `subjectOffering`, `semesterCatalog`, `academicYear`,
 * `subjectComponent`, `facultyAssignment`, `timeSlot`, `room`, and
 * `lectures` are all represented as plain ids or omitted, matching every
 * sibling DTO's convention of never embedding relations. This DTO can
 * always be constructed from a bare `prisma.timetable.findUnique(...)` /
 * `findMany` row with no `include`.
 *
 * `subjectOfferingId`/`subjectComponentId`/`semesterCatalogId`/
 * `academicYearId`/`dayOfWeek`/`startTime`/`endTime` are all real,
 * persisted columns the model already has (see the file-level comment
 * for why each exists) — exposed here even though several are derivable
 * through `facultyAssignmentId`/`timeSlotId`, because this DTO reflects
 * what is actually stored, not just what is minimally necessary to
 * reconstruct it.
 *
 * `effectiveTo` is `string | null`, not `string | undefined` — the
 * Prisma column is nullable (`DateTime?`), not optional-on-write. A
 * serialized Timetable row always HAS this key; a null value means the
 * row is still in effect (never closed).
 */
export interface TimetableDTO {
  readonly id: TimetableId;
  readonly subjectOfferingId: SubjectOfferingId;
  readonly subjectComponentId: SubjectComponentId;
  readonly facultyAssignmentId: FacultyAssignmentId;
  readonly semesterCatalogId: SemesterCatalogId;
  readonly academicYearId: AcademicYearId;
  readonly timeSlotId: TimeSlotId;
  readonly roomId: RoomId;
  readonly dayOfWeek: DayOfWeek;
  readonly startTime: string;
  readonly endTime: string;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly isCancelled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// Create

/**
 * Fields a caller may supply when scheduling a Timetable entry. `id`,
 * `createdAt`, `updatedAt` are database-generated and excluded, matching
 * every sibling `Create*Input`.
 *
 * Only three identity decisions are genuinely independent: WHICH teaching
 * assignment (`facultyAssignmentId`), WHICH recurring weekly slot
 * (`timeSlotId`), and WHICH room (`roomId`) — none of these three can be
 * derived from either of the others. Everything else the Prisma model
 * stores (`subjectOfferingId`, `subjectComponentId`, `semesterCatalogId`,
 * `academicYearId`, `dayOfWeek`, `startTime`, `endTime`) is fully
 * determined by these three and is copied by the service from the
 * referenced `FacultyAssignment`/`SubjectOffering`/`TimeSlot` rows at
 * write time — see the file-level comment for why accepting them
 * independently here would risk exactly the inconsistent data this
 * module's chain is meant to prevent.
 *
 * `effectiveFrom` is optional, matching the schema's `@default(now())` —
 * an admin scheduling a change ahead of time may want to backdate/
 * postdate when it takes effect, the same "has a real default, nothing
 * marks it protected" reasoning `CreateCurriculumVersionInput`-style
 * inputs elsewhere in this codebase use for their own optional,
 * DB-defaulted fields. `effectiveTo` is excluded entirely — a newly
 * created row is, by definition, not yet closed; closing is a later,
 * dedicated lifecycle action (see the file-level comment), not a
 * create-time value. `isCancelled` is excluded for the same reason:
 * every entry is created active, and cancelling is a dedicated future
 * action, not a create-time flag — mirroring how `CreateCurriculumVersionInput`
 * excludes `status` because "every version is created DRAFT, with no
 * exception."
 */
export interface CreateTimetableInput {
  readonly facultyAssignmentId: FacultyAssignmentId;
  readonly timeSlotId: TimeSlotId;
  readonly roomId: RoomId;
  readonly effectiveFrom?: string;
}

// Filters

/**
 * Filtering only — pagination/sorting live in `ListTimetablesOptions`,
 * matching the Filters/Options split used by every sibling module.
 *
 * Every field here is a real, direct column on `Timetable` — no
 * `departmentId`/`programId`/`facultyName`/`subjectName` filter, since
 * none of those are stored on this model and adding them would imply a
 * join this module's future repository does not establish (matching
 * `ListSubjectOfferingsFilters`'/`ListFacultyAssignmentsFilters`'
 * identical line-drawing). `subjectOfferingId` has its own
 * `@@index`; `timeSlotId`+`roomId` and `semesterCatalogId`+
 * `academicYearId` are each backed by a compound `@@index`.
 * `subjectComponentId`, `facultyAssignmentId`, `dayOfWeek`, and
 * `isCancelled` have no dedicated index but are plain equality filters
 * on real, low-cardinality own-columns — the same class of filter
 * `ListSubjectsFilters.isElective` already establishes precedent for
 * elsewhere in this codebase.
 */
export interface ListTimetablesFilters {
  readonly subjectOfferingId?: SubjectOfferingId;
  readonly subjectComponentId?: SubjectComponentId;
  readonly facultyAssignmentId?: FacultyAssignmentId;
  readonly semesterCatalogId?: SemesterCatalogId;
  readonly academicYearId?: AcademicYearId;
  readonly timeSlotId?: TimeSlotId;
  readonly roomId?: RoomId;
  readonly dayOfWeek?: DayOfWeek;
  readonly isCancelled?: boolean;
}

// Options

/**
 * Pagination + sort options, mirroring every sibling `List*Options`.
 * `sortBy` is restricted to `Timetable`'s own genuine scalar fields:
 * `dayOfWeek` + `startTime` (the natural chronological reading order of
 * a schedule — Monday before Tuesday, 9am before 11am) plus `createdAt`/
 * `updatedAt` for the administrative ordering every sibling module also
 * offers. FK fields (`facultyAssignmentId`, `roomId`, etc.) are excluded
 * as sort keys — not a meaningful ordering, matching every sibling
 * `List*Options`' identical exclusion of its own FK fields.
 */
export interface ListTimetablesOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'dayOfWeek' | 'startTime' | 'createdAt' | 'updatedAt';
  readonly sortOrder: 'asc' | 'desc';
}

// Result

/**
 * API-level list result — `TimetableDTO[]`, not the persistence-level
 * row shape. Matching `SubjectOfferingListQueryResult`/
 * `FacultyAssignmentListQueryResult`, the raw-row equivalent of this type
 * belongs in the future `timetable.repository.ts`, not here — this file
 * only defines the API-facing contract.
 */
export interface ListTimetablesResult {
  readonly timetables: readonly TimetableDTO[];
  readonly total: number;
}
