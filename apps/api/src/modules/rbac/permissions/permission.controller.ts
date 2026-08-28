// apps/api/src/modules/rbac/permissions/permission.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../../common/responses/ApiResponse.js';

import { permissionService } from './permission.service.js';
import type { ListPermissionsFilters, UpdatePermissionInput } from './permission.types.js';
import type {
  CreatePermissionBody,
  ListPermissionsQuery,
  PermissionIdParams,
  UpdatePermissionBody,
} from './permission.validation.js';

export const createPermission = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as CreatePermissionBody;
  const permission = await permissionService.createPermission(body);
  ApiResponse.created(res, permission, 'Permission created');
};

export const getPermissionById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as PermissionIdParams;
  const permission = await permissionService.getById(params.id);
  ApiResponse.ok(res, permission);
};

export const listPermissions = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListPermissionsQuery;

  const filters: ListPermissionsFilters = {
    ...(query.resource !== undefined && { resource: query.resource }),
    ...(query.action !== undefined && { action: query.action }),
    ...(query.search !== undefined && { search: query.search }),
  };

  const { permissions, total } = await permissionService.listPermissions(filters, {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });
  ApiResponse.paginated(res, permissions, { page: query.page, limit: query.limit, total });
};

export const updatePermission = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as PermissionIdParams;
  const body = req.valid?.body as UpdatePermissionBody;

  const input: UpdatePermissionInput = {
    ...(body.displayName !== undefined && { displayName: body.displayName }),
    ...(body.description !== undefined && { description: body.description }),
  };

  const permission = await permissionService.updatePermission(params.id, input);
  ApiResponse.ok(res, permission, 'Permission updated');
};
