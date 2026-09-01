// apps/api/src/modules/academic/curricula/curriculum.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { authorize } from '../../rbac/index.js';

import * as curriculumController from './curriculum.controller.js';
import {
  createCurriculumVersionBodySchema,
  curriculumVersionIdParamsSchema,
  listCurriculumVersionsQuerySchema,
  updateCurriculumVersionBodySchema,
} from './curriculum.validation.js';

/**
 * HTTP route composition for the CurriculumVersion module — mirrors
 * department.routes.ts / program.routes.ts exactly: every handler below
 * is requireAuth → authorize(resource, action) → validate(schema,
 * source) → the corresponding curriculumController handler. No business
 * logic, Prisma access, repository/service calls, audit logic, or
 * manual validation lives in this file.
 *
 * ── AUTHORIZATION: FIRST-CLASS RBAC RESOURCE ──────────────────────────
 * CurriculumVersion is now a first-class RBAC resource — migrated off
 * the `requireInterimAdmin` stopgap the same way department.routes.ts /
 * program.routes.ts / semester.routes.ts / subject.routes.ts /
 * elective.routes.ts were. `AuthorizationResource` includes the
 * 'curriculumVersion' literal (the full model name, camelCased — the
 * same convention as 'semesterCatalog' and 'electiveGroup', not a
 * shortened 'curriculum'), and permission.constants.ts defines the
 * corresponding CURRICULUM_VERSION_* catalog entries. Routes use
 * operation-specific permissions:
 *
 *   POST /      → curriculumVersion:create
 *   GET /       → curriculumVersion:read
 *   GET /:id    → curriculumVersion:read
 *   PATCH /:id  → curriculumVersion:update
 *   DELETE /:id → curriculumVersion:delete
 *
 * `authorize` is imported from `../../rbac/index.js`, not
 * `../../rbac/authorization/authorization.middleware.js` directly —
 * curriculum.routes.ts lives outside the rbac module (in academic/), so
 * it crosses the module boundary through the public rbac/index.ts
 * surface, same as department.routes.ts / program.routes.ts.
 */

export const curriculumRouter = Router();

curriculumRouter.use(requireAuth);

curriculumRouter.post(
  '/',
  authorize('curriculumVersion', 'create'),
  validate(createCurriculumVersionBodySchema),
  curriculumController.createCurriculumVersion,
);

curriculumRouter.get(
  '/',
  authorize('curriculumVersion', 'read'),
  validate(listCurriculumVersionsQuerySchema, 'query'),
  curriculumController.listCurriculumVersions,
);

curriculumRouter.get(
  '/:id',
  authorize('curriculumVersion', 'read'),
  validate(curriculumVersionIdParamsSchema, 'params'),
  curriculumController.getCurriculumVersionById,
);

curriculumRouter.patch(
  '/:id',
  authorize('curriculumVersion', 'update'),
  validate(curriculumVersionIdParamsSchema, 'params'),
  validate(updateCurriculumVersionBodySchema),
  curriculumController.updateCurriculumVersion,
);

curriculumRouter.delete(
  '/:id',
  authorize('curriculumVersion', 'delete'),
  validate(curriculumVersionIdParamsSchema, 'params'),
  curriculumController.deleteCurriculumVersion,
);
