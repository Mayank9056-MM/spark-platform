// apps/api/src/modules/academic/subjects/subject.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../../middlewares/auth.middleware.js';
import { requireInterimAdmin } from '../../../middlewares/interim-admin.guard.js';
import { validate } from '../../../middlewares/validate.middleware.js';

import * as subjectController from './subject.controller.js';
import {
  createSubjectBodySchema,
  listSubjectsQuerySchema,
  subjectIdParamsSchema,
  updateSubjectBodySchema,
} from './subject.validation.js';

/**
 * HTTP route composition for the Subject module — pure composition only:
 * requireAuth → authorization guard → validate(schema, source) →
 * controller. No Prisma, no repository/service calls, no audit logic, no
 * manual validation, and no business rules live here — those belong to
 * subject.service.ts / subject.repository.ts. The controller owns
 * ApiResponse construction; errors propagate to the centralized error
 * middleware, never caught here.
 *
 * ── AUTHORIZATION: INTERIM, NOT YET REGISTERED IN RBAC ────────────────
 * `AuthorizationResource` (authorization.types.ts) has no 'subject'
 * literal, and permission.constants.ts has no corresponding SUBJECT_*
 * catalog entries — confirmed by direct inspection, not assumed. This
 * router therefore uses `requireInterimAdmin` uniformly across all five
 * routes, mirroring semester.routes.ts's identical interim state for the
 * identical reason (same academic-module family, same unregistered
 * status).
 *
 * Future migration, once a 'subject' resource + permissions are formally
 * registered (mirroring department.routes.ts's target mapping):
 *   requireInterimAdmin → authorize('subject', 'create')  // POST /
 *   requireInterimAdmin → authorize('subject', 'read')    // GET /, GET /:id
 *   requireInterimAdmin → authorize('subject', 'update')  // PATCH /:id
 *   requireInterimAdmin → authorize('subject', 'delete')  // DELETE /:id
 */

export const subjectRouter = Router();

subjectRouter.use(requireAuth);

subjectRouter.post(
  '/',
  requireInterimAdmin,
  validate(createSubjectBodySchema),
  subjectController.createSubject,
);

subjectRouter.get(
  '/',
  requireInterimAdmin,
  validate(listSubjectsQuerySchema, 'query'),
  subjectController.listSubjects,
);

subjectRouter.get(
  '/:id',
  requireInterimAdmin,
  validate(subjectIdParamsSchema, 'params'),
  subjectController.getSubjectById,
);

subjectRouter.patch(
  '/:id',
  requireInterimAdmin,
  validate(subjectIdParamsSchema, 'params'),
  validate(updateSubjectBodySchema),
  subjectController.updateSubject,
);

subjectRouter.delete(
  '/:id',
  requireInterimAdmin,
  validate(subjectIdParamsSchema, 'params'),
  subjectController.deleteSubject,
);
