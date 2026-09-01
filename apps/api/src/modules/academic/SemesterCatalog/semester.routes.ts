// apps/api/src/modules/academic/SemesterCatalog/semester.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { authorize } from '../../rbac/index.js';

import * as semesterCatalogController from './semester.controller.js';
import {
  createSemesterCatalogBodySchema,
  listSemesterCatalogsQuerySchema,
  semesterCatalogIdParamsSchema,
  updateSemesterCatalogBodySchema,
} from './semester.validation.js';

/**
 * HTTP route composition for the SemesterCatalog module — pure
 * composition only: requireAuth → authorize(resource, action) →
 * validate(schema, source) → controller. No Prisma, no repository/service
 * calls, no audit logic, no manual validation, and no business rules live
 * here — those belong to semester.service.ts / semester.repository.ts.
 * Controllers own ApiResponse construction; errors propagate to the
 * centralized error middleware, never caught here.
 *
 * ── AUTHORIZATION: FIRST-CLASS RBAC RESOURCE ──────────────────────────
 * SemesterCatalog is now a first-class RBAC resource — migrated off the
 * `requireInterimAdmin` stopgap the same way department.routes.ts /
 * program.routes.ts were. `AuthorizationResource` (authorization.types.ts)
 * includes the 'semesterCatalog' literal, and permission.constants.ts
 * defines the corresponding SEMESTER_CATALOG_* catalog entries. Routes
 * use operation-specific permissions:
 *
 *   POST /      → semesterCatalog:create
 *   GET /       → semesterCatalog:read
 *   GET /:id    → semesterCatalog:read
 *   PATCH /:id  → semesterCatalog:update
 *   DELETE /:id → semesterCatalog:delete
 *
 * `authorize` is imported from `../../rbac/index.js`, not
 * `../../rbac/authorization/authorization.middleware.js` directly —
 * semester.routes.ts lives outside the rbac module (in academic/), so it
 * crosses the module boundary through the public rbac/index.ts surface,
 * same as department.routes.ts / program.routes.ts.
 */

export const semesterCatalogRouter = Router();

semesterCatalogRouter.use(requireAuth);

semesterCatalogRouter.post(
  '/',
  authorize('semesterCatalog', 'create'),
  validate(createSemesterCatalogBodySchema),
  semesterCatalogController.createSemesterCatalog,
);

semesterCatalogRouter.get(
  '/',
  authorize('semesterCatalog', 'read'),
  validate(listSemesterCatalogsQuerySchema, 'query'),
  semesterCatalogController.listSemesterCatalogs,
);

semesterCatalogRouter.get(
  '/:id',
  authorize('semesterCatalog', 'read'),
  validate(semesterCatalogIdParamsSchema, 'params'),
  semesterCatalogController.getSemesterCatalogById,
);

semesterCatalogRouter.patch(
  '/:id',
  authorize('semesterCatalog', 'update'),
  validate(semesterCatalogIdParamsSchema, 'params'),
  validate(updateSemesterCatalogBodySchema),
  semesterCatalogController.updateSemesterCatalog,
);

semesterCatalogRouter.delete(
  '/:id',
  authorize('semesterCatalog', 'delete'),
  validate(semesterCatalogIdParamsSchema, 'params'),
  semesterCatalogController.deleteSemesterCatalog,
);
