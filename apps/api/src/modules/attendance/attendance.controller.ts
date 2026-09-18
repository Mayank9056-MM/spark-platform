// apps/api/src/modules/attendance/attendance.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../common/responses/ApiResponse.js';

import { attendanceService } from './attendance.service.js';
import type {
  BulkMarkAttendanceInput,
  CorrectAttendanceRecordInput,
  CreateAttendanceSessionInput,
  ListAttendanceRecordsFilters,
  ListAttendanceRecordsOptions,
  ListAttendanceSessionsFilters,
  ListAttendanceSessionsOptions,
} from './attendance.types.js';
import type {
  AttendanceRecordIdParams,
  AttendanceSessionIdParams,
  BulkMarkAttendanceBody,
  CorrectAttendanceRecordBody,
  CreateAttendanceSessionBody,
  ListAttendanceRecordsQuery,
  ListAttendanceSessionsQuery,
} from './attendance.validation.js';

/**
 * Thin HTTP adapter over AttendanceService — matches lecture.controller.ts /
 * promotion.controller.ts exactly: plain exported async functions (no
 * class), no Prisma, no repository, no business logic, no RBAC decisions,
 * no duplicated validation. Every handler assumes route middleware has
 * already run requireAuth -> authorize(...) -> validate(...) in that order
 * (see attendance.routes.ts), so req.user is set and
 * req.valid.{body,params,query} already holds validated, coerced data.
 *
 * Seven handlers, matching AttendanceService's seven public methods
 * exactly — createAttendanceSession, getAttendanceSessionById,
 * listAttendanceSessions, lockAttendanceSession, bulkMarkAttendance,
 * correctAttendanceRecord, listAttendanceRecords. No handler exists for
 * update/delete/reopen/unlock/cancel on either AttendanceSession or
 * AttendanceRecord: the service has no such method, and inventing an
 * endpoint with nothing behind it is out of scope.
 *
 * ── ACTOR IDENTITY ───────────────────────────────────────────────────────
 * Every mutation handler reads `actorUserId` from `req.user!.id` — set by
 * requireAuth — and forwards it as the service's own first argument,
 * exactly matching lecture.controller.ts's createLecture and
 * promotion.controller.ts's every mutation handler. No handler reads an
 * actor id from body/query/params. In particular: createAttendanceSession
 * never reads a `takenByUserId` from the body (there is none —
 * CreateAttendanceSessionBody carries only `lectureId`); bulkMarkAttendance
 * never reads a `markedByUserId` (there is none — each record in
 * BulkMarkAttendanceBody carries only `semesterEnrollmentId`/`status`);
 * correctAttendanceRecord never reads `correctedAt`/`correctedByUserId`
 * (neither exists on CorrectAttendanceRecordBody — both are server-derived
 * inside the service). This file could not accept any of those fields even
 * if it tried to, because attendance.validation.ts's schemas already strip
 * them; this comment records that the controller also never attempts to.
 *
 * ── NO DOMAIN LOGIC ──────────────────────────────────────────────────────
 * No handler here checks Lecture.status, AttendanceSession.status,
 * SemesterEnrollment.status, or `actorUserId === lecture.facultyUserId`.
 * No handler iterates `records`, deduplicates IDs, or calls a repository.
 * Every one of those is AttendanceService's job (see attendance.service.ts's
 * own class header) — this file only shapes validated HTTP input into the
 * service's existing input types and forwards the service's output through
 * ApiResponse.
 *
 * ── RESPONSE CODES ───────────────────────────────────────────────────────
 * createAttendanceSession / bulkMarkAttendance -> ApiResponse.created (201):
 * both create new persisted rows (one AttendanceSession; one-or-more
 * AttendanceRecords), matching lecture.controller.ts's createLecture and
 * promotion.controller.ts's createPromotionDecision.
 * getAttendanceSessionById / listAttendanceSessions / listAttendanceRecords
 * -> ApiResponse.ok / ApiResponse.paginated (200): reads.
 * lockAttendanceSession / correctAttendanceRecord -> ApiResponse.ok (200):
 * both mutate an EXISTING row in place rather than creating a new one,
 * matching promotion.controller.ts's finalizePromotionBatch (also a
 * one-way in-place lifecycle transition) using ApiResponse.ok rather than
 * ApiResponse.created.
 *
 * ── LIST FILTER CONSTRUCTION ─────────────────────────────────────────────
 * Both list handlers build their `filters` object with a conditional spread
 * per optional field — matching lecture.controller.ts's listLectures and
 * promotion.controller.ts's listPromotionBatches exactly — rather than
 * spreading the whole validated query object. Under
 * `exactOptionalPropertyTypes: true`, an optional filter key must be
 * entirely ABSENT when unset, not present-with-value-undefined; a bare
 * `{ ...query }` would leave e.g. `lectureId: undefined` on the object
 * whenever the client omitted it, which does not satisfy
 * `ListAttendanceSessionsFilters`'s `lectureId?: LectureId`. `page` /
 * `limit` / `sortBy` / `sortOrder` are NOT conditionally spread — every one
 * of them has a Zod `.default(...)`, so they are always present after
 * validation, exactly like every sibling list handler's identical
 * treatment of its own pagination/sort fields.
 *
 * ── BULK MARK / CORRECTION INPUT ─────────────────────────────────────────
 * `bulkMarkAttendance`'s `records` array is forwarded to the service
 * UNCHANGED — no per-record mapping, no iteration, no duplicate check.
 * `BulkMarkAttendanceBody.records` (each `{ semesterEnrollmentId, status
 * }`, from `markAttendanceRecordSchema`) is already structurally identical
 * to `MarkAttendanceRecordInput`, so the validated array is assignable to
 * `BulkMarkAttendanceInput.records` with no cast. Same reasoning for
 * `correctAttendanceRecord`: `CorrectAttendanceRecordBody` (`status`,
 * `correctionReason`) is forwarded as `CorrectAttendanceRecordInput`
 * unchanged.
 */

