// apps/api/src/modules/lectures/lecture.service.ts

import type { Prisma } from '@spark/database/client';

import { ApiError } from '../../common/errors/ApiError.js';
import { ErrorCode } from '../../common/errors/ErrorCodes.js';
import { lectureLogger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { academicYearRepository } from '../academic-years/academic-year.repository.js';
import { recordAuditTx } from '../audit/audit.service.js';
import { AuditEntityType } from '../audit/audit.types.js';
import { facultyAssignmentRepository } from '../faculty-assignments/facultyAssignment.repository.js';
import { timetableRepository } from '../timetables/timetable.repository.js';
import type { DayOfWeek } from '../timetables/timetable.types.js';

import { toLectureDTO, toLectureDTOList } from './lecture.mapper.js';
import { lectureRepository } from './lecture.repository.js';
import type { CreateLecturePersistenceInput } from './lecture.repository.js';
import type {
  CreateLectureInput,
  LectureDTO,
  LectureId,
  ListLecturesFilters,
  ListLecturesOptions,
  ListLecturesResult,
} from './lecture.types.js';

/**
 * Business-logic layer for the Lecture domain.
 *
 * A Lecture is the ACTUAL DATED OCCURRENCE of a class — the row attendance
 * attaches to. The client supplies exactly two decisions (`timetableId`,
 * `scheduledDate`, see `CreateLectureInput`); this service resolves every
 * other persisted column from the referenced Timetable row inside one
 * transaction, so a caller can never submit a `roomId`/`startTime`/
 * `facultyUserId` that DISAGREES with the pattern the Lecture claims to
 * realize. Those fields are not accepted as create input at all.
 *
 * Resolution chain, all inside the same `prisma.$transaction`:
 *
 *   Timetable (client-supplied id)
 *     -> subjectOfferingId, subjectComponentId, facultyAssignmentId,
 *        roomId, semesterCatalogId, academicYearId, startTime, endTime
 *     -> dayOfWeek, isCancelled, effectiveFrom, effectiveTo (validation only)
 *
 *   FacultyAssignment (resolved via Timetable.facultyAssignmentId)
 *     -> facultyUserId — the ONLY required Lecture column Timetable does not
 *        carry. The schema denormalizes the PERSON onto Lecture, not the
 *        assignment row, because one faculty member may hold two different
 *        FacultyAssignment rows and still double-book themselves.
 *
 *   AcademicYear (resolved via Timetable.academicYearId)
 *     -> startDate/endDate, for the calendar-range check below.
 *
 * NOT re-fetched: SubjectOffering, SubjectComponent, Room. The client never
 * supplies any of their ids, and each is reachable only through a foreign key
 * Postgres already enforced when the Timetable row was written — the same
 * reasoning `TimetableService` documents for declining to re-fetch
 * AcademicYear/SemesterCatalog. Room in particular has no lifecycle beyond
 * existence in this schema (no active flag, no maintenance state), and no Room
 * business rule is invented here.
 *
 * The FacultyAssignment agreement check below costs no extra query — both rows
 * are already in memory. `TimetableService` set `timetable.subjectOfferingId`/
 * `subjectComponentId` from this exact FacultyAssignment, and FacultyAssignment
 * has no update or delete path anywhere in this codebase, so the invariant holds
 * by construction for any Timetable this API created. It is kept as an explicit
 * defensive guard against a row seeded or migrated in outside that path, the
 * same posture `FacultyAssignmentService` documents for its own retained
 * `conflicting.id !== id` check.
 *
 * ── DATE AND TIME SEMANTICS ────────────────────────────────────────────────
 * `scheduledDate` is a calendar day (`@db.Date`), never an instant. It is
 * anchored at UTC midnight throughout — parsed here, persisted by
 * `lectureRepository.create`, and read back by `lecture.mapper.ts`, all with
 * UTC accessors, so no server timezone can shift 2026-09-22 into 2026-09-21.
 * `startTime`/`endTime` (`@db.Time`) are copied verbatim off the Timetable row
 * as the `Date` values Prisma returns; they are never recomputed, never
 * serialized, and never derived from the clock.
 *
 * ── INVARIANTS ENFORCED ON CREATE ──────────────────────────────────────────
 * 1. The Timetable exists.
 * 2. It is not cancelled (`isCancelled`) — a cancelled pattern produces no
 *    occurrences.
 * 3. `scheduledDate` falls inside the Timetable's effective window, compared by
 *    CALENDAR DAY. Comparing instants would reject a lecture scheduled for
 *    today against a Timetable created today at 14:32 with
 *    `effectiveFrom = now()`. `effectiveTo` is treated as inclusive; the schema
 *    does not specify, and inclusive matches `effectiveFrom`.
 * 4. `scheduledDate`'s weekday matches `Timetable.dayOfWeek`. The schema offers
 *    no exception-lecture mechanism, so recurrence consistency is enforced.
 *    `DayOfWeek` has no SUNDAY, so a Sunday date matches no Timetable and is
 *    rejected by this same check — exactly the rule `lecture.validation.ts`
 *    documents as deferred to this layer.
 * 5. The referenced FacultyAssignment exists and agrees with the Timetable's
 *    own offering/component ids.
 * 6. `scheduledDate` falls inside the AcademicYear the Timetable names,
 *    inclusive on both bounds. This is the one rule with no sibling precedent:
 *    Lecture is the first model in this schema carrying both a calendar date
 *    and an `academicYearId`, and a lecture dated outside the term it claims
 *    to belong to is self-contradictory.
 *
 * ── CONFLICT DETECTION AND CONCURRENCY ─────────────────────────────────────
 * No `hasFacultyConflict`/`hasRoomConflict`/`hasCohortConflict` pre-check, and
 * no duplicate pre-check. `lectureRepository` exposes none, and inventing them
 * here would advertise a concurrency guarantee a non-locking read cannot
 * deliver — two transactions can both observe "free" before either commits.
 * `@@unique([subjectOfferingId, scheduledDate, startTime])` is the only
 * database authority that currently exists; a losing concurrent `create()`
 * raises P2002, which this service does not catch, matching every sibling
 * service's identical choice not to translate Prisma errors at this layer.
 *
 * Note that schema.prisma attributes faculty/room/cohort double-booking
 * prevention to `btree_gist` EXCLUDE constraints in migration.sql. Those
 * constraints are NOT present in any migration in this repository — see this
 * module's implementation report. Until they exist, overlap is unprevented at
 * every layer; that is a schema gap to close with a migration, not something
 * this service should paper over with a racy application check.
 *
 * ── SCOPE ──────────────────────────────────────────────────────────────────
 * Create + two reads only. No `updateLecture`/`deleteLecture`/`cancelLecture`/
 * `completeLecture`: `lecture.types.ts` defines no input for any of them and
 * `lecture.repository.ts` exposes no write beyond `create`. Lecture identity
 * must stay immutable because `AttendanceSession.lectureId` is `@unique` with
 * `onDelete: Cascade` and `AttendanceRecord` hangs off that session. No
 * attendance data is created, read, or imported here.
 *
 * `actorUserId` is the administrator/coordinator performing the API call and is
 * used ONLY to attribute the audit record. It is never written to
 * `facultyUserId`, which is the person teaching — the two are structurally kept
 * apart by `CreateLectureInput` accepting neither. No `authorize()` call: RBAC
 * belongs to `lecture.routes.ts`, matching every sibling service without a
 * privilege-escalation concern.
 */

/**
 * Parses a `YYYY-MM-DD` calendar date to a `Date` anchored at UTC midnight —
 * the identical anchoring `lectureRepository.toCalendarDate` applies on write
 * and `lecture.mapper.ts` assumes on read. Written out explicitly rather than
 * relying on `new Date(calendarDate)`'s implicit UTC parsing, which is one edit
 * away from the local-midnight variant.
 */
function parseCalendarDate(calendarDate: string): Date {
  return new Date(`${calendarDate}T00:00:00.000Z`);
}

/**
 * Reduces any `Date` to the epoch millisecond of its UTC calendar day, so two
 * values can be compared as DAYS rather than instants. Used for the
 * AcademicYear and Timetable-effective-window bounds, which are stored as full
 * `DateTime` columns while `scheduledDate` is a bare `@db.Date`.
 */
function toUtcDayStart(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

/**
 * `Date.getUTCDay()` index -> `DayOfWeek`. Index 0 (Sunday) is deliberately
 * absent: schema.prisma's `DayOfWeek` enum has six values and no SUNDAY, so a
 * Sunday date resolves to `undefined` and fails the comparison below.
 */
const DAY_OF_WEEK_BY_UTC_DAY: Readonly<Record<number, DayOfWeek>> = {
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

export class LectureService {
  async createLecture(actorUserId: string, input: CreateLectureInput): Promise<LectureDTO> {
    const scheduledDate = parseCalendarDate(input.scheduledDate);
    const scheduledDay = toUtcDayStart(scheduledDate);

    const lecture = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const timetable = await timetableRepository.findByIdTx(tx, input.timetableId);
      if (!timetable) {
        throw ApiError.notFound('Timetable not found', ErrorCode.RECORD_NOT_FOUND);
      }

      if (timetable.isCancelled) {
        throw ApiError.conflict(
          'This timetable entry is cancelled and cannot produce lectures',
          ErrorCode.DUPLICATE_ENTRY,
        );
      }

      if (scheduledDay < toUtcDayStart(timetable.effectiveFrom)) {
        throw ApiError.unprocessable(
          'The scheduled date falls before this timetable entry takes effect',
          ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
        );
      }

      if (timetable.effectiveTo !== null && scheduledDay > toUtcDayStart(timetable.effectiveTo)) {
        throw ApiError.unprocessable(
          'The scheduled date falls after this timetable entry was closed',
          ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
        );
      }

      // Recurrence consistency. A Sunday date resolves to undefined here, since
      // DayOfWeek has no SUNDAY value, and is rejected by the same comparison.
      const scheduledDayOfWeek: DayOfWeek | undefined =
        DAY_OF_WEEK_BY_UTC_DAY[scheduledDate.getUTCDay()];
      if (scheduledDayOfWeek !== timetable.dayOfWeek) {
        throw ApiError.unprocessable(
          'The scheduled date does not fall on this timetable entry\u2019s day of week',
          ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
        );
      }

      // Read for `facultyUserId` — the one required Lecture column Timetable
      // does not carry. See the class header.
      const facultyAssignment = await facultyAssignmentRepository.findByIdTx(
        tx,
        timetable.facultyAssignmentId,
      );
      if (!facultyAssignment) {
        throw ApiError.notFound('Faculty assignment not found', ErrorCode.RECORD_NOT_FOUND);
      }

      // Defensive agreement guard — no extra query, both rows already in hand.
      if (
        facultyAssignment.subjectOfferingId !== timetable.subjectOfferingId ||
        facultyAssignment.subjectComponentId !== timetable.subjectComponentId
      ) {
        throw ApiError.unprocessable(
          'This timetable entry disagrees with its faculty assignment',
          ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
        );
      }

      const academicYear = await academicYearRepository.findByIdTx(tx, timetable.academicYearId);
      if (!academicYear) {
        throw ApiError.notFound('Academic year not found', ErrorCode.RECORD_NOT_FOUND);
      }

      // Inclusive on both bounds, compared as UTC calendar days.
      if (
        scheduledDay < toUtcDayStart(academicYear.startDate) ||
        scheduledDay > toUtcDayStart(academicYear.endDate)
      ) {
        throw ApiError.unprocessable(
          'The scheduled date falls outside this academic year',
          ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
        );
      }

      // Every field below comes from a trusted, already-persisted row — never
      // from `input` beyond the two values used to resolve them.
      const persistenceInput: CreateLecturePersistenceInput = {
        timetableId: timetable.id,
        subjectOfferingId: timetable.subjectOfferingId,
        subjectComponentId: timetable.subjectComponentId,
        facultyAssignmentId: timetable.facultyAssignmentId,
        facultyUserId: facultyAssignment.facultyUserId,
        roomId: timetable.roomId,
        semesterCatalogId: timetable.semesterCatalogId,
        academicYearId: timetable.academicYearId,
        scheduledDate: input.scheduledDate,
        startTime: timetable.startTime,
        endTime: timetable.endTime,
      };

      const created = await lectureRepository.create(tx, persistenceInput);

      // Mapped inside the transaction deliberately: `toLectureDTO` is pure and
      // performs no I/O, and its `@db.Date`/`@db.Time` formatting is exactly
      // what the audit trail should record — `toISOString()` on a time-of-day
      // column would write "1970-01-01T10:00:00.000Z" into the audit log.
      const dto = toLectureDTO(created);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.LECTURE,
        entityId: dto.id,
        newValue: {
          id: dto.id,
          timetableId: dto.timetableId,
          subjectOfferingId: dto.subjectOfferingId,
          subjectComponentId: dto.subjectComponentId,
          facultyAssignmentId: dto.facultyAssignmentId,
          facultyUserId: dto.facultyUserId,
          semesterCatalogId: dto.semesterCatalogId,
          academicYearId: dto.academicYearId,
          roomId: dto.roomId,
          scheduledDate: dto.scheduledDate,
          startTime: dto.startTime,
          endTime: dto.endTime,
          status: dto.status,
        },
      });

      return dto;
    });

    lectureLogger.info('Lecture created', {
      actorUserId,
      lectureId: lecture.id,
      timetableId: lecture.timetableId,
      subjectOfferingId: lecture.subjectOfferingId,
      facultyAssignmentId: lecture.facultyAssignmentId,
      facultyUserId: lecture.facultyUserId,
      roomId: lecture.roomId,
      scheduledDate: lecture.scheduledDate,
    });

    return lecture;
  }

  /** Not audited — routine read. No relations loaded; LectureDTO needs none. */
  async getLectureById(id: LectureId): Promise<LectureDTO> {
    const lecture = await lectureRepository.findById(id);
    if (!lecture) {
      throw ApiError.notFound('Lecture not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toLectureDTO(lecture);
  }

  /**
   * Not audited — routine read. Thin pass-through; the repository owns
   * filtering, the `fromDate`/`toDate` range clause, pagination, and sorting.
   *
   * An inverted range (`fromDate > toDate`) is passed through unchanged and
   * simply selects zero rows. Neither `lecture.validation.ts` nor
   * `academic-year.validation.ts` enforces bound ordering, and no sibling
   * service rejects one; the bounds are never silently swapped.
   */
  async listLectures(
    filters: ListLecturesFilters,
    options: ListLecturesOptions,
  ): Promise<ListLecturesResult> {
    const result = await lectureRepository.list(filters, options);
    return {
      lectures: toLectureDTOList(result.lectures),
      total: result.total,
    };
  }
}

export const lectureService = new LectureService();
