// apps/api/src/modules/subject-offerings/subjectOffering.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../common/responses/ApiResponse.js';

import { subjectOfferingService } from './subjectOffering.service.js';
import type {
  CreateSubjectOfferingInput,
  ListSubjectOfferingsFilters,
  ListSubjectOfferingsOptions,
} from './subjectOffering.types.js';
import type {
  CreateSubjectOfferingBody,
  ListSubjectOfferingsQuery,
  SubjectOfferingIdParams,
} from './subjectOffering.validation.js';

/**
 * Thin HTTP adapter over SubjectOfferingService — matches
 * semesterEnrollment.controller.ts exactly: plain exported async
 * functions (no class), no Prisma, no repository, no business logic, no
 * RBAC decisions, no duplicated validation. Every handler assumes route
 * middleware has already run requireAuth -> authorize(...) ->
 * validate(...) in that order, so req.user is set and
 * req.valid.{body,params,query} already holds validated, coerced data.
 *
 * This module intentionally exposes exactly three operations — create,
 * get-by-id, list. There is no update/delete handler here:
 * SubjectOfferingService has no updateSubjectOffering/
 * deleteSubjectOffering method to call — subjectOffering.types.ts
 * defines no UpdateSubjectOfferingInput, since subjectId/academicYearId
 * become immutable identity fields the moment any downstream teaching
 * activity (FacultyAssignment/Timetable/Lecture/Assignment/
 * StudyMaterial) references the row.
 */

export const createSubjectOffering = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as CreateSubjectOfferingBody;
  const actorUserId = req.user!.id;

  const input: CreateSubjectOfferingInput = {
    subjectId: body.subjectId,
    academicYearId: body.academicYearId,
  };

  const subjectOffering = await subjectOfferingService.createSubjectOffering(actorUserId, input);

  ApiResponse.created(res, subjectOffering, 'Subject offering created');
};

export const getSubjectOfferingById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as SubjectOfferingIdParams;

  const subjectOffering = await subjectOfferingService.getSubjectOfferingById(params.id);

  ApiResponse.ok(res, subjectOffering);
};

export const listSubjectOfferings = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListSubjectOfferingsQuery;

  /**
   * Conditional spread per field — matching semesterEnrollment.controller.ts
   * / academicYear.controller.ts — rather than rest-destructuring `query`.
   * Under `exactOptionalPropertyTypes: true`, a key must be entirely
   * absent when unset, not present-with-value-undefined.
   */
  const filters: ListSubjectOfferingsFilters = {
    ...(query.subjectId !== undefined && { subjectId: query.subjectId }),
    ...(query.academicYearId !== undefined && { academicYearId: query.academicYearId }),
  };

  const options: ListSubjectOfferingsOptions = {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };

  const result = await subjectOfferingService.listSubjectOfferings(filters, options);

  // subjectOfferingService returns `readonly SubjectOfferingDTO[]`;
  // ApiResponse.paginated's signature takes `T[]`, so it is spread into a
  // fresh mutable array here rather than widening either signature. No
  // pagination math happens here — ApiResponse.paginated derives
  // totalPages from `total`.
  ApiResponse.paginated(res, [...result.subjectOfferings], {
    page: query.page,
    limit: query.limit,
    total: result.total,
  });
};
