// apps/api/src/modules/student-enrollments/studentEnrollment.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../common/responses/ApiResponse.js';

import { studentEnrollmentService } from './studentEnrollment.service.js';
import type {
  CancelStudentEnrollmentInput,
  CreateStudentEnrollmentInput,
  ListStudentEnrollmentsFilters,
  UpdateStudentEnrollmentInput,
  WithdrawStudentEnrollmentInput,
} from './studentEnrollment.types.js';
import type {
  CancelStudentEnrollmentBody,
  CreateStudentEnrollmentBody,
  ListStudentEnrollmentsQuery,
  StudentEnrollmentIdParams,
  UpdateStudentEnrollmentBody,
  WithdrawStudentEnrollmentBody,
} from './studentEnrollment.validation.js';

/**
 * Thin HTTP adapter over StudentEnrollmentService — matches
 * academic-year.controller.ts / admission.controller.ts exactly: plain
 * exported async functions (no class), no Prisma, no repository, no
 * business logic, no RBAC decisions, no duplicated validation. Every
 * handler assumes route middleware has already run
 * requireAuth -> authorize(...) -> validate(...) in that order, so
 * req.user is set and req.valid.{body,params,query} already holds
 * validated, coerced data.
 *
 * Admission is the source of truth for userId/programId/
 * curriculumVersionId/admissionDate — this controller never reads or
 * forwards those fields from the client. CreateStudentEnrollmentInput
 * only ever carries admissionId + rollNumber, matching
 * createStudentEnrollmentBodySchema exactly; the service derives
 * everything else from the referenced Admission.
 *
 * There is no DELETE handler and no generic status-PATCH handler here —
 * cancel/withdraw are the only lifecycle transitions, each its own
 * dedicated command mapped to its own dedicated service method. This
 * controller does not decide whether a cancellation/withdrawal is
 * actually valid (academic-activity checks, ACTIVE-status guard, etc.)
 * — that is entirely StudentEnrollmentService's concern.
 */

export const createStudentEnrollment = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as CreateStudentEnrollmentBody;
  const actorUserId = req.user!.id;

  const input: CreateStudentEnrollmentInput = {
    admissionId: body.admissionId,
    rollNumber: body.rollNumber,
  };

  const studentEnrollment = await studentEnrollmentService.createStudentEnrollment(
    actorUserId,
    input,
  );

  ApiResponse.created(res, studentEnrollment, 'Student enrollment created');
};

export const getStudentEnrollmentById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as StudentEnrollmentIdParams;

  const studentEnrollment = await studentEnrollmentService.getStudentEnrollmentById(params.id);

  ApiResponse.ok(res, studentEnrollment);
};

export const listStudentEnrollments = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListStudentEnrollmentsQuery;

  /**
   * Built with a conditional spread per field — matching
   * updateStudentEnrollment below and academic-year.controller.ts's
   * listAcademicYears — rather than rest-destructuring `query`. Under
   * `exactOptionalPropertyTypes: true`, rest-destructuring an object
   * with optional properties produces a type where each key is
   * explicitly `T | undefined`, which is NOT assignable to
   * ListStudentEnrollmentsFilters's `key?: T`; a key must be entirely
   * absent when unset, not present-with-value-undefined. The
   * conditional spread only adds a key when the query actually supplied
   * one. No pagination math happens here; the service/repository
   * already returns `total`, and ApiResponse.paginated derives
   * totalPages.
   */
  const filters: ListStudentEnrollmentsFilters = {
    ...(query.search !== undefined && { search: query.search }),
    ...(query.status !== undefined && { status: query.status }),
    ...(query.userId !== undefined && { userId: query.userId }),
    ...(query.admissionId !== undefined && { admissionId: query.admissionId }),
    ...(query.programId !== undefined && { programId: query.programId }),
    ...(query.curriculumVersionId !== undefined && {
      curriculumVersionId: query.curriculumVersionId,
    }),
    ...(query.rollNumber !== undefined && { rollNumber: query.rollNumber }),
  };

  const result = await studentEnrollmentService.listStudentEnrollments(filters, {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  // studentEnrollmentService returns a `readonly StudentEnrollmentDTO[]`;
  // ApiResponse.paginated's signature takes `T[]`, so it is spread into a
  // fresh mutable array here rather than widening the service's return
  // type or ApiResponse's signature.
  ApiResponse.paginated(res, [...result.studentEnrollments], {
    page: query.page,
    limit: query.limit,
    total: result.total,
  });
};

export const updateStudentEnrollment = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as StudentEnrollmentIdParams;
  const body = req.valid?.body as UpdateStudentEnrollmentBody;
  const actorUserId = req.user!.id;

  /**
   * rollNumber is the only field UpdateStudentEnrollmentInput accepts.
   * status/userId/admissionId/programId/curriculumVersionId are
   * structurally unreachable — updateStudentEnrollmentBodySchema does
   * not parse them, so there is nothing to strip here beyond the usual
   * exactOptionalPropertyTypes-safe conditional spread.
   */
  const input: UpdateStudentEnrollmentInput = {
    ...(body.rollNumber !== undefined && { rollNumber: body.rollNumber }),
  };

  const studentEnrollment = await studentEnrollmentService.updateStudentEnrollment(
    actorUserId,
    params.id,
    input,
  );

  ApiResponse.ok(res, studentEnrollment, 'Student enrollment updated');
};

export const cancelStudentEnrollment = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as StudentEnrollmentIdParams;
  const body = req.valid?.body as CancelStudentEnrollmentBody;
  const actorUserId = req.user!.id;

  const input: CancelStudentEnrollmentInput = { reason: body.reason };

  const studentEnrollment = await studentEnrollmentService.cancelStudentEnrollment(
    actorUserId,
    params.id,
    input,
  );

  ApiResponse.ok(res, studentEnrollment, 'Student enrollment cancelled');
};

export const withdrawStudentEnrollment = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as StudentEnrollmentIdParams;
  const body = req.valid?.body as WithdrawStudentEnrollmentBody;
  const actorUserId = req.user!.id;

  const input: WithdrawStudentEnrollmentInput = { reason: body.reason };

  const studentEnrollment = await studentEnrollmentService.withdrawStudentEnrollment(
    actorUserId,
    params.id,
    input,
  );

  ApiResponse.ok(res, studentEnrollment, 'Student enrollment withdrawn');
};
