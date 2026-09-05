// apps/api/src/modules/semester-enrollments/semesterEnrollment.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authorize } from '../rbac/authorization/authorization.middleware.js';

import * as semesterEnrollmentController from './semesterEnrollment.controller.js';
import {
  createSemesterEnrollmentBodySchema,
  listSemesterEnrollmentsQuerySchema,
  semesterEnrollmentIdParamsSchema,
} from './semesterEnrollment.validation.js';

/**
 * HTTP route composition for the SemesterEnrollment module — mirrors
 * studentEnrollment.routes.ts: requireAuth is applied once via
 * `router.use(...)`, then every route is exactly
 * authorize(resource, action) -> validate(schema, source) -> the
 * corresponding semesterEnrollmentController handler. No business logic,
 * no Prisma, no service/repository calls, and no manual validation live
 * here.
 *
 * RBAC resource: 'student' — SemesterEnrollment has no dedicated
 * 'semesterEnrollment' entry in AuthorizationResource, and inventing one
 * is explicitly out of scope for this task. StudentEnrollment (the
 * direct parent record every SemesterEnrollment belongs to) already
 * established the precedent for this exact situation by reusing
 * 'student' instead of a dedicated 'studentEnrollment' resource; this
 * follows the same convention rather than introducing a second,
 * inconsistent fallback. Verify with whoever owns the RBAC module
 * whether 'student:create'/'student:read' is the intended long-term
 * mapping or whether a dedicated resource should be added later — this
 * file does not decide that on its own.
 *
 * Only 'create' and 'read' actions are used, matching the only two
 * capabilities this module exposes. There is no 'update' or 'cancel'
 * route here (unlike studentEnrollment.routes.ts's PATCH/:id/cancel):
 * SemesterEnrollmentService has no corresponding methods to call.
 *
 * No PATCH /:id, no DELETE /:id, no /:id/status, no /:id/promote,
 * /:id/repeat, or /:id/detain route: SemesterEnrollment lifecycle
 * transitions belong to the not-yet-implemented promotion workflow (see
 * semesterEnrollment.service.ts's "PROMOTION BOUNDARY" note) and are
 * deliberately not stubbed, guessed, or exposed here.
 *
 * This router only defines paths relative to its own mount point; the
 * base path (/api/v1/semester-enrollments) and requireAuth import
 * elsewhere in app.ts are unchanged by this file — see the note at the
 * end of this task's summary about wiring this router into app.ts.
 */
export const semesterEnrollmentRouter = Router();

semesterEnrollmentRouter.use(requireAuth);

semesterEnrollmentRouter.post(
  '/',
  authorize('student', 'create'),
  validate(createSemesterEnrollmentBodySchema),
  semesterEnrollmentController.createSemesterEnrollment,
);

semesterEnrollmentRouter.get(
  '/',
  authorize('student', 'read'),
  validate(listSemesterEnrollmentsQuerySchema, 'query'),
  semesterEnrollmentController.listSemesterEnrollments,
);

semesterEnrollmentRouter.get(
  '/:id',
  authorize('student', 'read'),
  validate(semesterEnrollmentIdParamsSchema, 'params'),
  semesterEnrollmentController.getSemesterEnrollmentById,
);
