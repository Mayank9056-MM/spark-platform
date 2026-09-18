// apps/api/src/modules/attendance/attendance.types.ts

import type { LectureId } from '../lectures/lecture.types.js';
import type { SemesterEnrollmentId } from '../semester-enrollments/semesterEnrollment.types.js';

/**
 * Attendance attaches to the ACTUAL DATED OCCURRENCE of a class, not to
 * the recurring pattern that produced it:
 *
 *   Timetable -> Lecture -> AttendanceSession -> AttendanceRecord ->
 *     SemesterEnrollment
 *
 * AttendanceSession is the attendance-taking event for exactly one
 * Lecture — `AttendanceSession.lectureId` is `@unique`, so the domain is
 * Lecture 1 -> (0 or 1) AttendanceSession, never many. This file therefore
 * references a Lecture only by `lectureId`; it does NOT reach through to
 * `timetableId`, matching `lecture.types.ts`'s own line against embedding
 * `attendanceSession` in `LectureDTO` — the dependency runs Lecture ->
 * AttendanceSession, never AttendanceSession -> Timetable directly.
 *
 * AttendanceRecord is one student's attendance status for one
 * AttendanceSession, and references the student's SemesterEnrollment —
 * `@@unique([attendanceSessionId, semesterEnrollmentId])` — never a bare
 * User/student id. There is no separate Student entity anywhere in this
 * schema; "the student" is reached the same way `AssignmentSubmission`
 * reaches them, through their current-term SemesterEnrollment.
 *
 * SEMESTER-CONTEXT AGREEMENT IS A SERVICE INVARIANT, NOT A TYPE. The
 * schema cannot enforce that a SemesterEnrollment's
 * `(semesterCatalogId, academicYearId)` matches the Lecture's own copies
 * of those fields — two independent join paths, the same class of
 * multi-hop check `lecture.types.ts` and `schema.prisma` document for
 * Lecture's own `subjectComponent`/`facultyAssignment` agreement. This
 * file does not add denormalized `semesterCatalogId`/`academicYearId`
 * fields to `AttendanceRecordDTO` or its inputs to "help" express that
 * invariant — doing so would create a second source of truth the service
 * would then have to keep in sync, exactly what `semesterEnrollment.types.ts`
 * warns against for its own semester-number field.
 *
 * NO UserId TYPE. As `promotion.types.ts` establishes, there is no
 * canonical `UserId` type in this codebase — every user reference
 * (`takenByUserId`, `markedByUserId`, `correctedByUserId`) is a plain
 * `string`, matching `LectureDTO.facultyUserId` and
 * `PromotionBatchDTO.initiatedByUserId`.
 *
 * ACTOR IDENTITY IS NEVER A CLIENT-SUPPLIED FIELD. Every sibling module's
 * create input excludes the authenticated actor — `lecture.controller.ts`
 * reads `actorUserId` from `req.user` and passes it as its own service
 * parameter, never as part of the request body type. `takenByUserId` and
 * `markedByUserId` follow that pattern exactly: the person opening a
 * session or marking a record is the authenticated caller, not a value
 * the client declares. This is a genuine security boundary — without it,
 * any caller could attribute attendance-taking to an arbitrary other
 * user.
 *
 * LIFECYCLE IS OPEN -> LOCKED ONLY. `schema.prisma`'s
 * `AttendanceSessionStatus` has exactly two values. There is no
 * SUBMITTED/CLOSED/CANCELLED/REOPENED state, and none is introduced
 * here.
 *
 * NO SPECULATIVE FEATURES. This file models exactly what
 * `AttendanceSession`/`AttendanceRecord` store today. It does not
 * introduce types for QR/biometric/GPS attendance, correction-approval
 * workflows, attendance analytics/percentage reporting, or any other
 * capability the schema does not yet back with a column — matching the
 * restraint `lecture.types.ts` documents for its own declined ad-hoc
 * creation shape.
 */

// Domain ID aliases

export type AttendanceSessionId = string;
export type AttendanceRecordId = string;

// Domain status types

/**
 * Mirrors schema.prisma's `AttendanceSessionStatus` enum exactly — two
 * values. Declared as a local literal union rather than imported from
 * the generated Prisma client, matching every other enum mirror in this
 * codebase (`LectureStatus`, `DayOfWeek`, `SemesterEnrollmentStatus`) so
 * this file stays persistence-independent.
 */
export type AttendanceSessionStatus = 'OPEN' | 'LOCKED';

/**
 * Mirrors schema.prisma's `AttendanceStatus` enum exactly — four values.
 * Same local-literal-union convention as `AttendanceSessionStatus` above.
 */
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

// AttendanceSession DTO

