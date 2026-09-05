// apps/api/src/modules/semester-enrollments/semesterEnrollment.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../common/responses/ApiResponse.js';

import { semesterEnrollmentService } from './semesterEnrollment.service.js';
import type {
  CreateSemesterEnrollmentInput,
  ListSemesterEnrollmentsFilters,
  ListSemesterEnrollmentsOptions,
} from './semesterEnrollment.types.js';
import type {
  CreateSemesterEnrollmentBody,
  ListSemesterEnrollmentsQuery,
  SemesterEnrollmentIdParams,
} from './semesterEnrollment.validation.js';

/**
 * Thin HTTP adapter over SemesterEnrollmentService — matches
 * studentEnrollment.controller.ts / admission.controller.ts exactly:
 * plain exported async functions (no class), no Prisma, no repository,
 * no business logic, no RBAC decisions, no duplicated validation. Every
 * handler assumes route middleware has already run
 * requireAuth -> authorize(...) -> validate(...) in that order, so
 * req.user is set and req.valid.{body,params,query} already holds
 * validated, coerced data.
 *
 * This module intentionally exposes exactly three operations — create,
 * get-by-id, list. There is no update/delete handler and no
 * status-transition handler here: SemesterEnrollmentService has no
 * updateSemesterEnrollment/deleteSemesterEnrollment/setStatus/
 * promote/repeat/detain methods to call. Lifecycle transitions belong to
 * the (not yet implemented) PromotionDecision domain — see
 * semesterEnrollment.service.ts's "PROMOTION BOUNDARY" note — and this
 * controller does not anticipate or stub that boundary in any way.
 */

export const createSemesterEnrollment = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as CreateSemesterEnrollmentBody;
  const actorUserId = req.user!.id;

  const input: CreateSemesterEnrollmentInput = {
    studentEnrollmentId: body.studentEnrollmentId,
    semesterCatalogId: body.semesterCatalogId,
    academicYearId: body.academicYearId,
  };

  const semesterEnrollment = await semesterEnrollmentService.createSemesterEnrollment(
    actorUserId,
    input,
  );

  ApiResponse.created(res, semesterEnrollment, 'Semester enrollment created');
};

export const getSemesterEnrollmentById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as SemesterEnrollmentIdParams;

  const semesterEnrollment = await semesterEnrollmentService.getSemesterEnrollmentById(params.id);

  ApiResponse.ok(res, semesterEnrollment);
};

export const listSemesterEnrollments = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListSemesterEnrollmentsQuery;

  /**
   * Built with a conditional spread per field — matching
   * studentEnrollment.controller.ts's listStudentEnrollments — rather
   * than rest-destructuring `query`. Under `exactOptionalPropertyTypes:
   * true`, rest-destructuring an object with optional properties
   * produces a type where each key is explicitly `T | undefined`, which
   * is NOT assignable to ListSemesterEnrollmentsFilters's `key?: T`; a
   * key must be entirely absent when unset, not present-with-
   * value-undefined. The conditional spread only adds a key when the
   * query actually supplied one.
   */
  const filters: ListSemesterEnrollmentsFilters = {
    ...(query.studentEnrollmentId !== undefined && {
      studentEnrollmentId: query.studentEnrollmentId,
    }),
    ...(query.semesterCatalogId !== undefined && { semesterCatalogId: query.semesterCatalogId }),
    ...(query.academicYearId !== undefined && { academicYearId: query.academicYearId }),
    ...(query.attemptNumber !== undefined && { attemptNumber: query.attemptNumber }),
    ...(query.status !== undefined && { status: query.status }),
  };

  const options: ListSemesterEnrollmentsOptions = {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };

  const result = await semesterEnrollmentService.listSemesterEnrollments(filters, options);

  // semesterEnrollmentService returns a `readonly SemesterEnrollmentDTO[]`;
  // ApiResponse.paginated's signature takes `T[]`, so it is spread into a
  // fresh mutable array here rather than widening the service's return
  // type or ApiResponse's signature. No pagination math happens here —
  // the repository already returns `total`, and ApiResponse.paginated
  // derives totalPages.
  ApiResponse.paginated(res, [...result.semesterEnrollments], {
    page: query.page,
    limit: query.limit,
    total: result.total,
  });
};
