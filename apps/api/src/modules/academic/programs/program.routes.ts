// apps/api/src/modules/academic/programs/program.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { authorize } from '../../rbac/index.js';

import * as programController from './program.controller.js';
import {
  createProgramBodySchema,
  listProgramsQuerySchema,
  programIdParamsSchema,
  updateProgramBodySchema,
} from './program.validation.js';

/**
 * HTTP route composition for the Program module — mirrors
 * department.routes.ts exactly, now that Program is a first-class RBAC
 * resource (see authorization.types.ts / permission.constants.ts).
 * `authorize` is imported from `../../rbac/index.js`, not
 * `../../rbac/authorization/authorization.middleware.js` directly —
 * program.routes.ts lives outside the rbac module (in academic/), so it
 * crosses the module boundary through the public rbac/index.ts surface,
 * same as department.routes.ts. (role.routes.ts /
 * role-assignment.routes.ts import `authorize` directly from
 * authorization.middleware.js instead — that's correct for them too,
 * since those files live inside the rbac module itself and aren't
 * crossing a module boundary.)
 *
 * `requireInterimAdmin` has been fully retired from this router — Program
 * now goes through real, operation-specific RBAC authorization, matching
 * the Department/Role/Permission/RoleAssignment pattern.
 *
 * Contains no business logic, no Prisma, no repository/service calls, no
 * audit logic, and no manual validation — every handler below is
 * exactly: requireAuth → authorize(resource, action) →
 * validate(schema, source) → the corresponding programController handler.
 */

export const programRouter = Router();

programRouter.use(requireAuth);

programRouter.post(
  '/',
  authorize('program', 'create'),
  validate(createProgramBodySchema),
  programController.createProgram,
);

programRouter.get(
  '/',
  authorize('program', 'read'),
  validate(listProgramsQuerySchema, 'query'),
  programController.listPrograms,
);

programRouter.get(
  '/:id',
  authorize('program', 'read'),
  validate(programIdParamsSchema, 'params'),
  programController.getProgramById,
);

programRouter.patch(
  '/:id',
  authorize('program', 'update'),
  validate(programIdParamsSchema, 'params'),
  validate(updateProgramBodySchema),
  programController.updateProgram,
);

programRouter.delete(
  '/:id',
  authorize('program', 'delete'),
  validate(programIdParamsSchema, 'params'),
  programController.deleteProgram,
);
