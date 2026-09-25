// apps/api/src/modules/faculty/faculty.routes.ts

import { type NextFunction, type Request, type Response, Router } from 'express';

import { ApiError } from '../../common/errors/ApiError.js';
import { ErrorCode } from '../../common/errors/ErrorCodes.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

import * as facultyController from './faculty.controller.js';
import {
  facultyLectureIdParamsSchema,
  listFacultyLecturesQuerySchema,
  submitAttendanceBodySchema,
} from './faculty.validation.js';

/**
 * Gatekeeper middleware ensuring that only users with an active 'faculty' or 'hod'
 * (or system admin) role assignment can access the faculty portal API.
 */
async function requireFacultyRole(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const now = new Date();
    const facultyRoleAssignment = await prisma.roleAssignment.findFirst({
      where: {
        userId: req.user!.id,
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        role: {
          key: { in: ['faculty', 'hod', 'admin', 'super_admin'] },
        },
      },
    });

    if (!facultyRoleAssignment) {
      next(
        ApiError.forbidden(
          'Access restricted: Your account is not authorized as an active faculty member.',
          ErrorCode.INSUFFICIENT_ROLE,
        ),
      );
      return;
    }

    next();
  } catch (err) {
    next(err);
  }
}

export const facultyRouter = Router();

facultyRouter.use(requireAuth);
facultyRouter.use(requireFacultyRole);

facultyRouter.get('/me', facultyController.getProfile);
facultyRouter.get('/me/assignments', facultyController.getAssignments);
facultyRouter.get('/me/timetable', facultyController.getTimetable);
facultyRouter.get(
  '/me/lectures',
  validate(listFacultyLecturesQuerySchema, 'query'),
  facultyController.getLectures,
);
facultyRouter.get(
  '/me/lectures/:lectureId/roster',
  validate(facultyLectureIdParamsSchema, 'params'),
  facultyController.getLectureRoster,
);
facultyRouter.post(
  '/me/lectures/:lectureId/attendance',
  validate(facultyLectureIdParamsSchema, 'params'),
  validate(submitAttendanceBodySchema, 'body'),
  facultyController.submitAttendance,
);
facultyRouter.get('/me/attendance/summary', facultyController.getAttendanceSummary);
