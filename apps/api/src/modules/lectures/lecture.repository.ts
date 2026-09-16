// apps/api/src/modules/lectures/lecture.repository.ts

import type { Lecture, Prisma, PrismaClient } from '@spark/database/client';

import { prisma } from '../../lib/prisma.js';

import type { ListLecturesFilters, ListLecturesOptions } from './lecture.types.js';

/**
 * As with TimetableRepository/FacultyAssignmentRepository/
 * SubjectOfferingRepository, `create` takes an explicit Prisma
 * transaction client rather than closing over the module-level `prisma`
 * singleton, so the service can compose it with the Timetable resolution
 * (reading `subjectOfferingId`/`facultyAssignmentId`/`roomId`/
 * `startTime`/`endTime` and the rest off the referenced row) and any
 * audit-log write inside one `prisma.$transaction(...)`. Read-only
 * methods use the singleton by default; `findByIdTx` exists for workflows
 * that must read a Lecture row inside the SAME transaction that later
 * writes it.
 */
type Db = PrismaClient | Prisma.TransactionClient;

export interface LectureListQueryResult {
  readonly lectures: Lecture[];
  readonly total: number;
}

/**
 * Persistence payload for creation — deliberately NOT the domain
 * `CreateLectureInput` (`timetableId` + `scheduledDate` only), mirroring
 * `CreateTimetablePersistenceInput`'s identical reasoning. The Prisma
 * `Lecture` row also requires `subjectOfferingId`, `subjectComponentId`,
 * `facultyAssignmentId`, `facultyUserId`, `roomId`, `semesterCatalogId`,
 * `academicYearId`, `startTime`, and `endTime` — all resolved by the
 * service from the referenced Timetable row (and denormalized onto
 * Lecture so the schema's EXCLUDE constraints can see the conflicting
 * value without joining at constraint-check time). This repository never
 * re-derives any of them from `timetableId` itself; it persists exactly
 * what the service resolved.
 *
 * `timetableId` is `string | null`, not optional. The column is nullable
 * so an ad-hoc extra class needs no fake recurring pattern behind it, and
 * null is a deliberate domain state the service must state explicitly —
 * an optional key would let "ad-hoc" and "the service forgot" look
 * identical at this boundary.
 *
 * `scheduledDate` is a `YYYY-MM-DD` string (the domain's `CalendarDate`),
 * matching `CreateTimetablePersistenceInput.effectiveFrom`'s treatment of
 * a genuinely client-supplied date; see `create` for why the conversion
 * is anchored to UTC here. `startTime`/`endTime` are `Date`, not string —
 * exactly as in `CreateTimetablePersistenceInput`, because the service
 * reads them directly off the resolved Timetable row, which Prisma
 * already returns as `Date` values for its `@db.Time` columns, so no
 * string round-trip is needed or introduced.
 *
 * `status` is absent: schema.prisma's `@default(SCHEDULED)` applies, and
 * every lecture is created scheduled with no exception (see
 * `lecture.types.ts` on why `CreateLectureInput` excludes it). This
 * repository never derives a status from the clock.
 */
export interface CreateLecturePersistenceInput {
  readonly timetableId: string | null;
  readonly subjectOfferingId: string;
  readonly subjectComponentId: string;
  readonly facultyAssignmentId: string;
  readonly facultyUserId: string;
  readonly roomId: string;
  readonly semesterCatalogId: string;
  readonly academicYearId: string;
  readonly scheduledDate: string;
  readonly startTime: Date;
  readonly endTime: Date;
}

/**
 * Converts a `YYYY-MM-DD` calendar date to the `Date` value Prisma
 * requires for a `@db.Date` column, anchored explicitly at UTC midnight.
 *
 * `Lecture.scheduledDate` is the schema's first `@db.Date` column — every
 * other date in this schema (`AcademicYear.startDate`,
 * `Admission.admissionDate`, `Timetable.effectiveFrom`) is a plain
 * `DateTime` representing a real instant, so
 * `AcademicYearRepository`'s bare `new Date(input.startDate)` is NOT the
 * precedent to copy here. A date-only string does parse as UTC midnight
 * per the ECMAScript spec, but the bare form is one edit away from the
 * local-midnight variant (`new Date('2026-09-17T00:00:00')`), which would
 * store the previous day for any server running west of UTC. The anchor
 * is therefore written out rather than relied on implicitly, and matches
 * the UTC accessors `lecture.mapper.ts` uses to read the column back.
 */
