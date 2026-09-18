// apps/api/src/modules/attendance/attendance.repository.ts

import type {
  AttendanceRecord,
  AttendanceSession,
  Prisma,
  PrismaClient,
} from '@spark/database/client';

import { prisma } from '../../lib/prisma.js';

import type {
  AttendanceStatus,
  ListAttendanceRecordsFilters,
  ListAttendanceRecordsOptions,
  ListAttendanceSessionsFilters,
  ListAttendanceSessionsOptions,
} from './attendance.types.js';

/**
 * As with PromotionBatchRepository/PromotionDecisionRepository/
 * LectureRepository, mutating methods take an explicit Prisma
 * transaction client rather than closing over the module-level `prisma`
 * singleton, so attendance.service.ts can compose a session-open, a
 * bulk mark, a lock, or a correction with its audit-log write inside one
 * `prisma.$transaction(...)`. Read-only lookup methods use the singleton
 * by default; a `*Tx` counterpart exists only where a documented
 * workflow must read a row inside the SAME transaction that later writes
 * based on it (opening a session after checking none exists for the
 * lecture, marking records after checking the session is OPEN,
 * re-reading a just-bulk-inserted set, correcting a record after reading
 * its pre-mutation state).
 *
 * Returns Prisma models only, never DTOs — attendance.mapper.ts is not
 * imported here. This file owns AttendanceSession/AttendanceRecord
 * persistence only; it never queries Lecture, SemesterEnrollment, or
 * User beyond the plain scalar FK columns already on these two models,
 * and it makes no eligibility, authorization, or lifecycle decisions —
 * see attendance.types.ts's module header for why those checks are
 * service-layer, not schema-expressible, concerns.
 */
type Db = PrismaClient | Prisma.TransactionClient;

export interface AttendanceSessionListQueryResult {
  readonly attendanceSessions: AttendanceSession[];
  readonly total: number;
}

export interface AttendanceRecordListQueryResult {
  readonly attendanceRecords: AttendanceRecord[];
  readonly total: number;
}

/**
 * Deliberately NOT the domain CreateAttendanceSessionInput (which
 * excludes takenByUserId — the actor comes from req.user, not the
 * client). The service resolves the actor before calling this
 * repository. `status`/`lockedAt` are omitted — the schema's
 * `@default(OPEN)` and nullable-with-no-default column apply untouched.
 */
export interface CreateAttendanceSessionPersistenceInput {
  readonly lectureId: string;
  readonly takenByUserId: string;
}

/**
 * Deliberately NOT the domain MarkAttendanceRecordInput (which excludes
 * attendanceSessionId and markedByUserId — the former is supplied once
 * on the enclosing BulkMarkAttendanceInput rather than per record, the
 * latter is actor-derived). The service resolves both — the shared
 * session id and the authenticated actor — once per bulk request, before
 * calling this repository. `correctedAt`/`correctionReason`/
 * `correctedByUserId` are absent: a newly marked record is never
 * created pre-corrected, matching attendance.types.ts's own reasoning.
 */
export interface CreateAttendanceRecordPersistenceInput {
  readonly attendanceSessionId: string;
  readonly semesterEnrollmentId: string;
  readonly status: AttendanceStatus;
  readonly markedByUserId: string;
}

/**
 * Deliberately NOT the domain CorrectAttendanceRecordInput (which
 * excludes correctedAt and correctedByUserId — both are server-derived
 * at the moment of correction: `correctedAt` from the clock,
 * `correctedByUserId` from the authenticated actor). The service
 * resolves both before calling this repository, matching
 * CreatePromotionDecisionPersistenceInput's identical treatment of
 * decidedByUserId/decidedAt.
 */
export interface CorrectAttendanceRecordPersistenceInput {
  readonly status: AttendanceStatus;
  readonly correctedAt: Date;
  readonly correctionReason: string;
  readonly correctedByUserId: string;
}

/**
 * No update()/delete() beyond `lock()` — AttendanceSession is
 * lifecycle-controlled (OPEN -> LOCKED only) rather than a generic CRUD
 * resource; `lectureId`/`takenByUserId` are fixed at creation, matching
 * attendance.types.ts's own reasoning for declining an
 * UpdateAttendanceSessionInput.
 */
export class AttendanceSessionRepository {
  async findById(id: string): Promise<AttendanceSession | null> {
    return prisma.attendanceSession.findUnique({ where: { id } });
  }

