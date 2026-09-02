// apps/api/src/modules/academic-years/academic-year.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authorize } from '../rbac/index.js';

import * as academicYearController from './academic-year.controller.js';
import {
  academicYearIdParamsSchema,
  createAcademicYearBodySchema,
  listAcademicYearsQuerySchema,
  updateAcademicYearBodySchema,
} from './academic-year.validation.js';

/**
 * HTTP route composition for the AcademicYear module — mirrors
 * department.routes.ts / program.routes.ts exactly. Contains no business
 * logic, no Prisma, no repository/service calls, no audit logic, and no
 * manual validation — every handler below is exactly: requireAuth →
 * authorize(resource, action) → validate(schema, source) → the
 * corresponding academicYearController handler.
 */

export const academicYearRouter = Router();

academicYearRouter.use(requireAuth);

academicYearRouter.post(
  '/',
  authorize('academicYear', 'create'),
  validate(createAcademicYearBodySchema),
  academicYearController.createAcademicYear,
);

academicYearRouter.get(
  '/',
  authorize('academicYear', 'read'),
  validate(listAcademicYearsQuerySchema, 'query'),
  academicYearController.listAcademicYears,
);

academicYearRouter.get(
  '/:id',
  authorize('academicYear', 'read'),
  validate(academicYearIdParamsSchema, 'params'),
  academicYearController.getAcademicYearById,
);

academicYearRouter.patch(
  '/:id',
  authorize('academicYear', 'update'),
  validate(academicYearIdParamsSchema, 'params'),
  validate(updateAcademicYearBodySchema),
  academicYearController.updateAcademicYear,
);

academicYearRouter.delete(
  '/:id',
  authorize('academicYear', 'delete'),
  validate(academicYearIdParamsSchema, 'params'),
  academicYearController.deleteAcademicYear,
);

/**
 * Dedicated domain command, not a generic PATCH — separate permission
 * (`academicYear:activate`) from `academicYear:update`, matching the
 * service's own framing of activation as a distinct, college-wide state
 * transition rather than a field-level edit. No body schema: the
 * activate operation takes only the `:id` route param.
 */
academicYearRouter.post(
  '/:id/activate',
  authorize('academicYear', 'activate'),
  validate(academicYearIdParamsSchema, 'params'),
  academicYearController.activateAcademicYear,
);