function toCalendarDate(calendarDate: string): Date {
  return new Date(`${calendarDate}T00:00:00.000Z`);
}

/**
 * No generic update, delete, or status-transition operation, and no
 * composite unique lookup.
 *
 * `lecture.types.ts` defines no `UpdateLectureInput` — per its own doc
 * comment, Lecture identity must stay immutable because
 * `AttendanceSession.lectureId` is `@unique` with `onDelete: Cascade` and
 * `AttendanceRecord` hangs off that session: rewriting `scheduledDate`,
 * `roomId`, `facultyAssignmentId`, or `subjectOfferingId` after
 * attendance exists would retroactively change which session a student's
 * record is understood to describe. For the same reason there is no
 * `delete()` — a Lecture is a historical occurrence, and cascading its
 * attendance away is not a persistence-layer decision. Nor are there
 * `cancel()`/`complete()` methods: those transitions are dedicated
 * service operations that do not exist yet, and this repository does not
 * invent their persistence shape ahead of the contract, matching
 * `TimetableRepository`'s/`FacultyAssignmentRepository`'s identical
 * restraint for their own immutable-after-create models.
 *
 * `@@unique([subjectOfferingId, scheduledDate, startTime])` IS real, but
 * no corresponding `findBy...` lookup is provided. Unlike
 * `FacultyAssignmentRepository`/`SubjectOfferingRepository`, whose
 * composite lookups exist because live services consume them as
 * duplicate pre-checks, `lecture.service.ts` does not exist and nothing
 * calls such a method — per the "no Tx variant without a consumer"
 * convention every sibling repository follows, one is not added
 * speculatively. Note also what that constraint keys on: the resolved
 * `subjectOfferingId`/`startTime`, NOT `timetableId` — a Timetable does
 * not identify a Lecture, and no method here implies it does.
 *
 * Likewise no `hasFacultyConflict`/`hasRoomConflict`/`hasCohortConflict`.
 * Per schema.prisma's own comments on `Lecture`, double-booking
 * prevention is a PostgreSQL `btree_gist` EXCLUDE constraint (those
 * comments also note the constraints still need rewriting to key on
 * `semesterCatalogId` + `academicYearId`). The database remains the
 * authoritative source of truth for overlap rejection regardless of
 * whether an application-level pre-check is later added; a losing
 * concurrent `create()` is expected to raise the underlying constraint
 * error, which this repository does not catch — matching every sibling
 * repository's identical choice not to translate Prisma errors at this
 * layer.
 */
export class LectureRepository {
  async findById(id: string): Promise<Lecture | null> {
    return prisma.lecture.findUnique({ where: { id } });
  }

  async findByIdTx(tx: Db, id: string): Promise<Lecture | null> {
    return tx.lecture.findUnique({ where: { id } });
  }

  /**
   * Persists exactly the resolved fields in
   * `CreateLecturePersistenceInput` — see that interface's doc comment
   * for why it differs from the domain `CreateLectureInput`.
   *
   * `timetableId` is passed straight through, null included: a null means
   * an ad-hoc session, never a missing value to substitute for.
   * `startTime`/`endTime` are persisted as the service supplied them,
   * with no normalization, no duration calculation, and no derivation
   * from `scheduledDate`. `status` is not written at all, so the schema's
   * `@default(SCHEDULED)` applies.
   *
   * A resulting P2002 (from `@@unique([subjectOfferingId, scheduledDate,
   * startTime])`) or an EXCLUDE-constraint violation is not caught here;
   * both propagate to the service/common error boundary.
   */
  async create(tx: Db, input: CreateLecturePersistenceInput): Promise<Lecture> {
    return tx.lecture.create({
      data: {
        timetableId: input.timetableId,
        subjectOfferingId: input.subjectOfferingId,
        subjectComponentId: input.subjectComponentId,
        facultyAssignmentId: input.facultyAssignmentId,
        facultyUserId: input.facultyUserId,
        roomId: input.roomId,
        semesterCatalogId: input.semesterCatalogId,
        academicYearId: input.academicYearId,
        scheduledDate: toCalendarDate(input.scheduledDate),
        startTime: input.startTime,
        endTime: input.endTime,
      },
    });
  }

