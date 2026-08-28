// apps/api/src/modules/rbac/roles/role.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { authorize } from '../authorization/authorization.middleware.js';

import * as roleController from './role.controller.js';
import {
  createRoleBodySchema,
  grantPermissionToRoleParamsSchema,
  listRolesQuerySchema,
  revokePermissionFromRoleParamsSchema,
  roleIdParamsSchema,
  updateRoleBodySchema,
} from './role.validation.js';

export const roleRouter = Router();

roleRouter.use(requireAuth);

roleRouter.post(
  '/',
  authorize('role', 'create'),
  validate(createRoleBodySchema),
  roleController.createRole,
);

roleRouter.get(
  '/',
  authorize('role', 'read'),
  validate(listRolesQuerySchema, 'query'),
  roleController.listRoles,
);

roleRouter.get(
  '/:id',
  authorize('role', 'read'),
  validate(roleIdParamsSchema, 'params'),
  roleController.getRoleById,
);

roleRouter.get(
  '/:id/permissions',
  authorize('role', 'read'),
  validate(roleIdParamsSchema, 'params'),
  roleController.getRoleWithPermissions,
);

roleRouter.patch(
  '/:id',
  authorize('role', 'update'),
  validate(roleIdParamsSchema, 'params'),
  validate(updateRoleBodySchema),
  roleController.updateRole,
);

roleRouter.post(
  '/:id/archive',
  authorize('role', 'archive'),
  validate(roleIdParamsSchema, 'params'),
  roleController.archiveRole,
);

roleRouter.post(
  '/:id/restore',
  authorize('role', 'restore'),
  validate(roleIdParamsSchema, 'params'),
  roleController.restoreRole,
);

roleRouter.post(
  '/:roleId/permissions/:permissionId',
  authorize('role', 'update'),
  validate(grantPermissionToRoleParamsSchema, 'params'),
  roleController.grantPermissionToRole,
);

roleRouter.delete(
  '/:roleId/permissions/:permissionId',
  authorize('role', 'update'),
  validate(revokePermissionFromRoleParamsSchema, 'params'),
  roleController.revokePermissionFromRole,
);
