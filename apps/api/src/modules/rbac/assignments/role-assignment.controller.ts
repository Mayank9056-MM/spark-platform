// apps/api/src/modules/rbac/assignments/role-assignment.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../../common/responses/ApiResponse.js';

import { roleAssignmentService } from './role-assignment.service.js';
import type {
  CreateRoleAssignmentInput,
  ListRoleAssignmentsFilters,
} from './role-assignment.types.js';
import type {
  CreateRoleAssignmentBody,
  ListRoleAssignmentsQuery,
  RevokeRoleAssignmentParams,
  RoleAssignmentIdParams,
} from './role-assignment.validation.js';

export const createRoleAssignment = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as CreateRoleAssignmentBody;
  const actorUserId = req.user!.id;

  const input: CreateRoleAssignmentInput = {
    userId: body.userId,
    roleId: body.roleId,
    scope: body.scope,
    ...(body.validFrom !== undefined && { validFrom: body.validFrom }),
    ...(body.validUntil !== undefined && { validUntil: body.validUntil }),
  };

  const assignment = await roleAssignmentService.createRoleAssignment(actorUserId, input);
  ApiResponse.created(res, assignment, 'Role assignment created');
};

export const getRoleAssignmentById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as RoleAssignmentIdParams;
  const assignment = await roleAssignmentService.getById(params.id);
  ApiResponse.ok(res, assignment);
};

export const listRoleAssignments = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListRoleAssignmentsQuery;

  const filters: ListRoleAssignmentsFilters = {
    ...(query.userId !== undefined && { userId: query.userId }),
    ...(query.roleId !== undefined && { roleId: query.roleId }),
    ...(query.scopeType !== undefined && { scopeType: query.scopeType }),
    ...(query.scopeId !== undefined && { scopeId: query.scopeId }),
    ...(query.activeOnly !== undefined && { activeOnly: query.activeOnly }),
  };

  const { roleAssignments, total } = await roleAssignmentService.listRoleAssignments(filters, {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });
  ApiResponse.paginated(res, roleAssignments, { page: query.page, limit: query.limit, total });
};

export const revokeRoleAssignment = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as RevokeRoleAssignmentParams;
  const actorUserId = req.user!.id;
  const assignment = await roleAssignmentService.revokeRoleAssignment(
    actorUserId,
    params.roleAssignmentId,
  );
  ApiResponse.ok(res, assignment, 'Role assignment revoked');
};
