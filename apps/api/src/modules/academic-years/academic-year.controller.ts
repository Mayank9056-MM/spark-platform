// apps/api/src/modules/academic-years/academic-year.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../common/responses/ApiResponse.js';

import { academicYearService } from './academic-year.service.js';
import type {
  CreateAcademicYearInput,
  ListAcademicYearsFilters,
  UpdateAcademicYearInput,
} from './academic-year.types.js';
import type {
  AcademicYearIdParams,
  CreateAcademicYearBody,
  ListAcademicYearsQuery,
  UpdateAcademicYearBody,
} from './academic-year.validation.js';

/**
 * HTTP adapter for the AcademicYear module — thin by design, matching
 * department.controller.ts exactly. Every method reads validated input,
 * calls AcademicYearService, and sends an ApiResponse. No Prisma, no
 * repository, no audit logic, no RBAC decisions, and no business rules
 * (label uniqueness, startDate/endDate ordering, active-year protection,
 * one-active-year enforcement) live in this file — those belong to
 * academic-year.service.ts.
 *
 * Route middleware (not written in this task) is expected to run, in
 * order: `requireAuth` → `authorize(resource, action)` →
 * `validate(schema, source)` → the handler below. Every handler here
 * assumes `req.user` is set and `req.valid.{body,params,query}` already
 * holds validated, coerced data.
 *
 * Plain exported async functions, not a class — matching
 * department.controller.ts.
 */

export const createAcademicYear = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as CreateAcademicYearBody;
  const actorUserId = req.user!.id;

  const input: CreateAcademicYearInput = {
    label: body.label,
    startDate: body.startDate,
    endDate: body.endDate,
  };

  const academicYear = await academicYearService.createAcademicYear(actorUserId, input);
  ApiResponse.created(res, academicYear, 'Academic year created');
};

export const getAcademicYearById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as AcademicYearIdParams;
  const academicYear = await academicYearService.getAcademicYearById(params.id);
  ApiResponse.ok(res, academicYear);
};

export const listAcademicYears = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListAcademicYearsQuery;

  const filters: ListAcademicYearsFilters = {
    ...(query.search !== undefined && { search: query.search }),
    ...(query.isActive !== undefined && { isActive: query.isActive }),
  };

  const { academicYears, total } = await academicYearService.listAcademicYears(filters, {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  ApiResponse.paginated(res, academicYears, { page: query.page, limit: query.limit, total });
};

export const updateAcademicYear = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as AcademicYearIdParams;
  const body = req.valid?.body as UpdateAcademicYearBody;
  const actorUserId = req.user!.id;

  /**
   * `isActive` is never read from `body` here — updateAcademicYearBodySchema
   * doesn't accept it, and activation is a dedicated operation
   * (`activateAcademicYear`), not part of this generic PATCH.
   */
  const input: UpdateAcademicYearInput = {
    ...(body.label !== undefined && { label: body.label }),
    ...(body.startDate !== undefined && { startDate: body.startDate }),
    ...(body.endDate !== undefined && { endDate: body.endDate }),
  };

  const academicYear = await academicYearService.updateAcademicYear(actorUserId, params.id, input);
  ApiResponse.ok(res, academicYear, 'Academic year updated');
};

export const deleteAcademicYear = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as AcademicYearIdParams;
  const actorUserId = req.user!.id;

  await academicYearService.deleteAcademicYear(actorUserId, params.id);
  ApiResponse.ok(res, null, 'Academic year deleted');
};

/**
 * Dedicated domain command, not a generic PATCH — no request body.
 * The controller does not know (and must not encode) which year is
 * currently active, whether a deactivation will occur, or that
 * activation is idempotent when the target is already active; all of
 * that is `activateAcademicYear`'s concern in the service.
 */
export const activateAcademicYear = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as AcademicYearIdParams;
  const actorUserId = req.user!.id;

  const academicYear = await academicYearService.activateAcademicYear(actorUserId, params.id);
  ApiResponse.ok(res, academicYear, 'Academic year activated');
};
