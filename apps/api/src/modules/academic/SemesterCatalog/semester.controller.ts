// apps/api/src/modules/academic/SemesterCatalog/semester.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../../common/responses/ApiResponse.js';

import { semesterCatalogService } from './semester.service.js';
import type {
  CreateSemesterCatalogInput,
  ListSemesterCatalogsFilters,
  UpdateSemesterCatalogInput,
} from './semester.types.js';
import type {
  CreateSemesterCatalogBody,
  ListSemesterCatalogsQuery,
  SemesterCatalogIdParams,
  UpdateSemesterCatalogBody,
} from './semester.validation.js';

/**
 * HTTP adapter for the SemesterCatalog module — thin by design, mirroring
 * department.controller.ts exactly. Every method here does exactly: read
 * validated input → call SemesterCatalogService → send an ApiResponse. No
 * Prisma, no repository, no AuditService, no RBAC decisions, and no
 * business rules live in this file. No DTO mapping here either —
 * SemesterCatalogService already returns SemesterCatalogDTO /
 * ListSemesterCatalogsResult, matching DepartmentService's identical
 * return-DTOs-from-the-service convention.
 *
 * Route middleware (semester.routes.ts) is expected to run, in order:
 * requireAuth → requireInterimAdmin → validate(schema, source) → the
 * handler below. Every handler therefore assumes `req.user` is set and
 * `req.valid.{body,params,query}` already holds validated, coerced data.
 *
 * Plain exported async functions, not a class — matching
 * department.controller.ts / auth.controller.ts / user.controller.ts.
 */

export const createSemesterCatalog = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as CreateSemesterCatalogBody;
  const actorUserId = req.user!.id;

  const input: CreateSemesterCatalogInput = {
    curriculumVersionId: body.curriculumVersionId,
    number: body.number,
  };

  const semesterCatalog = await semesterCatalogService.createSemesterCatalog(actorUserId, input);
  ApiResponse.created(res, semesterCatalog, 'Semester catalog created');
};

export const getSemesterCatalogById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as SemesterCatalogIdParams;
  const semesterCatalog = await semesterCatalogService.getSemesterCatalogById(params.id);
  ApiResponse.ok(res, semesterCatalog);
};

export const listSemesterCatalogs = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListSemesterCatalogsQuery;

  const filters: ListSemesterCatalogsFilters = {
    ...(query.curriculumVersionId !== undefined && {
      curriculumVersionId: query.curriculumVersionId,
    }),
    ...(query.number !== undefined && { number: query.number }),
  };

  const { semesterCatalogs, total } = await semesterCatalogService.listSemesterCatalogs(filters, {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  ApiResponse.paginated(res, semesterCatalogs, { page: query.page, limit: query.limit, total });
};

export const updateSemesterCatalog = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as SemesterCatalogIdParams;
  const body = req.valid?.body as UpdateSemesterCatalogBody;
  const actorUserId = req.user!.id;

  const input: UpdateSemesterCatalogInput = {
    ...(body.number !== undefined && { number: body.number }),
  };

  const semesterCatalog = await semesterCatalogService.updateSemesterCatalog(
    actorUserId,
    params.id,
    input,
  );
  ApiResponse.ok(res, semesterCatalog, 'Semester catalog updated');
};

export const deleteSemesterCatalog = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as SemesterCatalogIdParams;
  const actorUserId = req.user!.id;

  await semesterCatalogService.deleteSemesterCatalog(actorUserId, params.id);
  ApiResponse.ok(res, null, 'Semester catalog deleted');
};
