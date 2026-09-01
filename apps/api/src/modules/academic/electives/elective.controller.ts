// apps/api/src/modules/academic/electives/elective.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../../common/responses/ApiResponse.js';

import { electiveGroupService } from './elective.service.js';
import type {
  CreateElectiveGroupInput,
  ListElectiveGroupsFilters,
  UpdateElectiveGroupInput,
} from './elective.types.js';
import type {
  CreateElectiveGroupBody,
  ElectiveGroupIdParams,
  ListElectiveGroupsQuery,
  UpdateElectiveGroupBody,
} from './elective.validation.js';

/**
 * HTTP adapter for the ElectiveGroup module — thin by design, mirroring
 * subject.controller.ts / semester.controller.ts exactly. Every method
 * here does exactly: read validated input → call ElectiveGroupService →
 * send an ApiResponse. No Prisma, no repository, no AuditService, no
 * RBAC decisions, and no business rules live in this file. No DTO
 * mapping here either — ElectiveGroupService already returns
 * ElectiveGroupDTO / ListElectiveGroupsResult.
 *
 * Route middleware (elective.routes.ts) is expected to run, in order:
 * requireAuth → authorization guard → validate(schema, source) → the
 * handler below. Every handler therefore assumes `req.user` is set and
 * `req.valid.{body,params,query}` already holds validated, coerced
 * data.
 *
 * Plain exported async functions, not a class — matching every sibling
 * controller in this codebase.
 */

export const createElectiveGroup = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as CreateElectiveGroupBody;
  const actorUserId = req.user!.id;

  const input: CreateElectiveGroupInput = {
    semesterCatalogId: body.semesterCatalogId,
    name: body.name,
    ...(body.minSelect !== undefined && { minSelect: body.minSelect }),
    ...(body.maxSelect !== undefined && { maxSelect: body.maxSelect }),
  };

  const electiveGroup = await electiveGroupService.createElectiveGroup(actorUserId, input);
  ApiResponse.created(res, electiveGroup, 'Elective group created');
};

export const getElectiveGroupById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as ElectiveGroupIdParams;
  const electiveGroup = await electiveGroupService.getElectiveGroupById(params.id);
  ApiResponse.ok(res, electiveGroup);
};

export const listElectiveGroups = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListElectiveGroupsQuery;

  const filters: ListElectiveGroupsFilters = {
    ...(query.search !== undefined && { search: query.search }),
    ...(query.semesterCatalogId !== undefined && { semesterCatalogId: query.semesterCatalogId }),
  };

  const { electiveGroups, total } = await electiveGroupService.listElectiveGroups(filters, {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  ApiResponse.paginated(res, electiveGroups, { page: query.page, limit: query.limit, total });
};

export const updateElectiveGroup = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as ElectiveGroupIdParams;
  const body = req.valid?.body as UpdateElectiveGroupBody;
  const actorUserId = req.user!.id;

  /**
   * `semesterCatalogId` is never read from `body` here —
   * `updateElectiveGroupBodySchema` doesn't accept it at all, so there
   * is nothing to omit; this preserves the domain's immutability rule
   * at the HTTP boundary. The `minSelect <= maxSelect` invariant is
   * intentionally NOT checked here — ElectiveGroupService computes it
   * against the effective post-update state (existing row + this
   * partial input), not the raw body in isolation.
   */
  const input: UpdateElectiveGroupInput = {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.minSelect !== undefined && { minSelect: body.minSelect }),
    ...(body.maxSelect !== undefined && { maxSelect: body.maxSelect }),
  };

  const electiveGroup = await electiveGroupService.updateElectiveGroup(
    actorUserId,
    params.id,
    input,
  );
  ApiResponse.ok(res, electiveGroup, 'Elective group updated');
};

export const deleteElectiveGroup = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as ElectiveGroupIdParams;
  const actorUserId = req.user!.id;

  await electiveGroupService.deleteElectiveGroup(actorUserId, params.id);
  ApiResponse.ok(res, null, 'Elective group deleted');
};
