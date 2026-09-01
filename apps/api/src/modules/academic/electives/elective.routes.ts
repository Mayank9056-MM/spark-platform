// apps/api/src/modules/academic/electives/elective.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { authorize } from '../../rbac/index.js';

import * as electiveGroupController from './elective.controller.js';
import {
  createElectiveGroupBodySchema,
  electiveGroupIdParamsSchema,
  listElectiveGroupsQuerySchema,
  updateElectiveGroupBodySchema,
} from './elective.validation.js';

/**
 * HTTP route composition for the ElectiveGroup module — pure composition
 * only: requireAuth → authorize(resource, action) → validate(schema,
 * source) → controller.
 *
 * No Prisma access, repository/service calls, audit logic, manual
 * validation, response construction, or business rules belong here.
 * ElectiveGroupService owns domain/business rules and
 * ElectiveGroupRepository owns persistence. The controller owns
 * ApiResponse construction, while errors propagate to the centralized
 * error middleware.
 *
 * ── AUTHORIZATION: FIRST-CLASS RBAC RESOURCE ──────────────────────────
 * ElectiveGroup is now a first-class RBAC resource — migrated off the
 * `requireInterimAdmin` stopgap the same way department.routes.ts /
 * program.routes.ts were. `AuthorizationResource` includes the
 * 'electiveGroup' literal, and permission.constants.ts defines the
 * corresponding ELECTIVE_GROUP_* catalog entries. Routes use
 * operation-specific permissions:
 *
 *   POST /      → electiveGroup:create
 *   GET /       → electiveGroup:read
 *   GET /:id    → electiveGroup:read
 *   PATCH /:id  → electiveGroup:update
 *   DELETE /:id → electiveGroup:delete
 *
 * `authorize` is imported from `../../rbac/index.js`, not
 * `../../rbac/authorization/authorization.middleware.js` directly —
 * elective.routes.ts lives outside the rbac module (in academic/), so it
 * crosses the module boundary through the public rbac/index.ts surface,
 * same as department.routes.ts / program.routes.ts.
 */

export const electiveGroupRouter = Router();

electiveGroupRouter.use(requireAuth);

electiveGroupRouter.post(
  '/',
  authorize('electiveGroup', 'create'),
  validate(createElectiveGroupBodySchema),
  electiveGroupController.createElectiveGroup,
);

electiveGroupRouter.get(
  '/',
  authorize('electiveGroup', 'read'),
  validate(listElectiveGroupsQuerySchema, 'query'),
  electiveGroupController.listElectiveGroups,
);

electiveGroupRouter.get(
  '/:id',
  authorize('electiveGroup', 'read'),
  validate(electiveGroupIdParamsSchema, 'params'),
  electiveGroupController.getElectiveGroupById,
);

electiveGroupRouter.patch(
  '/:id',
  authorize('electiveGroup', 'update'),
  validate(electiveGroupIdParamsSchema, 'params'),
  validate(updateElectiveGroupBodySchema),
  electiveGroupController.updateElectiveGroup,
);

electiveGroupRouter.delete(
  '/:id',
  authorize('electiveGroup', 'delete'),
  validate(electiveGroupIdParamsSchema, 'params'),
  electiveGroupController.deleteElectiveGroup,
);
