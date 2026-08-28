// apps/api/src/modules/rbac/assignments/role-assignment.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { authorize } from '../authorization/authorization.middleware.js';

import * as roleAssignmentController from './role-assignment.controller.js';
import {
  createRoleAssignmentBodySchema,
  listRoleAssignmentsQuerySchema,
  revokeRoleAssignmentParamsSchema,
  roleAssignmentIdParamsSchema,
} from './role-assignment.validation.js';

export const roleAssignmentRouter = Router();

roleAssignmentRouter.use(requireAuth);

roleAssignmentRouter.post(
  '/',
  authorize('roleAssignment', 'create'),
  validate(createRoleAssignmentBodySchema),
  roleAssignmentController.createRoleAssignment,
);

roleAssignmentRouter.get(
  '/',
  authorize('roleAssignment', 'read'),
  validate(listRoleAssignmentsQuerySchema, 'query'),
  roleAssignmentController.listRoleAssignments,
);

roleAssignmentRouter.get(
  '/:id',
  authorize('roleAssignment', 'read'),
  validate(roleAssignmentIdParamsSchema, 'params'),
  roleAssignmentController.getRoleAssignmentById,
);

roleAssignmentRouter.delete(
  '/:roleAssignmentId',
  authorize('roleAssignment', 'delete'),
  validate(revokeRoleAssignmentParamsSchema, 'params'),
  roleAssignmentController.revokeRoleAssignment,
);
