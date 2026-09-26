// apps/api/src/modules/hod/hod.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authorize } from '../rbac/authorization/authorization.middleware.js';

import * as hodController from './hod.controller.js';
import {
  createHodFacultyAssignmentBodySchema,
  createHodTimetableBodySchema,
  hodTimetableQuerySchema,
  listHodStudentsQuerySchema,
} from './hod.validation.js';

export const hodRouter = Router();

hodRouter.use(requireAuth);

hodRouter.get(
  '/profile',
  authorize('department', 'read'),
  hodController.getProfile,
);

hodRouter.get(
  '/overview',
  authorize('department', 'read'),
  hodController.getOverview,
);

hodRouter.get(
  '/faculty',
  authorize('department', 'read'),
  hodController.getFaculty,
);

hodRouter.get(
  '/offerings',
  authorize('department', 'read'),
  hodController.getCourseOfferings,
);

hodRouter.get(
  '/students',
  authorize('student', 'read'),
  validate(listHodStudentsQuerySchema, 'query'),
  hodController.getStudents,
);

hodRouter.get(
  '/timetable/options',
  authorize('timetable', 'read'),
  hodController.getTimetableOptions,
);

hodRouter.get(
  '/timetable',
  authorize('timetable', 'read'),
  validate(hodTimetableQuerySchema, 'query'),
  hodController.getTimetable,
);

hodRouter.get(
  '/attendance',
  authorize('attendance', 'read'),
  hodController.getAttendance,
);

hodRouter.get(
  '/promotions',
  authorize('promotion', 'read'),
  hodController.getPromotions,
);

hodRouter.post(
  '/assignments',
  authorize('facultyAssignment', 'create'),
  validate(createHodFacultyAssignmentBodySchema),
  hodController.createFacultyAssignment,
);

hodRouter.post(
  '/timetable',
  authorize('timetable', 'create'),
  validate(createHodTimetableBodySchema),
  hodController.createTimetableEntry,
);