// ── Attendance sessions ────────────────────────────────────────────────

export const createAttendanceSession = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as CreateAttendanceSessionBody;
  const actorUserId = req.user!.id;

  const input: CreateAttendanceSessionInput = {
    lectureId: body.lectureId,
  };

  const session = await attendanceService.createAttendanceSession(actorUserId, input);

  ApiResponse.created(res, session, 'Attendance session created');
};

export const getAttendanceSessionById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as AttendanceSessionIdParams;

  const session = await attendanceService.getAttendanceSessionById(params.id);

  ApiResponse.ok(res, session);
};

export const listAttendanceSessions = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListAttendanceSessionsQuery;

  const filters: ListAttendanceSessionsFilters = {
    ...(query.lectureId !== undefined && { lectureId: query.lectureId }),
    ...(query.takenByUserId !== undefined && { takenByUserId: query.takenByUserId }),
    ...(query.status !== undefined && { status: query.status }),
  };

  const options: ListAttendanceSessionsOptions = {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };

  const result = await attendanceService.listAttendanceSessions(filters, options);

  // attendanceService returns `readonly AttendanceSessionDTO[]`;
  // ApiResponse.paginated takes `T[]`, so it is spread into a fresh
  // mutable array here rather than widening either signature — matching
  // lecture.controller.ts's listLectures / promotion.controller.ts's
  // listPromotionBatches exactly. No pagination math happens here;
  // ApiResponse.paginated derives totalPages from `total`.
  ApiResponse.paginated(res, [...result.attendanceSessions], {
    page: query.page,
    limit: query.limit,
    total: result.total,
  });
};

/**
 * Dedicated domain command, not a generic PATCH — no request body.
 * The controller does not know (and must not encode) whether the session
 * is currently OPEN, whether locking it is even valid right now, or what
 * happens to it once locked; all of that is lockAttendanceSession's
 * concern in the service, exactly mirroring
 * promotion.controller.ts's finalizePromotionBatch.
 */
export const lockAttendanceSession = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as AttendanceSessionIdParams;
  const actorUserId = req.user!.id;

  const session = await attendanceService.lockAttendanceSession(actorUserId, params.id);

  ApiResponse.ok(res, session, 'Attendance session locked');
};

// ── Attendance records ───────────────────────────────────────────────────

/**
 * `input.records` is `body.records` forwarded unchanged — see file header.
 * No loop, no duplicate-ID check, no per-student eligibility check: all
 * three are assertNoDuplicateSemesterEnrollmentIds /
 * assertSemesterEnrollmentEligible's job inside
 * attendanceService.bulkMarkAttendance.
 */
export const bulkMarkAttendance = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as BulkMarkAttendanceBody;
  const actorUserId = req.user!.id;

  const input: BulkMarkAttendanceInput = {
    attendanceSessionId: body.attendanceSessionId,
    records: body.records,
  };

  const records = await attendanceService.bulkMarkAttendance(actorUserId, input);

  // attendanceService returns `readonly AttendanceRecordDTO[]`; spread for
  // the same reason as listAttendanceSessions above.
  ApiResponse.created(res, [...records], 'Attendance marked');
};

/**
 * `correctedAt`/`correctedByUserId` are never read from the request —
 * CorrectAttendanceRecordBody has no such keys (attendance.validation.ts
 * strips them structurally); the service derives both from `actorUserId`
 * and the clock. This handler forwards exactly `status` +
 * `correctionReason`, nothing else.
 */
export const correctAttendanceRecord = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as AttendanceRecordIdParams;
  const body = req.valid?.body as CorrectAttendanceRecordBody;
  const actorUserId = req.user!.id;

  const input: CorrectAttendanceRecordInput = {
    status: body.status,
    correctionReason: body.correctionReason,
  };

  const record = await attendanceService.correctAttendanceRecord(actorUserId, params.id, input);

  ApiResponse.ok(res, record, 'Attendance record corrected');
};

export const listAttendanceRecords = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListAttendanceRecordsQuery;

  const filters: ListAttendanceRecordsFilters = {
    ...(query.attendanceSessionId !== undefined && {
      attendanceSessionId: query.attendanceSessionId,
    }),
    ...(query.semesterEnrollmentId !== undefined && {
      semesterEnrollmentId: query.semesterEnrollmentId,
    }),
    ...(query.status !== undefined && { status: query.status }),
    ...(query.markedByUserId !== undefined && { markedByUserId: query.markedByUserId }),
    ...(query.correctedByUserId !== undefined && {
      correctedByUserId: query.correctedByUserId,
    }),
  };

  const options: ListAttendanceRecordsOptions = {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };

  const result = await attendanceService.listAttendanceRecords(filters, options);

  ApiResponse.paginated(res, [...result.attendanceRecords], {
    page: query.page,
    limit: query.limit,
    total: result.total,
  });
};
