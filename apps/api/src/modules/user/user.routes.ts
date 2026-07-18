import { Router } from 'express';

import { requireAuth } from '../../middlewares/auth.middleware.js';
import { requireInterimAdmin } from '../../middlewares/interim-admin.guard.js';
import { loadOrganizationContext } from '../../middlewares/load-org-context.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

import * as userController from './user.controller.js';
import {
  createUserBodySchema,
  listUsersQuerySchema,
  updateUserBodySchema,
  userIdParamsSchema,
} from './user.validation.js';

export const userRouter = Router();

userRouter.use(requireAuth, loadOrganizationContext);

// Self-service — no admin check
userRouter.get('/me', userController.getMe);
userRouter.patch('/me', validate(updateUserBodySchema), userController.updateMe);

// Admin-managed — gated by the interim stopgap until RBAC lands
userRouter.post(
  '/',
  requireInterimAdmin,
  validate(createUserBodySchema),
  userController.createUser,
);

userRouter.get(
  '/',
  requireInterimAdmin,
  validate(listUsersQuerySchema, 'query'),
  userController.listUsers,
);

userRouter.get(
  '/:id',
  requireInterimAdmin,
  validate(userIdParamsSchema, 'params'),
  userController.getUserById,
);

userRouter.patch(
  '/:id',
  requireInterimAdmin,
  validate(userIdParamsSchema, 'params'),
  validate(updateUserBodySchema),
  userController.updateUserById,
);

userRouter.delete(
  '/:id',
  requireInterimAdmin,
  validate(userIdParamsSchema, 'params'),
  userController.archiveUser,
);

userRouter.post(
  '/:id/restore',
  requireInterimAdmin,
  validate(userIdParamsSchema, 'params'),
  userController.restoreUser,
);
