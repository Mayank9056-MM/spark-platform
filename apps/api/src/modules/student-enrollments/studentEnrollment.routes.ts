// apps/api/src/modules/student-enrollments/studentEnrollment.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authorize } from '../rbac/index.js';

import * as studentEnrollmentController from './studentEnrollment.controller.js';
import {
  cancelStudentEnrollmentBodySchema,
  createStudentEnrollmentBodySchema,
  listStudentEnrollmentsQuerySchema,
  studentEnrollmentIdParamsSchema,
  updateStudentEnrollmentBodySchema,
  withdrawStudentEnrollmentBodySchema,
} from './studentEnrollment.validation.js';

/**
 * HTTP route composition for the StudentEnrollment module — mirrors
 * academic-year.routes.ts: requireAuth is applied once via
 * `router.use(...)`, then every route is exactly
 * authorize(resource, action) -> validate(schema, source) -> the
 * corresponding studentEnrollmentController handler. No business logic,
 * no Prisma, no service/repository calls, and no manual validation live
 * here.
 *
 * RBAC resource: 'student' — StudentEnrollment has no dedicated
 * 'studentEnrollment'/'enrollment' entry in AuthorizationResource, and
 * the task explicitly disallows inventing one, so it stays under the
 * existing 'student' resource used elsewhere in the RBAC types.
 *
 * withdraw is authorized as `student:update`, not a dedicated `withdraw`
 * action: AuthorizationAction has no such value ('create' | 'read' |
 * 'update' | 'delete' | 'archive' | 'restore' | 'activate' | 'cancel'),
 * and inventing one is explicitly out of scope. `update` was chosen over
 * `cancel` because a withdrawal is a legitimate state change on an
 * existing enrollment record (as opposed to cancellation, which negates
 * the enrollment as if it should not have happened) — this is the
 * default the task itself proposes when no dedicated action exists.
 *
 * cancel is authorized as `student:cancel`, mirroring how
 * admission.routes.ts authorizes its own `/:id/cancel` command.
 *
 * No DELETE route: StudentEnrollment is permanent historical academic
 * data and is never physically deleted through this API. No generic
 * `/:id/status` route: lifecycle transitions are reachable only through
 * the dedicated `/:id/cancel` and `/:id/withdraw` commands below.
 */
export const studentEnrollmentRouter = Router();

studentEnrollmentRouter.use(requireAuth);

studentEnrollmentRouter.post(
  '/',
  authorize('student', 'create'),
  validate(createStudentEnrollmentBodySchema),
  studentEnrollmentController.createStudentEnrollment,
);

studentEnrollmentRouter.get(
  '/',
  authorize('student', 'read'),
  validate(listStudentEnrollmentsQuerySchema, 'query'),
  studentEnrollmentController.listStudentEnrollments,
);

studentEnrollmentRouter.get(
  '/:id',
  authorize('student', 'read'),
  validate(studentEnrollmentIdParamsSchema, 'params'),
  studentEnrollmentController.getStudentEnrollmentById,
);

studentEnrollmentRouter.patch(
  '/:id',
  authorize('student', 'update'),
  validate(studentEnrollmentIdParamsSchema, 'params'),
  validate(updateStudentEnrollmentBodySchema),
  studentEnrollmentController.updateStudentEnrollment,
);

studentEnrollmentRouter.post(
  '/:id/cancel',
  authorize('student', 'cancel'),
  validate(studentEnrollmentIdParamsSchema, 'params'),
  validate(cancelStudentEnrollmentBodySchema),
  studentEnrollmentController.cancelStudentEnrollment,
);

studentEnrollmentRouter.post(
  '/:id/withdraw',
  authorize('student', 'update'),
  validate(studentEnrollmentIdParamsSchema, 'params'),
  validate(withdrawStudentEnrollmentBodySchema),
  studentEnrollmentController.withdrawStudentEnrollment,
);
