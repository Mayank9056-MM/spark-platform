// apps/api/src/modules/academic/SemesterCatalog/semester.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../../middlewares/auth.middleware.js';
import { requireInterimAdmin } from '../../../middlewares/interim-admin.guard.js';
import { validate } from '../../../middlewares/validate.middleware.js';

import * as semesterCatalogController from './semester.controller.js';
import {
  createSemesterCatalogBodySchema,
  listSemesterCatalogsQuerySchema,
  semesterCatalogIdParamsSchema,
  updateSemesterCatalogBodySchema,
} from './semester.validation.js';

/**
 * HTTP route composition for the SemesterCatalog module — pure
 * composition only: requireAuth → authorization guard →
 * validate(schema, source) → controller. No Prisma, no repository/service
 * calls, no audit logic, no manual validation, and no business rules live
 * here — those belong to semester.service.ts / semester.repository.ts.
 * Controllers own ApiResponse construction; errors propagate to the
 * centralized error middleware, never caught here.
 *
 * ── AUTHORIZATION: INTERIM, NOT YET REGISTERED IN RBAC ────────────────
 * Unlike department.routes.ts / program.routes.ts (both migrated to
 * operation-specific `authorize(resource, action)`), SemesterCatalog is
 * NOT yet a registered RBAC resource: `AuthorizationResource`
 * (authorization.types.ts) has no 'semesterCatalog' literal, and
 * permission.constants.ts has no corresponding SEMESTER_CATALOG_*
 * catalog entries. Inventing either — or casting past the missing
 * literal — is out of scope for this change. This router therefore uses
 * `requireInterimAdmin` uniformly across all five routes, the same
 * interim stopgap user.routes.ts still uses for the identical reason.
 *
 * Future migration, once a SemesterCatalog resource + permissions are
 * formally registered (mirroring department.routes.ts's mapping):
 *   requireInterimAdmin → authorize('semesterCatalog', 'create')  // POST /
 *   requireInterimAdmin → authorize('semesterCatalog', 'read')    // GET /, GET /:id
 *   requireInterimAdmin → authorize('semesterCatalog', 'update')  // PATCH /:id
 *   requireInterimAdmin → authorize('semesterCatalog', 'delete')  // DELETE /:id
 */

export const semesterCatalogRouter = Router();

semesterCatalogRouter.use(requireAuth);

semesterCatalogRouter.post(
  '/',
  requireInterimAdmin,
  validate(createSemesterCatalogBodySchema),
  semesterCatalogController.createSemesterCatalog,
);

semesterCatalogRouter.get(
  '/',
  requireInterimAdmin,
  validate(listSemesterCatalogsQuerySchema, 'query'),
  semesterCatalogController.listSemesterCatalogs,
);

semesterCatalogRouter.get(
  '/:id',
  requireInterimAdmin,
  validate(semesterCatalogIdParamsSchema, 'params'),
  semesterCatalogController.getSemesterCatalogById,
);

semesterCatalogRouter.patch(
  '/:id',
  requireInterimAdmin,
  validate(semesterCatalogIdParamsSchema, 'params'),
  validate(updateSemesterCatalogBodySchema),
  semesterCatalogController.updateSemesterCatalog,
);

semesterCatalogRouter.delete(
  '/:id',
  requireInterimAdmin,
  validate(semesterCatalogIdParamsSchema, 'params'),
  semesterCatalogController.deleteSemesterCatalog,
);
