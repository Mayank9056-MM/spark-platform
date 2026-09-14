// apps/api/src/modules/timetables/timetable.service.ts

import type { Prisma } from '@spark/database/client';

import { ApiError } from '../../common/errors/ApiError.js';
import { ErrorCode } from '../../common/errors/ErrorCodes.js';
import { timetableLogger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { subjectRepository } from '../academic/subjects/subject.repository.js';
import { recordAuditTx } from '../audit/audit.service.js';
import { AuditEntityType } from '../audit/audit.types.js';
import { facultyAssignmentRepository } from '../faculty-assignments/facultyAssignment.repository.js';
import { roomRepository } from '../rooms/room.repository.js';
import { subjectOfferingRepository } from '../subject-offerings/subjectOffering.repository.js';
import { timeSlotRepository } from '../time-slots/timeSlot.repository.js';

import { toTimetableDTO, toTimetableDTOList } from './timetable.mapper.js';
import { timetableRepository } from './timetable.repository.js';
import type { CreateTimetablePersistenceInput } from './timetable.repository.js';
import type {
  CreateTimetableInput,
  ListTimetablesFilters,
  ListTimetablesOptions,
  ListTimetablesResult,
  TimetableDTO,
  TimetableId,
} from './timetable.types.js';

/**
 * Business-logic layer for the Timetable domain.
 *
 * The client supplies only three independent decisions —
 * `facultyAssignmentId`, `timeSlotId`, `roomId` (see `CreateTimetableInput`'s
 * own doc comment) — and this service resolves every other persisted
 * Timetable column (`subjectOfferingId`, `subjectComponentId`,
 * `semesterCatalogId`, `academicYearId`, `dayOfWeek`, `startTime`,
 * `endTime`) from the referenced rows inside one transaction, so a client
 * can never submit a `facultyAssignmentId` that disagrees with a
 * separately-submitted `subjectOfferingId`, or a `timeSlotId` that
 * disagrees with a separately-submitted `dayOfWeek` — those fields are not
 * accepted as create input at all.
 *
 * Resolution chain, all inside the same `prisma.$transaction`:
 *
 *   FacultyAssignment (client-supplied id)
 *     -> subjectOfferingId, subjectComponentId (both trusted directly off
 *        this row — see the SubjectComponent-consistency note below)
 *
 *   SubjectOffering (resolved via FacultyAssignment.subjectOfferingId)
 *     -> academicYearId
 *     -> subjectId
 *
 *   Subject (resolved via SubjectOffering.subjectId)
 *     -> semesterCatalogId
 *
 *   TimeSlot (client-supplied id)
 *     -> dayOfWeek, startTime, endTime
 *
 *   Room (client-supplied id) — existence only; no capacity/type rules
 *   exist in this domain yet, and none are invented here.
 *
 * SubjectComponent consistency (schema.prisma's `FacultyAssignment` NOTE:
 * "does not verify subjectComponentId belongs to subjectOffering's
 * Subject"): `FacultyAssignmentService.createFacultyAssignment` already
 * enforces that exact two-hop agreement at assignment-creation time
 * (`subjectComponent.subjectId === subjectOffering.subjectId`, throwing
 * `ACADEMIC_HIERARCHY_MISMATCH` otherwise), and `FacultyAssignment` has no
 * update/delete (see `facultyAssignment.repository.ts`'s class header). Any
 * `FacultyAssignment` row this service can read therefore already satisfies
 * the invariant by construction. Re-querying `SubjectComponent` here to
 * re-check it would be exactly the speculative conflict query this
 * module's architecture avoids — `facultyAssignment.subjectComponentId` is
 * trusted as-is, with no additional lookup.
 *
 * AcademicYear/SemesterCatalog existence: `academicYearId` and
 * `semesterCatalogId` are read off `SubjectOffering`/`Subject` rows that
 * are only reachable via foreign keys Postgres already enforced when those
 * rows were created. Unlike `FacultyAssignment`/`TimeSlot`/`Room`, the
 * client never supplies either id directly, so there is no untrusted input
 * to re-validate — neither `AcademicYear` nor `SemesterCatalog` is
 * independently re-fetched.
 *
 * Conflict prevention (same faculty/room/cohort double-booked) is a
 * Postgres `btree_gist` EXCLUDE constraint per schema.prisma's own comment
 * on the `Timetable` model, not an application-level pre-check. This
 * service performs no `hasFacultyConflict`/`hasRoomConflict` query — none
 * exists on `timetableRepository`, and inventing one here would give a
 * false concurrency guarantee (see `timetable.repository.ts`'s class
 * header). A losing concurrent `create()` call is expected to raise the
 * underlying constraint violation, which this service does not catch, left
 * to propagate to the centralized Prisma-error-handling middleware,
 * matching every sibling service's identical choice not to translate
 * Prisma errors at this layer.
 *
 * `createTimetable` runs inside one `prisma.$transaction`, resolving every
 * row via `*Tx` repository methods within that same transaction (never a
 * pre-fetch outside it), with the audit write in the same transaction —
 * matching every sibling service's shape exactly.
 *
 * No `updateTimetable`/`deleteTimetable`/`cancelTimetable`.
 * `timetable.types.ts` defines no `UpdateTimetableInput`, and
 * `timetable.repository.ts` exposes no `update`/`delete` methods. Per
 * schema.prisma's own comment on `Timetable.effectiveTo`, a row is "closed,
 * never edited in place"; closing/reopening/cancelling are future,
 * dedicated lifecycle actions this service does not invent ahead of that
 * contract existing.
 *
 * `getTimetableById`/`listTimetables` are plain, unaudited reads with no
 * transaction, matching every sibling service's identical read methods.
 * `listTimetables` is a thin pass-through — filtering/pagination/sorting
 * all happen in `timetableRepository.list`.
 */
export class TimetableService {
  async createTimetable(actorUserId: string, input: CreateTimetableInput): Promise<TimetableDTO> {
    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const facultyAssignment = await facultyAssignmentRepository.findByIdTx(
        tx,
        input.facultyAssignmentId,
      );
      if (!facultyAssignment) {
        throw ApiError.notFound('Faculty assignment not found', ErrorCode.RECORD_NOT_FOUND);
      }

      const subjectOffering = await subjectOfferingRepository.findByIdTx(
        tx,
        facultyAssignment.subjectOfferingId,
      );
      if (!subjectOffering) {
        throw ApiError.notFound('Subject offering not found', ErrorCode.RECORD_NOT_FOUND);
      }

      const subject = await subjectRepository.findByIdTx(tx, subjectOffering.subjectId);
      if (!subject) {
        throw ApiError.notFound('Subject not found', ErrorCode.RECORD_NOT_FOUND);
      }

      const timeSlot = await timeSlotRepository.findByIdTx(tx, input.timeSlotId);
      if (!timeSlot) {
        throw ApiError.notFound('Time slot not found', ErrorCode.RECORD_NOT_FOUND);
      }

      const room = await roomRepository.findByIdTx(tx, input.roomId);
      if (!room) {
        throw ApiError.notFound('Room not found', ErrorCode.RECORD_NOT_FOUND);
      }

      // All fields below come from trusted, already-persisted rows — never
      // from `input` beyond the three ids used to resolve them. See the
      // class header's resolution-chain note.
      const persistenceInput: CreateTimetablePersistenceInput = {
        facultyAssignmentId: facultyAssignment.id,
        timeSlotId: timeSlot.id,
        roomId: room.id,
        subjectOfferingId: subjectOffering.id,
        subjectComponentId: facultyAssignment.subjectComponentId,
        semesterCatalogId: subject.semesterCatalogId,
        academicYearId: subjectOffering.academicYearId,
        dayOfWeek: timeSlot.dayOfWeek,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
        ...(input.effectiveFrom !== undefined && { effectiveFrom: input.effectiveFrom }),
      };

      const timetable = await timetableRepository.create(tx, persistenceInput);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.TIMETABLE,
        entityId: timetable.id,
        newValue: {
          id: timetable.id,
          facultyAssignmentId: timetable.facultyAssignmentId,
          timeSlotId: timetable.timeSlotId,
          roomId: timetable.roomId,
          subjectOfferingId: timetable.subjectOfferingId,
          subjectComponentId: timetable.subjectComponentId,
          semesterCatalogId: timetable.semesterCatalogId,
          academicYearId: timetable.academicYearId,
          effectiveFrom: timetable.effectiveFrom.toISOString(),
        },
      });

      return timetable;
    });

    timetableLogger.info('Timetable created', {
      actorUserId,
      timetableId: created.id,
      facultyAssignmentId: created.facultyAssignmentId,
      timeSlotId: created.timeSlotId,
      roomId: created.roomId,
      subjectOfferingId: created.subjectOfferingId,
      academicYearId: created.academicYearId,
    });

    return toTimetableDTO(created);
  }

  /** Not audited — routine read. */
  async getTimetableById(id: TimetableId): Promise<TimetableDTO> {
    const timetable = await timetableRepository.findById(id);
    if (!timetable) {
      throw ApiError.notFound('Timetable not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toTimetableDTO(timetable);
  }

  /** Not audited — routine read. Thin pass-through; the repository owns filtering/pagination/sorting. */
  async listTimetables(
    filters: ListTimetablesFilters,
    options: ListTimetablesOptions,
  ): Promise<ListTimetablesResult> {
    const result = await timetableRepository.list(filters, options);
    return {
      timetables: toTimetableDTOList(result.timetables),
      total: result.total,
    };
  }
}

export const timetableService = new TimetableService();
