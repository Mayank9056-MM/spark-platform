// apps/api/src/modules/rbac/permissions/permission.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { authorize } from '../authorization/authorization.middleware.js';

import * as permissionController from './permission.controller.js';
import {
  createPermissionBodySchema,
  listPermissionsQuerySchema,
  permissionIdParamsSchema,
  updatePermissionBodySchema,
} from './permission.validation.js';

export const permissionRouter = Router();

permissionRouter.use(requireAuth);

permissionRouter.post(
  '/',
  authorize('permission', 'create'),
  validate(createPermissionBodySchema),
  permissionController.createPermission,
);

permissionRouter.get(
  '/',
  authorize('permission', 'read'),
  validate(listPermissionsQuerySchema, 'query'),
  permissionController.listPermissions,
);

permissionRouter.get(
  '/:id',
  authorize('permission', 'read'),
  validate(permissionIdParamsSchema, 'params'),
  permissionController.getPermissionById,
);

permissionRouter.patch(
  '/:id',
  authorize('permission', 'update'),
  validate(permissionIdParamsSchema, 'params'),
  validate(updatePermissionBodySchema),
  permissionController.updatePermission,
);
