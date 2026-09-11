// apps/api/src/modules/subject-offerings/subjectOffering.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authorize } from '../rbac/authorization/authorization.middleware.js';

import * as subjectOfferingController from './subjectOffering.controller.js';
import {
  createSubjectOfferingBodySchema,
  listSubjectOfferingsQuerySchema,
  subjectOfferingIdParamsSchema,
} from './subjectOffering.validation.js';

/**
 * HTTP route composition for the SubjectOffering module — mirrors
 * semesterEnrollment.routes.ts: requireAuth is applied once via
 * `router.use(...)`, then every route is exactly
 * authorize(resource, action) -> validate(schema, source) -> the
 * corresponding subjectOfferingController handler. No business logic,
 * no Prisma, no service/repository calls, and no manual validation live
 * here.
 *
 * RBAC resource: 'subject' — SubjectOffering has no dedicated
 * 'subjectOffering' entry in the permission catalog
 * (permission.constants.ts), and inventing one is explicitly out of
 * scope for this task. This follows the exact precedent
 * semesterEnrollment.routes.ts established for the identical situation
 * (reusing 'student' rather than a dedicated 'semesterEnrollment'
 * resource): SubjectOffering's closest existing domain resource is
 * 'subject' (SUBJECT_CREATE / SUBJECT_READ already exist in the
 * catalog), so this reuses those rather than inventing
 * 'subjectOffering:create' / 'subjectOffering:read'. Verify with
 * whoever owns the RBAC module whether 'subject:create'/'subject:read'
 * is the intended long-term mapping or whether a dedicated resource
 * should be added later — this file does not decide that on its own.
 *
 * Only 'create' and 'read' actions are used, matching the only two
 * capabilities this module exposes. No PATCH/:id or DELETE/:id route:
 * SubjectOfferingService has no update/delete method to call.
 *
 * This router only defines paths relative to its own mount point — see
 * the "Verification" notes below for the app.ts wiring this still needs.
 */
export const subjectOfferingRouter = Router();

subjectOfferingRouter.use(requireAuth);

subjectOfferingRouter.post(
  '/',
  authorize('subject', 'create'),
  validate(createSubjectOfferingBodySchema),
  subjectOfferingController.createSubjectOffering,
);

subjectOfferingRouter.get(
  '/',
  authorize('subject', 'read'),
  validate(listSubjectOfferingsQuerySchema, 'query'),
  subjectOfferingController.listSubjectOfferings,
);

subjectOfferingRouter.get(
  '/:id',
  authorize('subject', 'read'),
  validate(subjectOfferingIdParamsSchema, 'params'),
  subjectOfferingController.getSubjectOfferingById,
);
