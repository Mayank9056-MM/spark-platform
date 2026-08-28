// apps/api/src/modules/rbac/roles/role.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../../common/responses/ApiResponse.js';

import { roleService } from './role.service.js';
import type { ListRolesFilters, UpdateRoleInput } from './role.types.js';
import type {
  CreateRoleBody,
  GrantPermissionToRoleParams,
  ListRolesQuery,
  RevokePermissionFromRoleParams,
  RoleIdParams,
  UpdateRoleBody,
} from './role.validation.js';

export const createRole = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as CreateRoleBody;
  const actorUserId = req.user!.id;
  const role = await roleService.createRole(actorUserId, body);
  ApiResponse.created(res, role, 'Role created');
};

export const getRoleById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as RoleIdParams;
  const role = await roleService.getById(params.id);
  ApiResponse.ok(res, role);
};

export const getRoleWithPermissions = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as RoleIdParams;
  const role = await roleService.getByIdWithPermissions(params.id);
  ApiResponse.ok(res, role);
};

export const listRoles = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListRolesQuery;

  const filters: ListRolesFilters = {
    ...(query.search !== undefined && { search: query.search }),
    ...(query.isSystemDefined !== undefined && { isSystemDefined: query.isSystemDefined }),
  };

  const { roles, total } = await roleService.listRoles(filters, {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });
  ApiResponse.paginated(res, roles, { page: query.page, limit: query.limit, total });
};

export const updateRole = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as RoleIdParams;
  const body = req.valid?.body as UpdateRoleBody;
  const actorUserId = req.user!.id;

  const input: UpdateRoleInput = {
    ...(body.displayName !== undefined && { displayName: body.displayName }),
  };

  const role = await roleService.updateRole(actorUserId, params.id, input);
  ApiResponse.ok(res, role, 'Role updated');
};

export const archiveRole = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as RoleIdParams;
  const actorUserId = req.user!.id;
  await roleService.archiveRole(actorUserId, params.id);
  ApiResponse.ok(res, null, 'Role archived');
};

export const restoreRole = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as RoleIdParams;
  const actorUserId = req.user!.id;
  const role = await roleService.restoreRole(actorUserId, params.id);
  ApiResponse.ok(res, role, 'Role restored');
};

export const grantPermissionToRole = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as GrantPermissionToRoleParams;
  const actorUserId = req.user!.id;
  await roleService.grantPermissionToRole(actorUserId, params.roleId, params.permissionId);
  ApiResponse.ok(res, null, 'Permission granted to role');
};

export const revokePermissionFromRole = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as RevokePermissionFromRoleParams;
  const actorUserId = req.user!.id;
  await roleService.revokePermissionFromRole(actorUserId, params.roleId, params.permissionId);
  ApiResponse.ok(res, null, 'Permission revoked from role');
};
