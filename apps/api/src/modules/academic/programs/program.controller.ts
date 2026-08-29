// apps/api/src/modules/academic/programs/program.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../../common/responses/ApiResponse.js';

import { programService } from './program.service.js';
import type { ListProgramsFilters, UpdateProgramInput } from './program.types.js';
import type {
  CreateProgramBody,
  ListProgramsQuery,
  ProgramIdParams,
  UpdateProgramBody,
} from './program.validation.js';

/**
 * HTTP adapter for the Program module — thin by design, mirroring
 * department.controller.ts exactly. Every method here does exactly:
 * read validated input → call ProgramService → send an ApiResponse. No
 * Prisma, no repository, no AuditService, no RBAC decisions, no
 * Department-existence checking, and no business rules live in this
 * file — ProgramService already owns all of that.
 *
 * Route middleware (not written in this task) is expected to run, in
 * order: `requireAuth` → `authorize(resource, action)` →
 * `validate(schema, source)` → the handler below. Every handler here
 * therefore assumes `req.user` is set (guaranteed by `requireAuth`) and
 * `req.valid.{body,params,query}` already holds validated, coerced data
 * (guaranteed by `validate.middleware.ts` + program.validation.ts's
 * schemas) — this file never parses or validates anything itself.
 *
 * Plain exported async functions, not a class — matching
 * department.controller.ts / role.controller.ts / user.controller.ts
 * exactly.
 */

export const createProgram = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as CreateProgramBody;
  const actorUserId = req.user!.id;

  const program = await programService.createProgram(actorUserId, body);
  ApiResponse.created(res, program, 'Program created');
};

export const getProgramById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as ProgramIdParams;
  const program = await programService.getProgramById(params.id);
  ApiResponse.ok(res, program);
};

export const listPrograms = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListProgramsQuery;

  const filters: ListProgramsFilters = {
    ...(query.search !== undefined && { search: query.search }),
    ...(query.departmentId !== undefined && { departmentId: query.departmentId }),
  };

  const { programs, total } = await programService.listPrograms(filters, {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  ApiResponse.paginated(res, programs, { page: query.page, limit: query.limit, total });
};

export const updateProgram = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as ProgramIdParams;
  const body = req.valid?.body as UpdateProgramBody;
  const actorUserId = req.user!.id;

  /**
   * Explicit field-by-field reconstruction, not `{...body}` — same
   * defensive convention department.controller.ts/role.controller.ts
   * use for their own update bodies. `updateProgramBodySchema` doesn't
   * accept `departmentId` at all, so there's nothing to strip out
   * today, but whitelisting the four allowed fields here (rather than
   * spreading the body type wholesale) means a future, unrelated change
   * to `UpdateProgramBody` can never silently start forwarding a new
   * field — including `departmentId` — into `UpdateProgramInput`
   * without a deliberate line added here.
   */
  const input: UpdateProgramInput = {
    ...(body.name !== undefined && { name: body.name }),
    ...(body.code !== undefined && { code: body.code }),
    ...(body.durationYears !== undefined && { durationYears: body.durationYears }),
    ...(body.totalSemesters !== undefined && { totalSemesters: body.totalSemesters }),
  };

  const program = await programService.updateProgram(actorUserId, params.id, input);
  ApiResponse.ok(res, program, 'Program updated');
};

/**
 * Returns the standard `{success, message, data: null}` envelope (200),
 * not a raw 204 — matching the actual established pattern for every
 * other terminal/no-return-value operation in this codebase
 * (`deleteDepartment`, `archiveUser`, `archiveRole` all use
 * `ApiResponse.ok(res, null, ...)` rather than
 * `ApiResponse.noContent()`), even though `noContent()` exists on
 * `ApiResponse` and is unused everywhere.
 */
export const deleteProgram = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as ProgramIdParams;
  const actorUserId = req.user!.id;

  await programService.deleteProgram(actorUserId, params.id);
  ApiResponse.ok(res, null, 'Program deleted');
};
