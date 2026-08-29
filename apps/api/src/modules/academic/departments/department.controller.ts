// apps/api/src/modules/academic/departments/department.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../../common/responses/ApiResponse.js';

import { departmentService } from './department.service.js';
import type { ListDepartmentsFilters, UpdateDepartmentInput } from './department.types.js';
import type {
  CreateDepartmentBody,
  DepartmentIdParams,
  ListDepartmentsQuery,
  UpdateDepartmentBody,
} from './department.validation.js';

/**
 * HTTP adapter for the Department module — thin by design. Every method
 * here does exactly: read validated input → call DepartmentService →
 * send an ApiResponse. No Prisma, no repository, no AuditService, no RBAC
 * decisions, and no business rules live in this file.
 *
 * Route middleware (not written in this task) is expected to run, in
 * order: `requireAuth` → `authorize(resource, action)` →
 * `validate(schema, source)` → the handler below. Every handler here
 * therefore assumes `req.user` is set (guaranteed by `requireAuth`) and
 * `req.valid.{body,params,query}` already holds validated, coerced data
 * (guaranteed by `validate.middleware.ts` + department.validation.ts's
 * schemas) — this file never parses or validates anything itself.
 *
 * Plain exported async functions, not a class — matching
 * auth.controller.ts / user.controller.ts / role.controller.ts /
 * role-assignment.controller.ts exactly, not the class-based shape
 * floated elsewhere; the actual codebase convention wins.
 */

export const createDepartment = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as CreateDepartmentBody;
  const actorUserId = req.user!.id;

  const department = await departmentService.createDepartment(actorUserId, body);
  ApiResponse.created(res, department, 'Department created');
};

export const getDepartmentById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as DepartmentIdParams;
  const department = await departmentService.getDepartmentById(params.id);
  ApiResponse.ok(res, department);
};

export const listDepartments = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListDepartmentsQuery;

  const filters: ListDepartmentsFilters = {
    ...(query.search !== undefined && { search: query.search }),
  };

  const { departments, total } = await departmentService.listDepartments(filters, {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  ApiResponse.paginated(res, departments, { page: query.page, limit: query.limit, total });
};

export const updateDepartment = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as DepartmentIdParams;
  const body = req.valid?.body as UpdateDepartmentBody;
  const actorUserId = req.user!.id;

  /**
   * `code` is not read from `body` here — `updateDepartmentBodySchema`
   * doesn't accept it at all, so there is nothing to omit; this
   * reconstruction only ever forwards `name`.
   */
  const input: UpdateDepartmentInput = {
    ...(body.name !== undefined && { name: body.name }),
  };

  const department = await departmentService.updateDepartment(actorUserId, params.id, input);
  ApiResponse.ok(res, department, 'Department updated');
};

/**
 * `deleteDepartment` is exposed here on the same basis it was added to
 * DepartmentService: department.repository.ts already implements
 * `delete()`, and the earlier validation task's HTTP contract explicitly
 * listed `DELETE /api/v1/academic/departments/:id`. Flagging again, as
 * before, that this hasn't been separately reconfirmed as a definite
 * Phase 1 requirement outside this conversation's own continuity.
 *
 * Returns the standard `{success, message, data: null}` envelope (200),
 * not a raw 204 — matching the actual established pattern for every
 * other terminal/no-return-value operation in this codebase
 * (`archiveUser`, `archiveRole` both use `ApiResponse.ok(res, null, ...)`
 * rather than `ApiResponse.noContent()`), even though `noContent()`
 * exists on `ApiResponse` and is unused everywhere. See the final
 * response for the explicit alternative if a REST-purist 204 is
 * actually wanted instead.
 */
export const deleteDepartment = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as DepartmentIdParams;
  const actorUserId = req.user!.id;

  await departmentService.deleteDepartment(actorUserId, params.id);
  ApiResponse.ok(res, null, 'Department deleted');
};
