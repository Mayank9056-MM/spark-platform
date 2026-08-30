// apps/api/src/modules/academic/curricula/curriculum.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../../common/responses/ApiResponse.js';

import { curriculumVersionService } from './curriculum.service.js';
import type {
  CreateCurriculumVersionInput,
  ListCurriculumVersionsFilters,
  UpdateCurriculumVersionInput,
} from './curriculum.types.js';
import type {
  CreateCurriculumVersionBody,
  CurriculumVersionIdParams,
  ListCurriculumVersionsQuery,
  UpdateCurriculumVersionBody,
} from './curriculum.validation.js';

/**
 * HTTP adapter for the CurriculumVersion module — thin by design,
 * mirroring department.controller.ts / program.controller.ts exactly.
 * Every method here does exactly: read validated input →
 * CurriculumVersionService → send an ApiResponse. No Prisma, no
 * repository, no AuditService, no RBAC decisions, no Program-existence
 * checking, and no status/lifecycle rules live in this file —
 * CurriculumVersionService already owns all of that.
 *
 * Route middleware (curriculum.routes.ts, not written in this task) is
 * expected to run, in order: `requireAuth` → `authorize(resource,
 * action)` → `validate(schema, source)` → the handler below. Every
 * handler here therefore assumes `req.user` is set (guaranteed by
 * `requireAuth`) and `req.valid.{body,params,query}` already holds
 * validated, coerced data (guaranteed by `validate.middleware.ts` +
 * curriculum.validation.ts's schemas) — this file never parses or
 * validates anything itself.
 *
 * Plain exported async functions, not a class — matching
 * department.controller.ts / program.controller.ts exactly.
 */

export const createCurriculumVersion = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as CreateCurriculumVersionBody;
  const actorUserId = req.user!.id;

  const input: CreateCurriculumVersionInput = {
    programId: body.programId,
    label: body.label,
    ...(body.status !== undefined && { status: body.status }),
  };

  const curriculumVersion = await curriculumVersionService.createCurriculumVersion(
    actorUserId,
    input,
  );
  ApiResponse.created(res, curriculumVersion, 'Curriculum version created');
};

export const getCurriculumVersionById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as CurriculumVersionIdParams;
  const curriculumVersion = await curriculumVersionService.getCurriculumVersionById(params.id);
  ApiResponse.ok(res, curriculumVersion);
};

export const listCurriculumVersions = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListCurriculumVersionsQuery;

  const filters: ListCurriculumVersionsFilters = {
    ...(query.search !== undefined && { search: query.search }),
    ...(query.programId !== undefined && { programId: query.programId }),
    ...(query.status !== undefined && { status: query.status }),
  };

  const { curriculumVersions, total } = await curriculumVersionService.listCurriculumVersions(
    filters,
    {
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    },
  );

  ApiResponse.paginated(res, curriculumVersions, {
    page: query.page,
    limit: query.limit,
    total,
  });
};

export const updateCurriculumVersion = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as CurriculumVersionIdParams;
  const body = req.valid?.body as UpdateCurriculumVersionBody;
  const actorUserId = req.user!.id;

  /**
   * Explicit field-by-field reconstruction, not `{...body}` — same
   * defensive convention department.controller.ts/program.controller.ts
   * use for their own update bodies. `updateCurriculumVersionBodySchema`
   * has no `programId` key at all, so there's nothing to strip out
   * today, but whitelisting the two allowed fields here means a future,
   * unrelated change to `UpdateCurriculumVersionBody` can never silently
   * start forwarding a new field — including `programId` — into
   * `UpdateCurriculumVersionInput` without a deliberate line added here.
   */
  const input: UpdateCurriculumVersionInput = {
    ...(body.label !== undefined && { label: body.label }),
    ...(body.status !== undefined && { status: body.status }),
  };

  const curriculumVersion = await curriculumVersionService.updateCurriculumVersion(
    actorUserId,
    params.id,
    input,
  );
  ApiResponse.ok(res, curriculumVersion, 'Curriculum version updated');
};

/**
 * Returns the standard `{success, message, data: null}` envelope (200),
 * not a raw 204 — matching the established pattern every other
 * terminal/no-return-value operation in this codebase uses
 * (`deleteDepartment`, `deleteProgram`, `archiveUser`, `archiveRole` all
 * use `ApiResponse.ok(res, null, ...)` rather than
 * `ApiResponse.noContent()`).
 */
export const deleteCurriculumVersion = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as CurriculumVersionIdParams;
  const actorUserId = req.user!.id;

  await curriculumVersionService.deleteCurriculumVersion(actorUserId, params.id);
  ApiResponse.ok(res, null, 'Curriculum version deleted');
};
