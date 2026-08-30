// apps/api/src/modules/academic/curricula/curriculum.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../../middlewares/auth.middleware.js';
import { requireInterimAdmin } from '../../../middlewares/interim-admin.guard.js';
import { validate } from '../../../middlewares/validate.middleware.js';

import * as curriculumController from './curriculum.controller.js';
import {
  createCurriculumVersionBodySchema,
  curriculumVersionIdParamsSchema,
  listCurriculumVersionsQuerySchema,
  updateCurriculumVersionBodySchema,
} from './curriculum.validation.js';

/**
 * HTTP route composition for the CurriculumVersion module — mirrors
 * department.routes.ts / program.routes.ts exactly in shape: every
 * handler below is requireAuth -> authorization -> validate(schema,
 * source) -> the corresponding curriculumController handler. No
 * business logic, Prisma access, repository/service calls, audit
 * logic, or manual validation lives in this file.
 *
 * RBAC gap (verified against the current repository, not assumed):
 * `AuthorizationResource` in authorization.types.ts does not include
 * 'curriculum', and the PERMISSIONS catalog in permission.constants.ts
 * has no curriculum:create/read/update/delete entries — only user,
 * role, permission, roleAssignment, department, and program are
 * registered. `authorize('curriculum', <action>)` is therefore not
 * expressible without an invalid resource literal or a type cast,
 * both of which are disallowed here, and this file must not edit
 * authorization.types.ts or permission.constants.ts to invent one.
 *
 * This router falls back to requireInterimAdmin
 * (../../../middlewares/interim-admin.guard.js) — the same interim
 * guard program.routes.ts's own comments confirm was this codebase's
 * established convention for an academic resource before it was
 * registered in RBAC ("requireInterimAdmin has been fully retired
 * from this router ... now that Program is a first-class RBAC
 * resource"). requireInterimAdmin is not operation-specific (it only
 * checks for an active admin/super_admin role assignment), so it is
 * applied uniformly to all five routes below rather than varying by
 * action.
 *
 * Future work (outside this file's scope): once 'curriculum' is added
 * to AuthorizationResource and curriculum:create/read/update/delete
 * are added to PERMISSIONS, replace every requireInterimAdmin below
 * with authorize('curriculum', 'create' | 'read' | 'update' |
 * 'delete'), matching department.routes.ts / program.routes.ts.
 */

export const curriculumRouter = Router();

curriculumRouter.use(requireAuth);

curriculumRouter.post(
  '/',
  requireInterimAdmin,
  validate(createCurriculumVersionBodySchema),
  curriculumController.createCurriculumVersion,
);

curriculumRouter.get(
  '/',
  requireInterimAdmin,
  validate(listCurriculumVersionsQuerySchema, 'query'),
  curriculumController.listCurriculumVersions,
);

curriculumRouter.get(
  '/:id',
  requireInterimAdmin,
  validate(curriculumVersionIdParamsSchema, 'params'),
  curriculumController.getCurriculumVersionById,
);

curriculumRouter.patch(
  '/:id',
  requireInterimAdmin,
  validate(curriculumVersionIdParamsSchema, 'params'),
  validate(updateCurriculumVersionBodySchema),
  curriculumController.updateCurriculumVersion,
);

curriculumRouter.delete(
  '/:id',
  requireInterimAdmin,
  validate(curriculumVersionIdParamsSchema, 'params'),
  curriculumController.deleteCurriculumVersion,
);
