// apps/api/src/modules/timetables/timetable.repository.ts

import type { Prisma, PrismaClient, Timetable } from '@spark/database/client';

import { prisma } from '../../lib/prisma.js';

import type { DayOfWeek, ListTimetablesFilters, ListTimetablesOptions } from './timetable.types.js';

/**
 * As with FacultyAssignmentRepository/SubjectOfferingRepository, `create`
 * takes an explicit Prisma transaction client rather than closing over the
 * module-level `prisma` singleton, so the service can compose it with the
 * FacultyAssignment/TimeSlot/Room resolution and any audit-log write
 * inside one `prisma.$transaction(...)`. Read-only methods use the
 * singleton by default; `findByIdTx` exists for workflows that must read a
 * Timetable row inside the SAME transaction that later writes it.
 */
type Db = PrismaClient | Prisma.TransactionClient;

export interface TimetableListQueryResult {
  readonly timetables: Timetable[];
  readonly total: number;
}

/**
 * Persistence payload for creation — deliberately NOT the domain
 * `CreateTimetableInput` (facultyAssignmentId + timeSlotId + roomId +
 * optional effectiveFrom only), mirroring
 * `CreateSemesterEnrollmentPersistenceInput`'s identical reasoning. The
 * Prisma `Timetable` row also requires `subjectOfferingId`,
 * `subjectComponentId`, `semesterCatalogId`, `academicYearId`,
 * `dayOfWeek`, `startTime`, and `endTime` — all denormalized from the
 * referenced FacultyAssignment/SubjectOffering/TimeSlot rows. The service
 * resolves those by reading the referenced rows first, then supplies the
 * full persistence payload here; this repository never re-derives them
 * from `facultyAssignmentId`/`timeSlotId` itself (see the class header).
 *
 * `startTime`/`endTime` are typed as `Date`, not `string` — unlike
 * `effectiveFrom` (a genuine client-supplied value, converted from its
 * ISO string the same way `AcademicYearRepository.create` converts
 * `startDate`/`endDate`), these two are never client input at all: the
 * service reads them directly off the resolved `TimeSlot` row, which
 * Prisma already returns as `Date` values for its `@db.Time` columns, so
 * no string round-trip is needed or introduced.
 *
 * `effectiveFrom` stays optional, matching `CreateTimetableInput` and the
 * schema's `@default(now())` — omitting the key (not passing `undefined`
 * explicitly) lets the database default apply, the same pattern
 * `AcademicYearRepository.update`'s optional-field spreads rely on.
 */
export interface CreateTimetablePersistenceInput {
  readonly facultyAssignmentId: string;
  readonly timeSlotId: string;
  readonly roomId: string;
  readonly subjectOfferingId: string;
  readonly subjectComponentId: string;
  readonly semesterCatalogId: string;
  readonly academicYearId: string;
  readonly dayOfWeek: DayOfWeek;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly effectiveFrom?: string;
}

/**
 * No generic update or delete operation, and no composite unique lookup.
 *
 * `timetable.types.ts` defines no `UpdateTimetableInput` — per its own
 * doc comment, closing/reopening/cancelling a Timetable row are future,
 * dedicated lifecycle actions (mirroring the schema's own "row is closed,
 * never edited in place" comment on `effectiveTo`), not a generic PATCH.
 * This repository does not invent `update()`/`delete()` ahead of that
 * contract existing, matching `FacultyAssignmentRepository`'s/
 * `SubjectOfferingRepository`'s identical restraint for their own
 * immutable-after-create models.
 *
 * Unlike `FacultyAssignment` (`@@unique([subjectOfferingId,
 * subjectComponentId])`) and `SubjectOffering` (`@@unique([subjectId,
 * academicYearId])`), the Prisma `Timetable` model declares no `@@unique`
 * beyond its own `id`. There is therefore no composite
 * `findBy...AndTx`-style lookup here — inventing a `findUnique` on a
 * fabricated compound key that the schema does not actually enforce would
 * misrepresent a non-unique combination as unique.
 *
 * Likewise, no `hasFacultyConflict`/`hasRoomConflict`/`hasCohortConflict`
 * query helpers are included. `timetable.service.ts` does not exist yet
 * and nothing currently calls such a method; per the "no Tx variant
 * without a consumer" convention every sibling repository already
 * follows, this repository does not speculatively add one. Conflict
 * prevention is, per schema.prisma's own comments on `Timetable`, a
 * PostgreSQL `btree_gist` EXCLUDE constraint — the database remains the
 * authoritative source of truth for overlap rejection regardless of
 * whether an application-level pre-check is later added; a losing
 * concurrent `create()` call is expected to raise the underlying
 * constraint error, which this repository does not catch, matching every
 * sibling repository's identical choice not to translate Prisma errors at
 * this layer.
 */
