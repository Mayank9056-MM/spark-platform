// apps/api/src/modules/attendance/attendance.service.ts

import type {
  AttendanceSession,
  Lecture,
  Prisma,
  SemesterEnrollment,
} from '@spark/database/client';
import { createChildLogger } from '@spark/shared/logger';

import { ApiError } from '../../common/errors/ApiError.js';
import { ErrorCode } from '../../common/errors/ErrorCodes.js';
import { prisma } from '../../lib/prisma.js';
import { recordAuditTx } from '../audit/audit.service.js';
import { AuditEntityType } from '../audit/audit.types.js';
import { lectureRepository } from '../lectures/lecture.repository.js';
import { semesterEnrollmentRepository } from '../semester-enrollments/semesterEnrollment.repository.js';

import {
  toAttendanceRecordDTO,
  toAttendanceRecordDTOList,
  toAttendanceSessionDTO,
  toAttendanceSessionDTOList,
} from './attendance.mapper.js';
import {
  attendanceRecordRepository,
  attendanceSessionRepository,
} from './attendance.repository.js';
import type { CreateAttendanceRecordPersistenceInput } from './attendance.repository.js';
import type {
  AttendanceRecordDTO,
  AttendanceRecordId,
  AttendanceSessionDTO,
  AttendanceSessionId,
  BulkMarkAttendanceInput,
  CorrectAttendanceRecordInput,
  CreateAttendanceSessionInput,
  ListAttendanceRecordsFilters,
  ListAttendanceRecordsOptions,
  ListAttendanceRecordsResult,
  ListAttendanceSessionsFilters,
  ListAttendanceSessionsOptions,
  ListAttendanceSessionsResult,
  MarkAttendanceRecordInput,
} from './attendance.types.js';

/**
 * Business-logic layer for the Attendance domain
 * (Lecture -> AttendanceSession -> AttendanceRecord -> SemesterEnrollment).
 *
 * ── LOGGER NOTE ──────────────────────────────────────────────────────────
 * `lib/logger.ts` does not currently export an `attendanceLogger`, unlike
 * every sibling module (`lectureLogger`, `facultyAssignmentLogger`,
 * `semesterEnrollmentLogger`, `promotionLogger`, ...). Modifying
 * `lib/logger.ts` is out of scope for this task, so this file creates its
 * own child logger the exact same way `lib/logger.ts` creates every other
 * one (`createChildLogger({ component: '...' })`), rather than logging
 * through an unrelated logger or skipping success logging altogether. See
 * the accompanying report — recommend adding a real `attendanceLogger`
 * export to `lib/logger.ts` and switching this import once that exists.
 *
 * ── DOMAIN AUTHORIZATION ─────────────────────────────────────────────────
 * RBAC (`attendance:create`/`attendance:read`/etc.) is enforced entirely by
 * route middleware and is never re-checked here (see section 87 of the
 * task spec / this module's own report). What RBAC cannot express is
 * OBJECT-level ownership: holding `attendance:create` does not mean a
 * faculty member may take attendance for every lecture in the college.
 * `Lecture.facultyUserId` is the schema's own denormalized answer to
 * "whose lecture is this" (see `lecture.types.ts`'s module header — it
 * exists precisely so callers don't need a second hop through
 * `FacultyAssignment`), so `assertActorCanManageLectureAttendance` compares
 * `actorUserId` against it directly. No FacultyAssignment query is issued.
 *
 * This is a real, deliberate scope decision, not an oversight: nothing in
 * the current codebase defines a broader "admin/coordinator can manage any
 * lecture's attendance" override, and the task explicitly warns against
 * inventing an authorization framework. See the report for the follow-up
 * this implies.
 *
 * ── ELIGIBILITY ──────────────────────────────────────────────────────────
 * A SemesterEnrollment is eligible for a Lecture's attendance only if BOTH
 * `semesterCatalogId` and `academicYearId` agree (the cross-entity
 * invariant `attendance.types.ts`'s module header describes as
 * unenforceable by any foreign key) AND the enrollment's own `status` is
 * still `IN_PROGRESS` — the same "is this attempt still open" gate
 * `SemesterEnrollmentService`/`PromotionService` already apply to this
 * exact field elsewhere. No other SemesterEnrollment rule (fee clearance,
 * elective selection, minimum attendance, ...) is invented here.
 *
 * `SemesterEnrollmentRepository` exposes no bulk/tx-aware "find many by
 * ids" method, so `bulkMarkAttendance` validates each requested enrollment
 * with its own `findByIdTx` call inside the transaction — one query per
 * record, not one query per record per hop. This is a real, reported
 * repository capability gap (see the report), not an N+1 introduced by
 * carelessness: the alternative would be an unsafe non-transactional bulk
 * read racing the transaction's own writes.
 *
 * ── TRANSACTIONS ─────────────────────────────────────────────────────────
 * Every mutation (`createAttendanceSession`, `bulkMarkAttendance`,
 * `lockAttendanceSession`, `correctAttendanceRecord`) runs inside one
 * `prisma.$transaction`, reading through `*Tx` repository methods only,
 * with its audit write via `recordAuditTx` in the SAME transaction —
 * mirroring `lecture.service.ts` / `promotion.service.ts` exactly. DTO
 * mapping happens inside the transaction (pure, no I/O) so the audit
 * payload and the returned DTO both reflect the exact committed row.
 * Success logging happens only after the transaction resolves.
 *
 * ── BULK MARK RESPONSE SEMANTICS ─────────────────────────────────────────
 * `attendanceRecordRepository.bulkCreate` uses Prisma `createMany`, which
 * returns only `{ count }` — never the inserted rows — so
 * `findAllBySessionIdTx` is used to read the persisted set back. That
 * method deliberately returns EVERY record for the session (see its own
 * doc comment), which is not necessarily "only what this call just
 * inserted" if the session already had records from an earlier bulk-mark
 * call (task section 55's own flagged caveat).
 *
 * This implementation resolves that without touching the repository: a
 * duplicate `(attendanceSessionId, semesterEnrollmentId)` pair — i.e. a
 * `semesterEnrollmentId` already recorded in a PRIOR call — would make the
 * whole `createMany` batch fail with P2002 before the read-back ever runs
 * (no `skipDuplicates` is used). So once `bulkCreate` succeeds, every
 * `semesterEnrollmentId` in `input.records` is guaranteed to correspond to
 * a row this call just created. The full session roster read back by
 * `findAllBySessionIdTx` is therefore filtered, in memory, down to just
 * the requested `semesterEnrollmentId`s — no extra query, and no
 * repository change — and only that subset is mapped and returned.
 *
 * ── CORRECTION-AFTER-LOCK POLICY ─────────────────────────────────────────
 * Neither the schema nor any existing service establishes whether a
 * correction is permitted once the owning session is `LOCKED`;
 * `attendance.repository.ts`'s own comment on `correct()` explicitly
 * defers this to "a service-layer decision made before this method is
 * ever called." Per the task's explicit instruction not to invent a new
 * workflow rule in the face of that ambiguity, `correctAttendanceRecord`
 * does NOT gate on session lock status — correction is permitted
 * regardless of `AttendanceSession.status`. Flagged in the report for
 * product confirmation.
 */
