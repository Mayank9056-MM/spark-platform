// apps/api/src/modules/academic/subjects/subject.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../../middlewares/auth.middleware.js';
import { validate } from '../../../middlewares/validate.middleware.js';
import { authorize } from '../../rbac/index.js';

import * as subjectController from './subject.controller.js';
import {
  createSubjectBodySchema,
  listSubjectsQuerySchema,
  subjectIdParamsSchema,
  updateSubjectBodySchema,
} from './subject.validation.js';

/**
 * HTTP route composition for the Subject module — pure composition only:
 * requireAuth → authorize(resource, action) → validate(schema, source) →
 * controller. No Prisma, no repository/service calls, no audit logic, no
 * manual validation, and no business rules live here — those belong to
 * subject.service.ts / subject.repository.ts. The controller owns
 * ApiResponse construction; errors propagate to the centralized error
 * middleware, never caught here.
 *
 * ── AUTHORIZATION: FIRST-CLASS RBAC RESOURCE ──────────────────────────
 * Subject is now a first-class RBAC resource — migrated off the
 * `requireInterimAdmin` stopgap the same way department.routes.ts /
 * program.routes.ts were. `AuthorizationResource` includes the 'subject'
 * literal, and permission.constants.ts defines the corresponding
 * SUBJECT_* catalog entries. Routes use operation-specific permissions:
 *
 *   POST /      → subject:create
 *   GET /       → subject:read
 *   GET /:id    → subject:read
 *   PATCH /:id  → subject:update
 *   DELETE /:id → subject:delete
 *
 * `authorize` is imported from `../../rbac/index.js`, not
 * `../../rbac/authorization/authorization.middleware.js` directly —
 * subject.routes.ts lives outside the rbac module (in academic/), so it
 * crosses the module boundary through the public rbac/index.ts surface,
 * same as department.routes.ts / program.routes.ts.
 */

export const subjectRouter = Router();

subjectRouter.use(requireAuth);

subjectRouter.post(
  '/',
  authorize('subject', 'create'),
  validate(createSubjectBodySchema),
  subjectController.createSubject,
);

subjectRouter.get(
  '/',
  authorize('subject', 'read'),
  validate(listSubjectsQuerySchema, 'query'),
  subjectController.listSubjects,
);

subjectRouter.get(
  '/:id',
  authorize('subject', 'read'),
  validate(subjectIdParamsSchema, 'params'),
  subjectController.getSubjectById,
);

subjectRouter.patch(
  '/:id',
  authorize('subject', 'update'),
  validate(subjectIdParamsSchema, 'params'),
  validate(updateSubjectBodySchema),
  subjectController.updateSubject,
);

subjectRouter.delete(
  '/:id',
  authorize('subject', 'delete'),
  validate(subjectIdParamsSchema, 'params'),
  subjectController.deleteSubject,
);
