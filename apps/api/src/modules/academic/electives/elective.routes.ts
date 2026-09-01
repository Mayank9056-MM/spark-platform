// apps/api/src/modules/academic/electives/elective.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../../middlewares/auth.middleware.js';
import { requireInterimAdmin } from '../../../middlewares/interim-admin.guard.js';
import { validate } from '../../../middlewares/validate.middleware.js';

import * as electiveGroupController from './elective.controller.js';
import {
  createElectiveGroupBodySchema,
  electiveGroupIdParamsSchema,
  listElectiveGroupsQuerySchema,
  updateElectiveGroupBodySchema,
} from './elective.validation.js';

/**
 * HTTP route composition for the ElectiveGroup module — pure composition
 * only: requireAuth → authorization guard → validate(schema, source) →
 * controller.
 *
 * No Prisma access, repository/service calls, audit logic, manual
 * validation, response construction, or business rules belong here.
 * ElectiveGroupService owns domain/business rules and
 * ElectiveGroupRepository owns persistence. The controller owns
 * ApiResponse construction, while errors propagate to the centralized
 * error middleware.
 *
 * ── AUTHORIZATION: INTERIM, NOT YET REGISTERED IN RBAC ────────────────
 *
 * ElectiveGroup is currently NOT a first-class RBAC resource.
 * `AuthorizationResource` does not contain an `electiveGroup` literal,
 * and `permission.constants.ts` does not define ElectiveGroup
 * create/read/update/delete permissions.
 *
 * Therefore this router deliberately uses `requireInterimAdmin`
 * uniformly across all five routes. This matches the current
 * authorization state of the Subject and SemesterCatalog academic
 * modules.
 *
 * Do NOT invent an `electiveGroup` authorization resource here and do not
 * cast around the authorization type system. RBAC registration should be
 * a separate, deliberate change to the authorization domain and permission
 * catalog.
 *
 * ── FUTURE RBAC MIGRATION ─────────────────────────────────────────────
 *
 * Once ElectiveGroup is formally registered as an RBAC resource and its
 * permissions are added to the canonical permission catalog, replace
 * `requireInterimAdmin` with operation-specific authorization:
 *
 *   requireInterimAdmin → authorize('electiveGroup', 'create') // POST /
 *   requireInterimAdmin → authorize('electiveGroup', 'read')   // GET /, GET /:id
 *   requireInterimAdmin → authorize('electiveGroup', 'update') // PATCH /:id
 *   requireInterimAdmin → authorize('electiveGroup', 'delete') // DELETE /:id
 *
 * The exact resource/action literals must come from the formally registered
 * RBAC types rather than being introduced by this router.
 */

export const electiveGroupRouter = Router();

electiveGroupRouter.use(requireAuth);

electiveGroupRouter.post(
  '/',
  requireInterimAdmin,
  validate(createElectiveGroupBodySchema),
  electiveGroupController.createElectiveGroup,
);

electiveGroupRouter.get(
  '/',
  requireInterimAdmin,
  validate(listElectiveGroupsQuerySchema, 'query'),
  electiveGroupController.listElectiveGroups,
);

electiveGroupRouter.get(
  '/:id',
  requireInterimAdmin,
  validate(electiveGroupIdParamsSchema, 'params'),
  electiveGroupController.getElectiveGroupById,
);

electiveGroupRouter.patch(
  '/:id',
  requireInterimAdmin,
  validate(electiveGroupIdParamsSchema, 'params'),
  validate(updateElectiveGroupBodySchema),
  electiveGroupController.updateElectiveGroup,
);

electiveGroupRouter.delete(
  '/:id',
  requireInterimAdmin,
  validate(electiveGroupIdParamsSchema, 'params'),
  electiveGroupController.deleteElectiveGroup,
);