export class TimetableRepository {
  async findById(id: string): Promise<Timetable | null> {
    return prisma.timetable.findUnique({ where: { id } });
  }

  async findByIdTx(tx: Db, id: string): Promise<Timetable | null> {
    return tx.timetable.findUnique({ where: { id } });
  }

  /**
   * Persists exactly the resolved fields in `CreateTimetablePersistenceInput`
   * — see that interface's doc comment for why it differs from the domain
   * `CreateTimetableInput`. `effectiveFrom` is only included in `data` when
   * supplied, so omitting it lets the schema's `@default(now())` apply
   * rather than passing an explicit `undefined`.
   */
  async create(tx: Db, input: CreateTimetablePersistenceInput): Promise<Timetable> {
    return tx.timetable.create({
      data: {
        facultyAssignmentId: input.facultyAssignmentId,
        timeSlotId: input.timeSlotId,
        roomId: input.roomId,
        subjectOfferingId: input.subjectOfferingId,
        subjectComponentId: input.subjectComponentId,
        semesterCatalogId: input.semesterCatalogId,
        academicYearId: input.academicYearId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        ...(input.effectiveFrom !== undefined && { effectiveFrom: new Date(input.effectiveFrom) }),
      },
    });
  }

  /**
   * Filters match `ListTimetablesFilters` exactly — no invented fields.
   * `sortBy` is resolved through an explicit four-way mapping matching
   * `ListTimetablesOptions['sortBy']`'s exact union, never by indexing
   * into a Prisma orderBy object with a raw string, so an unexpected
   * value can never reach the query. A stable secondary key (`id`) is
   * appended after the caller's chosen primary sort so rows sharing an
   * identical `dayOfWeek`/`startTime`/`createdAt`/`updatedAt` value still
   * produce deterministic pagination, matching every sibling
   * `list()`'s identical tiebreaker shape. `isCancelled` and `dayOfWeek`
   * are passed straight through — validation has already converted the
   * HTTP query string/enum into the correct type, so this repository does
   * not re-parse or reinterpret either.
   */
  async list(
    filters: ListTimetablesFilters,
    options: ListTimetablesOptions,
  ): Promise<TimetableListQueryResult> {
    const where: Prisma.TimetableWhereInput = {
      ...(filters.subjectOfferingId !== undefined && {
        subjectOfferingId: filters.subjectOfferingId,
      }),
      ...(filters.subjectComponentId !== undefined && {
        subjectComponentId: filters.subjectComponentId,
      }),
      ...(filters.facultyAssignmentId !== undefined && {
        facultyAssignmentId: filters.facultyAssignmentId,
      }),
      ...(filters.semesterCatalogId !== undefined && {
        semesterCatalogId: filters.semesterCatalogId,
      }),
      ...(filters.academicYearId !== undefined && { academicYearId: filters.academicYearId }),
      ...(filters.timeSlotId !== undefined && { timeSlotId: filters.timeSlotId }),
      ...(filters.roomId !== undefined && { roomId: filters.roomId }),
      ...(filters.dayOfWeek !== undefined && { dayOfWeek: filters.dayOfWeek }),
      ...(filters.isCancelled !== undefined && { isCancelled: filters.isCancelled }),
    };

    const orderBy: Prisma.TimetableOrderByWithRelationInput[] =
      options.sortBy === 'dayOfWeek'
        ? [{ dayOfWeek: options.sortOrder }, { id: options.sortOrder }]
        : options.sortBy === 'startTime'
          ? [{ startTime: options.sortOrder }, { id: options.sortOrder }]
          : options.sortBy === 'createdAt'
            ? [{ createdAt: options.sortOrder }, { id: options.sortOrder }]
            : [{ updatedAt: options.sortOrder }, { id: options.sortOrder }];

    const [timetables, total] = await Promise.all([
      prisma.timetable.findMany({
        where,
        orderBy,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.timetable.count({ where }),
    ]);

    return { timetables, total };
  }
}

export const timetableRepository = new TimetableRepository();
