// apps/api/src/modules/admissions/admission.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authorize } from '../rbac/authorization/authorization.middleware.js';

import * as admissionController from './admission.controller.js';
import {
  admissionIdParamsSchema,
  createAdmissionBodySchema,
  listAdmissionsQuerySchema,
  updateAdmissionBodySchema,
} from './admission.validation.js';

/**
 * `requireAuth`/`validate`/`authorize` import paths follow the directory
 * layout in the repo tree; exact names/signatures (in particular
 * `authorize(resource, action)` as two positional strings) are taken
 * directly from the task's own routes pseudocode, since no existing
 * routes file was available to verify against.
 *
 * No DELETE route — never added.
 */
const admissionRouter = Router();

admissionRouter.post(
  '/',
  requireAuth,
  authorize('admission', 'create'),
  validate(createAdmissionBodySchema, 'body'),
  admissionController.createAdmission,
);

admissionRouter.get(
  '/',
  requireAuth,
  authorize('admission', 'read'),
  validate(listAdmissionsQuerySchema, 'query'),
  admissionController.listAdmissions,
);

admissionRouter.get(
  '/:id',
  requireAuth,
  authorize('admission', 'read'),
  validate(admissionIdParamsSchema, 'params'),
  admissionController.getAdmissionById,
);

admissionRouter.patch(
  '/:id',
  requireAuth,
  authorize('admission', 'update'),
  validate(admissionIdParamsSchema, 'params'),
  validate(updateAdmissionBodySchema, 'body'),
  admissionController.updateAdmission,
);

admissionRouter.post(
  '/:id/cancel',
  requireAuth,
  authorize('admission', 'cancel'),
  validate(admissionIdParamsSchema, 'params'),
  admissionController.cancelAdmission,
);

export { admissionRouter };