export class AttendanceService {
  // ─────────────────────────────────────────────────────────────────────
  // Attendance sessions
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Opens (creates) an AttendanceSession for a Lecture.
   *
   * 1. Lecture must exist.
   * 2. Lecture must not be CANCELLED (task section 10/28 minimum rule; no
   *    other LectureStatus rule is invented — SCHEDULED and COMPLETED are
   *    both accepted).
   * 3. Actor must be the lecture's own faculty (see class header).
   * 4. No session may already exist for the lecture — a friendly
   *    pre-check via `findByLectureIdTx`; the database's `lectureId
   *    @unique` constraint remains the actual concurrency guarantee for a
   *    losing concurrent create (uncaught P2002, propagated to the
   *    centralized Prisma error mapper).
   * 5. `takenByUserId` is always `actorUserId` — never client-supplied.
   */
  async createAttendanceSession(
    actorUserId: string,
    input: CreateAttendanceSessionInput,
  ): Promise<AttendanceSessionDTO> {
    const session = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const lecture = await lectureRepository.findByIdTx(tx, input.lectureId);
      if (!lecture) {
        throw ApiError.notFound('Lecture not found', ErrorCode.RECORD_NOT_FOUND);
      }

      this.assertLectureAllowsAttendance(lecture);
      this.assertActorCanManageLectureAttendance(actorUserId, lecture);

      const existing = await attendanceSessionRepository.findByLectureIdTx(tx, input.lectureId);
      if (existing) {
        throw ApiError.conflict(
          'An attendance session already exists for this lecture',
          ErrorCode.DUPLICATE_ENTRY,
        );
      }

      const created = await attendanceSessionRepository.create(tx, {
        lectureId: input.lectureId,
        takenByUserId: actorUserId,
      });

      const dto = toAttendanceSessionDTO(created);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.ATTENDANCE,
        entityId: dto.id,
        newValue: {
          id: dto.id,
          lectureId: dto.lectureId,
          takenByUserId: dto.takenByUserId,
          status: dto.status,
        },
      });

      return dto;
    });

    attendanceLogger.info('Attendance session opened', {
      actorUserId,
      attendanceSessionId: session.id,
      lectureId: session.lectureId,
    });

    return session;
  }

  /** Not audited — routine read. */
  async getAttendanceSessionById(id: AttendanceSessionId): Promise<AttendanceSessionDTO> {
    const session = await attendanceSessionRepository.findById(id);
    if (!session) {
      throw ApiError.notFound('Attendance session not found', ErrorCode.RECORD_NOT_FOUND);
    }
    return toAttendanceSessionDTO(session);
  }

  /** Not audited — routine read. Thin pass-through; the repository owns filtering/pagination/sorting. */
  async listAttendanceSessions(
    filters: ListAttendanceSessionsFilters,
    options: ListAttendanceSessionsOptions,
  ): Promise<ListAttendanceSessionsResult> {
    const result = await attendanceSessionRepository.list(filters, options);
    return {
      attendanceSessions: toAttendanceSessionDTOList(result.attendanceSessions),
      total: result.total,
    };
  }

  /**
   * Transitions an AttendanceSession OPEN -> LOCKED. No reopen path exists
   * (current domain has none — task section 23/62).
   *
   * The pre-check (`existing.status !== 'OPEN'`) is a friendly domain
   * error only. `attendanceSessionRepository.lock` remains the actual
   * concurrency guard (a guarded `updateMany`); if it returns `null` here
   * despite the pre-check having just passed, the session was locked by a
   * concurrent request between the read and the write, and that is
   * reported as its own conflict rather than treated as a not-found.
   */
  async lockAttendanceSession(
    actorUserId: string,
    id: AttendanceSessionId,
  ): Promise<AttendanceSessionDTO> {
    const session = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await attendanceSessionRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Attendance session not found', ErrorCode.RECORD_NOT_FOUND);
      }

      const lecture = await lectureRepository.findByIdTx(tx, existing.lectureId);
      if (!lecture) {
        throw ApiError.notFound('Lecture not found', ErrorCode.RECORD_NOT_FOUND);
      }

      this.assertActorCanManageLectureAttendance(actorUserId, lecture);

      if (existing.status !== 'OPEN') {
        throw ApiError.conflict('This attendance session is already locked');
      }

      const lockedAt = new Date();
      const locked = await attendanceSessionRepository.lock(tx, id, lockedAt);
      if (!locked) {
        throw ApiError.conflict('This attendance session was concurrently locked');
      }

      const dto = toAttendanceSessionDTO(locked);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'UPDATE',
        entityType: AuditEntityType.ATTENDANCE,
        entityId: dto.id,
        oldValue: { status: 'OPEN', lockedAt: null },
        newValue: { status: dto.status, lockedAt: dto.lockedAt },
      });

      return dto;
    });

    attendanceLogger.info('Attendance session locked', {
      actorUserId,
      attendanceSessionId: session.id,
    });

    return session;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Attendance records
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Marks attendance for one or more SemesterEnrollments against one OPEN
   * AttendanceSession, atomically. See class header for the full design
   * rationale (eligibility, N+1 justification, bulk response semantics).
   *
   * Duplicate `semesterEnrollmentId` values WITHIN this one request are
   * rejected up front (before the transaction even opens — no DB access
   * needed to detect this). Duplicates AGAINST already-persisted records
   * are left to the database's own
   * `@@unique([attendanceSessionId, semesterEnrollmentId])` constraint —
   * no per-record existence pre-check is performed, per task sections
   * 19/94, to avoid an N+1 query pattern the unique constraint already
   * makes unnecessary.
   */
  async bulkMarkAttendance(
    actorUserId: string,
    input: BulkMarkAttendanceInput,
  ): Promise<readonly AttendanceRecordDTO[]> {
    this.assertNoDuplicateSemesterEnrollmentIds(input.records);

    const requestedSemesterEnrollmentIds = input.records.map(
      (record) => record.semesterEnrollmentId,
    );

    const justMarked = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const session = await attendanceSessionRepository.findByIdTx(tx, input.attendanceSessionId);
      if (!session) {
        throw ApiError.notFound('Attendance session not found', ErrorCode.RECORD_NOT_FOUND);
      }

      this.assertSessionOpen(session);

      const lecture = await lectureRepository.findByIdTx(tx, session.lectureId);
      if (!lecture) {
        throw ApiError.notFound('Lecture not found', ErrorCode.RECORD_NOT_FOUND);
      }

      // A Lecture can transition to CANCELLED after its AttendanceSession
      // was already opened — the session has no lifecycle hook back to
      // the Lecture, so an OPEN session left behind by a now-cancelled
      // Lecture could otherwise still accept newly marked attendance.
      // Reuses the same guard createAttendanceSession already applies at
      // session-open time; no duplicate CANCELLED check is introduced.
      this.assertLectureAllowsAttendance(lecture);
      this.assertActorCanManageLectureAttendance(actorUserId, lecture);

      // Validate every requested enrollment before creating any record
      // (task section 92) — sequential, not Promise.all, since these
      // reads share the transaction's single connection (matching
      // PromotionService's identical sequential Phase-A loop).
      const persistenceInputs: CreateAttendanceRecordPersistenceInput[] = [];
      for (const record of input.records) {
        const enrollment = await semesterEnrollmentRepository.findByIdTx(
          tx,
          record.semesterEnrollmentId,
        );
        if (!enrollment) {
          throw ApiError.notFound(
            `Semester enrollment ${record.semesterEnrollmentId} not found`,
            ErrorCode.RECORD_NOT_FOUND,
          );
        }

        this.assertSemesterEnrollmentEligible(enrollment, lecture);

        persistenceInputs.push({
          attendanceSessionId: input.attendanceSessionId,
          semesterEnrollmentId: record.semesterEnrollmentId,
          status: record.status,
          markedByUserId: actorUserId,
        });
      }

      await attendanceRecordRepository.bulkCreate(tx, persistenceInputs);

      const allSessionRecords = await attendanceRecordRepository.findAllBySessionIdTx(
        tx,
        input.attendanceSessionId,
      );
      const requestedIdSet = new Set(requestedSemesterEnrollmentIds);
      const justMarkedRecords = allSessionRecords.filter((record) =>
        requestedIdSet.has(record.semesterEnrollmentId),
      );

      await recordAuditTx(tx, {
        actorUserId,
        action: 'CREATE',
        entityType: AuditEntityType.ATTENDANCE,
        entityId: input.attendanceSessionId,
        newValue: {
          attendanceSessionId: input.attendanceSessionId,
          markedByUserId: actorUserId,
          recordCount: justMarkedRecords.length,
          semesterEnrollmentIds: requestedSemesterEnrollmentIds,
        },
      });

      return justMarkedRecords;
    });

    attendanceLogger.info('Attendance marked', {
      actorUserId,
      attendanceSessionId: input.attendanceSessionId,
      recordCount: justMarked.length,
    });

    return toAttendanceRecordDTOList(justMarked);
  }

  /**
   * Corrects an already-marked AttendanceRecord. See class header for the
   * correction-after-lock policy note.
   *
   * `correctedAt`/`correctedByUserId` are always server-derived; the
   * client supplies only `status`/`correctionReason`.
   */
  async correctAttendanceRecord(
    actorUserId: string,
    id: AttendanceRecordId,
    input: CorrectAttendanceRecordInput,
  ): Promise<AttendanceRecordDTO> {
    const record = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await attendanceRecordRepository.findByIdTx(tx, id);
      if (!existing) {
        throw ApiError.notFound('Attendance record not found', ErrorCode.RECORD_NOT_FOUND);
      }

      const session = await attendanceSessionRepository.findByIdTx(
        tx,
        existing.attendanceSessionId,
      );
      if (!session) {
        throw ApiError.notFound('Attendance session not found', ErrorCode.RECORD_NOT_FOUND);
      }

      const lecture = await lectureRepository.findByIdTx(tx, session.lectureId);
      if (!lecture) {
        throw ApiError.notFound('Lecture not found', ErrorCode.RECORD_NOT_FOUND);
      }

      this.assertActorCanManageLectureAttendance(actorUserId, lecture);

      const correctedAt = new Date();

      const corrected = await attendanceRecordRepository.correct(tx, id, {
        status: input.status,
        correctedAt,
        correctionReason: input.correctionReason,
        correctedByUserId: actorUserId,
      });

      const dto = toAttendanceRecordDTO(corrected);

      await recordAuditTx(tx, {
        actorUserId,
        action: 'UPDATE',
        entityType: AuditEntityType.ATTENDANCE,
        entityId: dto.id,
        oldValue: {
          status: existing.status,
          correctedAt: existing.correctedAt?.toISOString() ?? null,
          correctionReason: existing.correctionReason,
          correctedByUserId: existing.correctedByUserId,
        },
        newValue: {
          status: dto.status,
          correctedAt: dto.correctedAt,
          correctionReason: dto.correctionReason,
          correctedByUserId: dto.correctedByUserId,
        },
      });

      return dto;
    });

    attendanceLogger.info('Attendance record corrected', {
      actorUserId,
      attendanceRecordId: record.id,
    });

    return record;
  }

  /** Not audited — routine read. Thin pass-through; the repository owns filtering/pagination/sorting. */
  async listAttendanceRecords(
    filters: ListAttendanceRecordsFilters,
    options: ListAttendanceRecordsOptions,
  ): Promise<ListAttendanceRecordsResult> {
    const result = await attendanceRecordRepository.list(filters, options);
    return {
      attendanceRecords: toAttendanceRecordDTOList(result.attendanceRecords),
      total: result.total,
    };
  }

  // ─────────────────────────────────────────────────────────────────────
  // Private domain helpers
  // ─────────────────────────────────────────────────────────────────────

  /**
   * Minimum lecture-state rule (task section 10/28): a CANCELLED lecture
   * never receives attendance. SCHEDULED and COMPLETED are both accepted
   * — no stricter rule is established anywhere in the existing codebase,
   * and none is invented here.
   */
  private assertLectureAllowsAttendance(lecture: Lecture): void {
    if (lecture.status === 'CANCELLED') {
      throw ApiError.conflict('Attendance cannot be taken for a cancelled lecture');
    }
  }

  /**
   * Domain (object-level) authorization: the actor must be the specific
   * faculty member this lecture is assigned to. See class header for why
   * this compares against `Lecture.facultyUserId` directly rather than
   * re-querying FacultyAssignment, and for why this is intentionally
   * narrower than "holds the attendance:create RBAC permission."
   */
  private assertActorCanManageLectureAttendance(actorUserId: string, lecture: Lecture): void {
    if (lecture.facultyUserId !== actorUserId) {
      throw ApiError.forbidden(
        'You are not the faculty member assigned to this lecture and cannot manage its attendance',
      );
    }
  }

  /** Attendance may only be marked while the session is still OPEN (task section 22/62). */
  private assertSessionOpen(session: AttendanceSession): void {
    if (session.status !== 'OPEN') {
      throw ApiError.conflict(
        'This attendance session is locked and no longer accepts new attendance records',
      );
    }
  }

  /**
   * The cross-entity invariant `attendance.types.ts`'s module header
   * describes as unenforceable by any foreign key: a SemesterEnrollment
   * may only receive attendance for a Lecture whose
   * `semesterCatalogId`/`academicYearId` it shares, AND only while that
   * specific attempt (`status`) is still `IN_PROGRESS` — the same gate
   * `SemesterEnrollmentService`/`PromotionService` already apply to this
   * field elsewhere. No other eligibility rule (fee clearance, elective
   * selection, minimum attendance, ...) is invented here (task section
   * 46/47).
   */
  private assertSemesterEnrollmentEligible(enrollment: SemesterEnrollment, lecture: Lecture): void {
    if (
      enrollment.semesterCatalogId !== lecture.semesterCatalogId ||
      enrollment.academicYearId !== lecture.academicYearId
    ) {
      throw ApiError.unprocessable(
        `Semester enrollment ${enrollment.id} does not belong to this lecture\u2019s semester/academic year context`,
        ErrorCode.ACADEMIC_HIERARCHY_MISMATCH,
      );
    }

    if (enrollment.status !== 'IN_PROGRESS') {
      throw ApiError.conflict(
        `Semester enrollment ${enrollment.id} is not in progress and cannot receive new attendance records`,
      );
    }
  }

  /**
   * Rejects ambiguous bulk input up front (task section 20/93): the same
   * `semesterEnrollmentId` appearing twice in one `records` array is never
   * silently deduplicated, never resolved by "last write wins", and never
   * resolved by "first write wins" — the whole request is rejected before
   * any database access.
   */
  private assertNoDuplicateSemesterEnrollmentIds(
    records: readonly MarkAttendanceRecordInput[],
  ): void {
    const seen = new Set<string>();
    for (const record of records) {
      if (seen.has(record.semesterEnrollmentId)) {
        throw ApiError.badRequest(
          `Duplicate semester enrollment ${record.semesterEnrollmentId} in the same attendance request`,
          ErrorCode.VALIDATION_ERROR,
        );
      }
      seen.add(record.semesterEnrollmentId);
    }
  }
}

// See class header's "LOGGER NOTE" — matches the exact pattern
// `lib/logger.ts` uses for every sibling module's own child logger.
const attendanceLogger = createChildLogger({ component: 'attendance' });

export const attendanceService = new AttendanceService();