  async findByIdTx(tx: Db, id: string): Promise<AttendanceSession | null> {
    return tx.attendanceSession.findUnique({ where: { id } });
  }

  /**
   * `lectureId` is `@unique` — a plain findUnique, not findFirst, mirrors
   * PromotionDecisionRepository.findByFromSemesterEnrollmentId's
   * identical treatment of its own single-column unique FK.
   */
  async findByLectureId(lectureId: string): Promise<AttendanceSession | null> {
    return prisma.attendanceSession.findUnique({ where: { lectureId } });
  }

  /**
   * Transaction-scoped counterpart, for the session-opening workflow's
   * "no session already exists for this lecture" check — read inside
   * the same transaction that later calls create(), mirroring
   * PromotionDecisionRepository.findByFromSemesterEnrollmentIdTx's
   * identical relationship to its own create(). This is a best-effort
   * pre-check only; the database's `lectureId @unique` constraint
   * remains the actual concurrency guarantee (a losing concurrent
   * create() raises P2002, not caught here).
   */
  async findByLectureIdTx(tx: Db, lectureId: string): Promise<AttendanceSession | null> {
    return tx.attendanceSession.findUnique({ where: { lectureId } });
  }

  /**
   * Persists exactly `lectureId` + `takenByUserId`. `status` and
   * `lockedAt` are not written at all, so the schema's `@default(OPEN)`
   * and nullable-with-no-default apply. A resulting P2002 (from
   * `lectureId @unique`) is not caught here; it propagates to the
   * service/common error boundary, matching every sibling `create()`.
   */
  async create(tx: Db, input: CreateAttendanceSessionPersistenceInput): Promise<AttendanceSession> {
    return tx.attendanceSession.create({
      data: {
        lectureId: input.lectureId,
        takenByUserId: input.takenByUserId,
      },
    });
  }

  /**
   * Atomic conditional transition: only flips a row still OPEN, mirroring
   * PromotionBatchRepository.finalize()'s identical guarded-updateMany
   * shape for its own DRAFT -> FINALIZED transition. `updateMany` (not
   * `update`) is required because `update`'s `where` only accepts unique
   * fields and cannot express "and status is still OPEN" as a
   * precondition — this is what makes two concurrent lock attempts on
   * the same session unable to both succeed. `null` means either the id
   * doesn't exist or the session was not OPEN at the moment of this
   * statement; the caller is expected to have already read the row (e.g.
   * via findByIdTx) within the same transaction if it needs to
   * distinguish those cases for a specific error message. `lockedAt` is
   * supplied by the caller (the service's clock read), not generated
   * here, matching `finalize(tx, id, finalizedAt: Date)`'s identical
   * treatment of its own timestamp.
   */
  async lock(tx: Db, id: string, lockedAt: Date): Promise<AttendanceSession | null> {
    const { count } = await tx.attendanceSession.updateMany({
      where: { id, status: 'OPEN' },
      data: { status: 'LOCKED', lockedAt },
    });
    if (count === 0) {
      return null;
    }
    return tx.attendanceSession.findUniqueOrThrow({ where: { id } });
  }

