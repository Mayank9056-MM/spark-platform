// apps/api/src/modules/timetables/timetable.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authorize } from '../rbac/authorization/authorization.middleware.js';

import * as timetableController from './timetable.controller.js';
import {
  createTimetableBodySchema,
  listTimetablesQuerySchema,
  timetableIdParamsSchema,
} from './timetable.validation.js';

/**
 * HTTP route composition for the Timetable module — mirrors
 * facultyAssignment.routes.ts: requireAuth is applied once via
 * `router.use(...)`, then every route is exactly
 * authorize(resource, action) -> validate(schema, source) -> the
 * corresponding timetableController handler. No business logic, no
 * Prisma, no service/repository calls, and no manual validation live
 * here.
 *
 * RBAC resource: 'timetable' — a first-class, dedicated
 * AuthorizationResource (authorization.types.ts), backed by its own
 * timetable:create / timetable:read entries in the permission catalog
 * (permission.constants.ts). This is deliberately NOT 'facultyAssignment'
 * or 'subject': scheduling a recurring weekly slot for an existing
 * FacultyAssignment is a distinct capability from creating that
 * FacultyAssignment or the underlying SubjectOffering, and a role may
 * hold any of these independently (e.g. a scheduling coordinator might
 * hold timetable:create without facultyAssignment:create).
 *
 * Only 'create' and 'read' actions are used, matching the only two
 * capabilities this module exposes. No PATCH/:id or DELETE/:id route:
 * TimetableService has no update/delete method to call — a Timetable
 * row is closed (effectiveTo set) and a new one created on any change,
 * never edited in place (see the schema comment on
 * Timetable.effectiveTo).
 *
 * This router only defines paths relative to its own mount point.
 */
export const timetableRouter = Router();

timetableRouter.use(requireAuth);

timetableRouter.post(
  '/',
  authorize('timetable', 'create'),
  validate(createTimetableBodySchema),
  timetableController.createTimetable,
);

timetableRouter.get(
  '/',
  authorize('timetable', 'read'),
  validate(listTimetablesQuerySchema, 'query'),
  timetableController.listTimetables,
);

timetableRouter.get(
  '/:id',
  authorize('timetable', 'read'),
  validate(timetableIdParamsSchema, 'params'),
  timetableController.getTimetableById,
);