  /**
   * Filters match `ListLecturesFilters` exactly — no invented fields, no
   * `search` (Lecture has no own string column), no
   * `subjectId`/`programId`/`departmentId` (none are stored on this
   * model). The nine equality filters are applied only when supplied,
   * via conditional spread rather than an explicit `undefined`, for
   * `exactOptionalPropertyTypes` compatibility and matching every sibling
   * `list()`.
   *
   * `timetableId` is an ordinary equality filter. `ListLecturesFilters`
   * types it `TimetableId` (optional, never `null`), so "list the ad-hoc
   * lectures" is NOT expressible through this contract and no null
   * semantics are invented for it here — an absent filter means "any",
   * never "is null".
   *
   * `fromDate`/`toDate` are inclusive bounds on `scheduledDate`, not two
   * separate columns: they collapse into a single `{ gte, lte }` clause
   * emitted only when at least one bound is present, so an unfiltered
   * query carries no empty `scheduledDate: {}` predicate. Each bound goes
   * through the same UTC anchoring as `create` — the stored values are
   * all UTC midnight, so `lte` on the upper bound is genuinely
   * inclusive of that whole day. An inverted range (`fromDate > toDate`)
   * is executed faithfully and simply selects zero rows; per
   * `lecture.validation.ts`, whether that should instead be a 400 is a
   * deliberate open question for the service layer, not something this
   * repository decides.
   *
   * `sortBy` is resolved through an explicit four-way mapping matching
   * `ListLecturesOptions['sortBy']`'s exact union, never by indexing into
   * a Prisma orderBy object with a raw string, so an unexpected value can
   * never reach the query. The `scheduledDate` branch adds `startTime`
   * before the `id` tiebreaker — many lectures legitimately share one
   * date, and that pair is the same chronological ordering
   * `@@unique([subjectOfferingId, scheduledDate, startTime])` uses to
   * identify a session, so it is a more meaningful secondary key than
   * `id` alone. Every branch still ends in `id` for fully deterministic
   * pagination, matching every sibling `list()`'s tiebreaker shape.
   */
  async list(
    filters: ListLecturesFilters,
    options: ListLecturesOptions,
  ): Promise<LectureListQueryResult> {
    const hasDateBound = filters.fromDate !== undefined || filters.toDate !== undefined;

    const scheduledDateFilter: Prisma.DateTimeFilter = {
      ...(filters.fromDate !== undefined && { gte: toCalendarDate(filters.fromDate) }),
      ...(filters.toDate !== undefined && { lte: toCalendarDate(filters.toDate) }),
    };

    const where: Prisma.LectureWhereInput = {
      ...(filters.timetableId !== undefined && { timetableId: filters.timetableId }),
      ...(filters.subjectOfferingId !== undefined && {
        subjectOfferingId: filters.subjectOfferingId,
      }),
      ...(filters.subjectComponentId !== undefined && {
        subjectComponentId: filters.subjectComponentId,
      }),
      ...(filters.facultyAssignmentId !== undefined && {
        facultyAssignmentId: filters.facultyAssignmentId,
      }),
      ...(filters.facultyUserId !== undefined && { facultyUserId: filters.facultyUserId }),
      ...(filters.semesterCatalogId !== undefined && {
        semesterCatalogId: filters.semesterCatalogId,
      }),
      ...(filters.academicYearId !== undefined && { academicYearId: filters.academicYearId }),
      ...(filters.roomId !== undefined && { roomId: filters.roomId }),
      ...(filters.status !== undefined && { status: filters.status }),
      ...(hasDateBound && { scheduledDate: scheduledDateFilter }),
    };

    const orderBy: Prisma.LectureOrderByWithRelationInput[] =
      options.sortBy === 'scheduledDate'
        ? [
            { scheduledDate: options.sortOrder },
            { startTime: options.sortOrder },
            { id: options.sortOrder },
          ]
        : options.sortBy === 'startTime'
          ? [{ startTime: options.sortOrder }, { id: options.sortOrder }]
          : options.sortBy === 'createdAt'
            ? [{ createdAt: options.sortOrder }, { id: options.sortOrder }]
            : [{ updatedAt: options.sortOrder }, { id: options.sortOrder }];

    const [lectures, total] = await Promise.all([
      prisma.lecture.findMany({
        where,
        orderBy,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.lecture.count({ where }),
    ]);

    return { lectures, total };
  }
}

export const lectureRepository = new LectureRepository();
