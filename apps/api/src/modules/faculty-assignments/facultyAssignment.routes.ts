// apps/api/src/modules/faculty-assignments/facultyAssignment.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authorize } from '../rbac/authorization/authorization.middleware.js';

import * as facultyAssignmentController from './facultyAssignment.controller.js';
import {
  createFacultyAssignmentBodySchema,
  facultyAssignmentIdParamsSchema,
  listFacultyAssignmentsQuerySchema,
} from './facultyAssignment.validation.js';

/**
 * HTTP route composition for the FacultyAssignment module — mirrors
 * subjectOffering.routes.ts / semesterEnrollment.routes.ts: requireAuth
 * is applied once via `router.use(...)`, then every route is exactly
 * authorize(resource, action) -> validate(schema, source) -> the
 * corresponding facultyAssignmentController handler. No business logic,
 * no Prisma, no service/repository calls, and no manual validation live
 * here.
 *
 * RBAC resource: 'facultyAssignment' — a first-class, dedicated
 * AuthorizationResource (authorization.types.ts), backed by its own
 * facultyAssignment:create / facultyAssignment:read entries in the
 * permission catalog (permission.constants.ts). This is deliberately
 * NOT the broad 'faculty' resource: 'faculty' governs faculty/user-domain
 * management, while 'facultyAssignment' governs assigning a faculty
 * member to teach a specific SubjectOffering's SubjectComponent — two
 * independent capabilities a role may hold in any combination. A role
 * holding faculty:read does not thereby gain facultyAssignment:create,
 * and vice versa; each is granted (via RolePermission) independently.
 * See authorization.types.ts's AuthorizationResource doc comment for the
 * full rationale.
 *
 * Only 'create' and 'read' actions are used, matching the only two
 * capabilities this module exposes. No PATCH/:id or DELETE/:id route:
 * FacultyAssignmentService has no update/delete method to call — see
 * facultyAssignment.controller.ts's header for why.
 *
 * This router only defines paths relative to its own mount point.
 */
export const facultyAssignmentRouter = Router();

facultyAssignmentRouter.use(requireAuth);

facultyAssignmentRouter.post(
  '/',
  authorize('facultyAssignment', 'create'),
  validate(createFacultyAssignmentBodySchema),
  facultyAssignmentController.createFacultyAssignment,
);

facultyAssignmentRouter.get(
  '/',
  authorize('facultyAssignment', 'read'),
  validate(listFacultyAssignmentsQuerySchema, 'query'),
  facultyAssignmentController.listFacultyAssignments,
);

facultyAssignmentRouter.get(
  '/:id',
  authorize('facultyAssignment', 'read'),
  validate(facultyAssignmentIdParamsSchema, 'params'),
  facultyAssignmentController.getFacultyAssignmentById,
);