  /**
   * `orderBy` is built as an explicit three-branch array (not indexed by
   * a raw string) with a secondary `{ id: sortOrder }` tiebreaker,
   * mirroring PromotionBatchRepository.list()'s identical determinism
   * pattern — required here in particular because `lockedAt` is null for
   * every OPEN session, so many rows can otherwise share the same sort
   * value.
   */
  async list(
    filters: ListAttendanceSessionsFilters,
    options: ListAttendanceSessionsOptions,
  ): Promise<AttendanceSessionListQueryResult> {
    const where: Prisma.AttendanceSessionWhereInput = {
      ...(filters.lectureId !== undefined && { lectureId: filters.lectureId }),
      ...(filters.takenByUserId !== undefined && { takenByUserId: filters.takenByUserId }),
      ...(filters.status !== undefined && { status: filters.status }),
    };

    const orderBy: Prisma.AttendanceSessionOrderByWithRelationInput[] =
      options.sortBy === 'lockedAt'
        ? [{ lockedAt: options.sortOrder }, { id: options.sortOrder }]
        : options.sortBy === 'updatedAt'
          ? [{ updatedAt: options.sortOrder }, { id: options.sortOrder }]
          : [{ createdAt: options.sortOrder }, { id: options.sortOrder }];

    const [attendanceSessions, total] = await Promise.all([
      prisma.attendanceSession.findMany({
        where,
        orderBy,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.attendanceSession.count({ where }),
    ]);

    return { attendanceSessions, total };
  }
}

/**
 * No update()/delete() beyond `correct()` — AttendanceRecord is
 * historical academic data. `attendanceSessionId`/`semesterEnrollmentId`
 * stay fixed at creation; `status` changes only through `correct()`,
 * never a generic field update, matching attendance.types.ts's own
 * reasoning for declining an UpdateAttendanceRecordInput. No singular
 * `create()` either — attendance.types.ts's own MarkAttendanceRecordInput
 * doc comment already declines a dedicated single-record input in favor
 * of a one-element `records` array, so this repository does not invent
 * a single-record create path the domain contract itself avoids;
 * `bulkCreate` below covers one record exactly as well as many.
 */
export class AttendanceRecordRepository {
  async findById(id: string): Promise<AttendanceRecord | null> {
    return prisma.attendanceRecord.findUnique({ where: { id } });
  }

  /**
   * Transaction-scoped counterpart, for the correction workflow's
   * pre-mutation read — the service reads the record's current state
   * inside the same transaction that later calls correct(), mirroring
   * SemesterCatalogRepository.findByIdTx's identical relationship to its
   * own update().
   */
  async findByIdTx(tx: Db, id: string): Promise<AttendanceRecord | null> {
    return tx.attendanceRecord.findUnique({ where: { id } });
  }

  /**
   * Uses the compound unique selector for `@@unique([attendanceSessionId,
   * semesterEnrollmentId])` rather than findFirst — semantically precise
   * and index-friendly, matching
   * PromotionDecisionRepository.findByBatchAndStudent's identical
   * treatment of its own composite unique constraint.
   */
  async findBySessionAndSemesterEnrollment(
    attendanceSessionId: string,
    semesterEnrollmentId: string,
  ): Promise<AttendanceRecord | null> {
    return prisma.attendanceRecord.findUnique({
      where: {
        attendanceSessionId_semesterEnrollmentId: { attendanceSessionId, semesterEnrollmentId },
      },
    });
  }

  /**
   * Transaction-scoped counterpart, mirroring
   * PromotionDecisionRepository.findByBatchAndStudentTx's identical
   * relationship to its own composite lookup — a best-effort pre-check
   * only; the database's composite unique constraint remains the actual
   * concurrency guarantee (a losing concurrent write raises P2002, not
   * caught here).
   */
  async findBySessionAndSemesterEnrollmentTx(
    tx: Db,
    attendanceSessionId: string,
    semesterEnrollmentId: string,
  ): Promise<AttendanceRecord | null> {
    return tx.attendanceRecord.findUnique({
      where: {
        attendanceSessionId_semesterEnrollmentId: { attendanceSessionId, semesterEnrollmentId },
      },
    });
  }

  /**
   * The one write path for creating records, matching
   * BulkMarkAttendanceInput being the only marking contract in
   * attendance.types.ts — a single student is simply a one-element
   * `inputs` array. Uses `createMany`, NOT `skipDuplicates: true`: a
   * duplicate `(attendanceSessionId, semesterEnrollmentId)` pair
   * indicates a genuine client/programming error, and silently dropping
   * it would let the API report success while under-persisting the
   * requested roster — the same reasoning
   * PromotionDecisionRepository.create's plain `create` (never
   * `upsert`) reflects for its own unique constraint. The resulting
   * P2002 is not caught here; it propagates to the service/common error
   * boundary. `inputs` is read, never mutated or reordered — each
   * element is written in place with its own explicit field list, so no
   * caller-supplied field beyond the four in
   * `CreateAttendanceRecordPersistenceInput` can reach the database.
   * `createMany`'s own return value is the raw `{ count }`, not the
   * inserted rows (Postgres `createMany` does not return rows); see
   * `findAllBySessionIdTx` below for reading the persisted set back
   * within the same transaction.
   */
  async bulkCreate(
    tx: Db,
    inputs: readonly CreateAttendanceRecordPersistenceInput[],
  ): Promise<Prisma.BatchPayload> {
    return tx.attendanceRecord.createMany({
      data: inputs.map((input) => ({
        attendanceSessionId: input.attendanceSessionId,
        semesterEnrollmentId: input.semesterEnrollmentId,
        status: input.status,
        markedByUserId: input.markedByUserId,
      })),
    });
  }

  /**
   * Returns EVERY record for this session — deliberately NOT paginated,
   * mirroring PromotionDecisionRepository.findAllByBatchIdTx's identical
   * "read the complete set this transaction just wrote" purpose. Exists
   * specifically so attendance.service.ts can read back the rows
   * `bulkCreate` just persisted (which `createMany` itself does not
   * return) within the SAME transaction, for mapping into the bulk-mark
   * API response. Transaction-scoped only — no non-tx counterpart, since
   * its one purpose is reading consistently alongside the mutation that
   * precedes it in the same transaction. Ordered by `id` for
   * deterministic output, matching findAllByBatchIdTx's identical
   * tiebreaker choice.
   */
  async findAllBySessionIdTx(tx: Db, attendanceSessionId: string): Promise<AttendanceRecord[]> {
    return tx.attendanceRecord.findMany({
      where: { attendanceSessionId },
      orderBy: { id: 'asc' },
    });
  }

  /**
   * Updates all four correction fields together in one write — `status`,
   * `correctedAt`, `correctionReason`, `correctedByUserId` — never just
   * `status` alone, respecting the migration's DB CHECK that
   * `correctedAt`/`correctionReason` are both set or both null together.
   * A plain `update` by the unique `id`, not a guarded `updateMany`:
   * unlike AttendanceSession's OPEN -> LOCKED transition or
   * PromotionDecision's null -> set `toSemesterEnrollmentId` transition,
   * nothing in the current schema restricts a record to being corrected
   * only once, so there is no persistence-level "still uncorrected"
   * precondition to guard against — whether THIS correction is currently
   * permitted (e.g. because the owning session is locked) is a
   * service-layer decision made before this method is ever called. If
   * `id` doesn't match an existing row, Prisma throws P2025 — mapped to
   * a clean 404 by the centralized Prisma error mapper, matching
   * SemesterCatalogRepository.update's identical plain-`id`-selector
   * reasoning.
   */
  async correct(
    tx: Db,
    id: string,
    input: CorrectAttendanceRecordPersistenceInput,
  ): Promise<AttendanceRecord> {
    return tx.attendanceRecord.update({
      where: { id },
      data: {
        status: input.status,
        correctedAt: input.correctedAt,
        correctionReason: input.correctionReason,
        correctedByUserId: input.correctedByUserId,
      },
    });
  }

  /**
   * `orderBy` mirrors AttendanceSessionRepository.list()'s array + `id`
   * tiebreaker shape — required here because `correctedAt` is null for
   * every never-corrected record, so many rows can otherwise share the
   * same sort value.
   */
  async list(
    filters: ListAttendanceRecordsFilters,
    options: ListAttendanceRecordsOptions,
  ): Promise<AttendanceRecordListQueryResult> {
    const where: Prisma.AttendanceRecordWhereInput = {
      ...(filters.attendanceSessionId !== undefined && {
        attendanceSessionId: filters.attendanceSessionId,
      }),
      ...(filters.semesterEnrollmentId !== undefined && {
        semesterEnrollmentId: filters.semesterEnrollmentId,
      }),
      ...(filters.status !== undefined && { status: filters.status }),
      ...(filters.markedByUserId !== undefined && { markedByUserId: filters.markedByUserId }),
      ...(filters.correctedByUserId !== undefined && {
        correctedByUserId: filters.correctedByUserId,
      }),
    };

    const orderBy: Prisma.AttendanceRecordOrderByWithRelationInput[] =
      options.sortBy === 'correctedAt'
        ? [{ correctedAt: options.sortOrder }, { id: options.sortOrder }]
        : options.sortBy === 'updatedAt'
          ? [{ updatedAt: options.sortOrder }, { id: options.sortOrder }]
          : [{ createdAt: options.sortOrder }, { id: options.sortOrder }];

    const [attendanceRecords, total] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where,
        orderBy,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
      }),
      prisma.attendanceRecord.count({ where }),
    ]);

    return { attendanceRecords, total };
  }
}

export const attendanceSessionRepository = new AttendanceSessionRepository();
export const attendanceRecordRepository = new AttendanceRecordRepository();
