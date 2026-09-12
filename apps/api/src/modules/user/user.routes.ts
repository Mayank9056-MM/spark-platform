import { Router } from 'express';

import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authorize } from '../rbac/index.js';

import * as userController from './user.controller.js';
import {
  createUserBodySchema,
  listUsersQuerySchema,
  updateUserBodySchema,
  userIdParamsSchema,
} from './user.validation.js';

export const userRouter = Router();

userRouter.use(requireAuth);

// Self-service — no RBAC check: acting on your own account needs
// authentication only, not a permission grant.
userRouter.get('/me', userController.getMe);
userRouter.patch('/me', validate(updateUserBodySchema), userController.updateMe);

// Admin-managed — now RBAC-gated. These map 1:1 onto the user:* entries
// already seeded in PERMISSION_CATALOG and already granted in full to
// admin/super_admin by role.bootstrap.ts, so no seed change is needed
// for this cutover.
userRouter.post(
  '/',
  authorize('user', 'create'),
  validate(createUserBodySchema),
  userController.createUser,
);

userRouter.get(
  '/',
  authorize('user', 'read'),
  validate(listUsersQuerySchema, 'query'),
  userController.listUsers,
);

userRouter.get(
  '/:id',
  authorize('user', 'read'),
  validate(userIdParamsSchema, 'params'),
  userController.getUserById,
);

userRouter.patch(
  '/:id',
  authorize('user', 'update'),
  validate(userIdParamsSchema, 'params'),
  validate(updateUserBodySchema),
  userController.updateUserById,
);

userRouter.delete(
  '/:id',
  authorize('user', 'archive'),
  validate(userIdParamsSchema, 'params'),
  userController.archiveUser,
);

userRouter.post(
  '/:id/restore',
  authorize('user', 'restore'),
  validate(userIdParamsSchema, 'params'),
  userController.restoreUser,
);