/**
 * The API-safe representation of an AttendanceSession row. Deliberately
 * NOT the Prisma model — `lecture`, `takenBy`, and `records` relations
 * are all omitted, matching every sibling DTO's convention of never
 * embedding relations. This DTO can always be constructed from a bare
 * `prisma.attendanceSession.findUnique(...)` / `findMany` row with no
 * `include`. In particular, `records` is NOT nested here: an ordinary
 * session lookup must never force loading every student's attendance
 * row for it, the same line `SemesterEnrollmentDTO` draws against
 * embedding its own `attendanceRecords`.
 *
 * `lockedAt` is `string | null`, not `string | undefined` — the Prisma
 * column is nullable (`DateTime?`), not optional-on-write. A serialized
 * session always HAS this key; a null value means the session has never
 * been locked, matching `TimetableDTO.effectiveTo`'s identical
 * always-present-but-nullable treatment.
 *
 * `takenByUserId` is a plain `string` — see the module header on why no
 * `UserId` type exists in this codebase.
 */
export interface AttendanceSessionDTO {
  readonly id: AttendanceSessionId;
  readonly lectureId: LectureId;
  readonly takenByUserId: string;
  readonly status: AttendanceSessionStatus;
  readonly lockedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// Create AttendanceSession

/**
 * Fields a caller may supply when opening an AttendanceSession. `id`,
 * `createdAt`, `updatedAt` are database-generated and excluded, matching
 * every sibling `Create*Input`.
 *
 * `takenByUserId` is EXCLUDED — see the module header. The service
 * receives it as a separate `actorUserId` parameter
 * (`service.openSession(actorUserId, input)`), derived from the
 * authenticated request context, never from the request body. A client
 * must never be able to declare "attendance was taken by this other
 * user."
 *
 * `status` is excluded, not merely defaulted — the schema defaults it to
 * `OPEN`, and every session is opened `OPEN` with no exception, matching
 * `CreateLectureInput` excluding `status` for the identical reason
 * (`SCHEDULED` is the only valid creation state). `lockedAt` is excluded
 * for the same reason a newly opened session is, by definition, not yet
 * locked.
 *
 * The one genuine caller decision is WHICH Lecture this session is for.
 * The service is responsible for enforcing the
 * `AttendanceSession.lectureId @unique` invariant (one session per
 * lecture) at write time — not expressible as a TypeScript type, and not
 * attempted here.
 */
export interface CreateAttendanceSessionInput {
  readonly lectureId: LectureId;
}

/**
 * No `UpdateAttendanceSessionInput` is defined.
 *
 * `lectureId` and `takenByUserId` must stay immutable after creation —
 * every `AttendanceRecord` under this session is understood to describe
 * attendance for this specific lecture, taken by this specific actor;
 * rewriting either afterward would retroactively change that historical
 * fact, the same reasoning `lecture.types.ts` gives for its own
 * immutable identity fields.
 *
 * `status`/`lockedAt` are the only remaining fields, and the transition
 * between them is not free-form: OPEN -> LOCKED is a dedicated lifecycle
 * action (`lockSession(actorUserId, id)`) with no payload beyond the
 * session id and the actor — the schema has no `lockReason` or similar
 * column, so there is no request body to type. This mirrors
 * `lecture.types.ts` declining a `CancelLectureInput`/
 * `CompleteLectureInput` for the identical "no payload beyond id + actor"
 * reason. A generic `PATCH /attendance-sessions/:id { status }` is not
 * exposed, since the lifecycle only ever moves one direction — there is
 * no REOPENED value to transition back to (see the module header).
 */

// AttendanceRecord DTO

/**
 * The API-safe representation of an AttendanceRecord row. Deliberately
 * NOT the Prisma model — `attendanceSession`, `semesterEnrollment`,
 * `markedBy`, and `correctedBy` relations are all represented as plain
 * ids, matching every sibling DTO's convention.
 *
 * `correctedAt`/`correctionReason`/`correctedByUserId` are each
 * `T | null`, never optional — all three columns are nullable
 * (`DateTime?`/`String?`/`String?`), not optional-on-write, and a
 * serialized record always HAS all three keys. A `null` triple means
 * "never corrected" (the common case — the schema's own comment notes
 * `correctedByUserId` is "nullable because most records are never
 * corrected"). This preserves the semantic split the module requires:
 * original marking (`status`, `markedByUserId`) is never conditionally
 * present, while correction metadata is present-but-null until a
 * correction actually happens — it is not omitted the way an unset
 * optional *input* field would be.
 *
 * `markedByUserId`/`correctedByUserId` are plain `string`/`string |
 * null` — see the module header on why no `UserId` type exists.
 */
export interface AttendanceRecordDTO {
  readonly id: AttendanceRecordId;
  readonly attendanceSessionId: AttendanceSessionId;
  readonly semesterEnrollmentId: SemesterEnrollmentId;
  readonly status: AttendanceStatus;
  readonly markedByUserId: string;
  readonly correctedAt: string | null;
  readonly correctionReason: string | null;
  readonly correctedByUserId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// Bulk attendance marking

/**
 * One student's attendance decision within a bulk-marking operation.
 * Deliberately minimal — exactly the two facts the client actually
 * decides.
 *
 * `attendanceSessionId` is NOT repeated here — it is supplied once on
 * the enclosing `BulkMarkAttendanceInput`, not per record, so a single
 * bulk request cannot accidentally mix records for two different
 * sessions. This mirrors `CreatePromotionDecisionInput` excluding
 * `promotionBatchId` because the parent id is supplied by the enclosing
 * route/request context rather than duplicated per item.
 *
 * `markedByUserId` is EXCLUDED — server/actor-derived, same reasoning as
 * `CreateAttendanceSessionInput.takenByUserId` above; every record in one
 * bulk request is marked by the same authenticated actor.
 *
 * Supplying a `semesterEnrollmentId` here is client INTENT, not proof of
 * eligibility — the service must still verify the referenced
 * SemesterEnrollment belongs to the Lecture's academic context
 * (`semesterCatalogId`/`academicYearId`) before writing a record; this
 * type does not and cannot establish that on its own (see the module
 * header).
 */
export interface MarkAttendanceRecordInput {
  readonly semesterEnrollmentId: SemesterEnrollmentId;
  readonly status: AttendanceStatus;
}

/**
 * Marks attendance for multiple students against one AttendanceSession
 * in a single operation — the normal way attendance is taken (one
 * faculty member marking an entire class roster at once), not a
 * per-student endpoint. No separate single-record `MarkAttendanceInput`
 * is defined alongside this one; a single student is simply a
 * one-element `records` array, avoiding two nearly identical types with
 * no distinct consumer.
 *
 * The service is expected to process `records` transactionally: either
 * every record in the batch is written, or none are, so a partial
 * roster is never persisted on failure. This type only describes the
 * request shape — the transaction itself is `attendance.service.ts`'s
 * concern.
 *
 * Duplicate protection (`@@unique([attendanceSessionId,
 * semesterEnrollmentId])`) and the OPEN/LOCKED lifecycle gate
 * ("attendance mutation is restricted once locked") are both runtime
 * invariants the service enforces before/while writing — not
 * type-level constraints on `records`.
 */
export interface BulkMarkAttendanceInput {
  readonly attendanceSessionId: AttendanceSessionId;
  readonly records: readonly MarkAttendanceRecordInput[];
}

// Attendance correction

/**
 * Fields a caller may supply when correcting an already-marked
 * AttendanceRecord. A dedicated operation, not a generic update — see
 * "no UpdateAttendanceRecordInput" below.
 *
 * `correctionReason` is REQUIRED here, not optional. The schema carries
 * a DB CHECK constraint that `correctedAt` and `correctionReason` are
 * both set or both null together (`schema.prisma`'s comment on
 * `AttendanceRecord`). Since invoking this operation always results in
 * the service setting `correctedAt`, a request that omitted
 * `correctionReason` would produce a row the database itself rejects —
 * so, unlike `CreatePromotionDecisionInput.remarks` (which has no such
 * paired constraint and is genuinely optional), this field cannot be
 * optional here.
 *
 * `correctedAt` and `correctedByUserId` are EXCLUDED — both are
 * server-derived at the moment of correction (`correctedAt` from
 * `now()`, `correctedByUserId` from the authenticated `actorUserId`
 * service parameter), matching the actor-identity exclusions elsewhere
 * in this file. A client declaring either would let it forge who made a
 * correction and when — exactly the audit-integrity concern the schema
 * comment on `correctedByUserId` calls out ("who made it must be
 * independently attributable from who marked it originally").
 *
 * The record being corrected is identified by route/service context
 * (an `attendanceRecordId` parameter), not a field on this input,
 * matching how `promotionBatchId` is kept off
 * `CreatePromotionDecisionInput` for the same reason.
 */
export interface CorrectAttendanceRecordInput {
  readonly status: AttendanceStatus;
  readonly correctionReason: string;
}

/**
 * No `UpdateAttendanceRecordInput` is defined.
 *
 * `attendanceSessionId`/`semesterEnrollmentId` must stay immutable —
 * rewriting either would retroactively change which session or which
 * student's enrollment a record describes, the same "historical
 * correctness" reasoning `lecture.types.ts` gives for its own immutable
 * identity fields.
 *
 * `status` is the only remaining mutable-looking field, and it is
 * deliberately NOT exposed as a generic `{ status?: AttendanceStatus }`
 * PATCH. Every change to `status` after the original marking is, by
 * definition, a correction — the schema has no separate "just edit the
 * status" path that skips `correctedAt`/`correctionReason`/
 * `correctedByUserId`. `CorrectAttendanceRecordInput` above is that one
 * legitimate path; a bare update input would let a caller silently
 * change attendance history with no audit trail, which is exactly what
 * the correction columns exist to prevent.
 */

// List filters — AttendanceSession

/**
 * Filtering only — pagination/sorting live in
 * `ListAttendanceSessionsOptions`, matching the Filters/Options split
 * used by every sibling module.
 *
 * `lectureId` is covered by the schema's own `@unique` index; a lookup
 * by it will normally return at most one row, but the filter is still
 * offered here (rather than a dedicated `getByLectureId`-only contract)
 * for consistency with every other id filter in this file. `takenByUserId`
 * and `status` are both real, direct columns with no dedicated index —
 * the same class of unindexed-but-legitimate equality filter
 * `ListLecturesFilters.facultyUserId` already establishes precedent for.
 * No `search` — AttendanceSession has no own string field to match
 * against.
 */
export interface ListAttendanceSessionsFilters {
  readonly lectureId?: LectureId;
  readonly takenByUserId?: string;
  readonly status?: AttendanceSessionStatus;
}

/**
 * Pagination + sort options, mirroring every sibling `ListXOptions`.
 * `sortBy` includes `lockedAt` alongside `createdAt`/`updatedAt` as
 * AttendanceSession's own genuine nullable timestamp field ("most
 * recently locked sessions first"), the same inclusion
 * `ListPromotionBatchesOptions` makes for its own nullable
 * `finalizedAt`. `status` is excluded as a sort key — an enum with only
 * two values and no ordering meaning beyond its own declaration order,
 * matching every sibling `List*Options`' identical exclusion of its own
 * status/enum fields.
 */
export interface ListAttendanceSessionsOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'createdAt' | 'updatedAt' | 'lockedAt';
  readonly sortOrder: 'asc' | 'desc';
}

export interface ListAttendanceSessionsResult {
  readonly attendanceSessions: readonly AttendanceSessionDTO[];
  readonly total: number;
}

// List filters — AttendanceRecord

/**
 * Filtering only — pagination/sorting live in
 * `ListAttendanceRecordsOptions`, matching the Filters/Options split
 * used by every sibling module.
 *
 * `attendanceSessionId` and `semesterEnrollmentId` together are the
 * schema's own `@@unique([attendanceSessionId, semesterEnrollmentId])`;
 * `semesterEnrollmentId` + `status` is the schema's own
 * `@@index([semesterEnrollmentId, status])` — "this student's attendance
 * history, optionally narrowed to one status" is this module's defining
 * query, the same way `scheduledDate` range filtering is Lecture's.
 * `markedByUserId` and `correctedByUserId` have no dedicated index but
 * are plain equality filters on real own columns, the same class
 * `ListLecturesFilters.facultyUserId` and
 * `ListPromotionDecisionsFilters.outcome` already establish precedent
 * for. No `search` — AttendanceRecord has no own string field to match
 * against.
 */
export interface ListAttendanceRecordsFilters {
  readonly attendanceSessionId?: AttendanceSessionId;
  readonly semesterEnrollmentId?: SemesterEnrollmentId;
  readonly status?: AttendanceStatus;
  readonly markedByUserId?: string;
  readonly correctedByUserId?: string;
}

/**
 * Pagination + sort options, mirroring every sibling `ListXOptions`.
 * `sortBy` includes `correctedAt` alongside `createdAt`/`updatedAt` as
 * AttendanceRecord's own genuine nullable timestamp field, the same
 * inclusion `ListAttendanceSessionsOptions` makes for `lockedAt` above.
 * `status` is excluded as a sort key for the same "enum, no ordering
 * meaning" reason it is excluded from `ListAttendanceSessionsOptions`.
 * FK fields (`attendanceSessionId`, `semesterEnrollmentId`) are excluded
 * as sort keys, matching every sibling `List*Options`' identical
 * exclusion of its own FK fields.
 */
export interface ListAttendanceRecordsOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy: 'createdAt' | 'updatedAt' | 'correctedAt';
  readonly sortOrder: 'asc' | 'desc';
}

export interface ListAttendanceRecordsResult {
  readonly attendanceRecords: readonly AttendanceRecordDTO[];
  readonly total: number;
}
