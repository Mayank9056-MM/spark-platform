// apps/api/src/modules/student/student.routes.ts

import { type NextFunction, type Request, type Response, Router } from 'express';

import { ApiError } from '../../common/errors/ApiError.js';
import { ErrorCode } from '../../common/errors/ErrorCodes.js';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';

import * as studentController from './student.controller.js';
import { updateStudentProfileBodySchema } from './student.validation.js';

/**
 * Gatekeeper middleware ensuring that only users with an active 'student'
 * role assignment can access the student portal API.
 */
async function requireStudentRole(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const now = new Date();
    const studentRoleAssignment = await prisma.roleAssignment.findFirst({
      where: {
        userId: req.user!.id,
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        role: {
          key: 'student',
        },
      },
    });

    if (!studentRoleAssignment) {
      next(
        ApiError.forbidden(
          'Access restricted: Your account is not authorized as an active student.',
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

export const studentRouter = Router();

studentRouter.use(requireAuth);
studentRouter.use(requireStudentRole);

studentRouter.get('/me', studentController.getProfile);
studentRouter.patch(
  '/me/profile',
  validate(updateStudentProfileBodySchema, 'body'),
  studentController.updateProfile,
);
studentRouter.get('/me/academics', studentController.getAcademics);
studentRouter.get('/me/subjects', studentController.getSubjects);
studentRouter.get('/me/attendance', studentController.getAttendance);
studentRouter.get('/me/timetable', studentController.getTimetable);
studentRouter.get('/me/progress', studentController.getProgress);
