// apps/api/src/modules/lectures/lecture.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authorize } from '../rbac/authorization/authorization.middleware.js';

import * as lectureController from './lecture.controller.js';
import {
  createLectureBodySchema,
  lectureIdParamsSchema,
  listLecturesQuerySchema,
} from './lecture.validation.js';

/**
 * HTTP route composition for the Lecture module — mirrors
 * timetable.routes.ts: requireAuth is applied once via `router.use(...)`,
 * then every route is exactly authorize(resource, action) ->
 * validate(schema, source) -> the corresponding lectureController handler.
 * No business logic, no Prisma, no service/repository calls, and no
 * manual validation live here.
 *
 * RBAC resource: 'lecture' — a first-class, dedicated
 * AuthorizationResource, added to authorization.types.ts alongside this
 * module rather than reused from 'timetable' or 'faculty'. Scheduling a
 * recurring weekly slot (Timetable) and materializing a dated occurrence
 * of it (Lecture) are distinct capabilities a role may hold independently
 * — a scheduling coordinator might hold timetable:create without
 * lecture:create, or vice versa — the same reasoning timetable.routes.ts
 * gives for not reusing 'facultyAssignment'. The matching
 * LECTURE_CREATE/LECTURE_READ permission-catalog entries and their
 * database seed/role grants are an RBAC-module prerequisite, tracked
 * separately — see this task's verification notes.
 *
 * Only 'create' and 'read' actions are used, matching the only two
 * capabilities LectureService exposes. No PATCH/:id, DELETE/:id, or any
 * /:id/cancel, /:id/complete, /:id/reschedule route: LectureService has no
 * update/delete/lifecycle-transition method to call, and lecture.types.ts
 * defines no input for any of them — a Lecture's identity fields must stay
 * immutable once created, since AttendanceSession depends on lectureId.
 *
 * No /ad-hoc route: CreateLectureInput accepts only timetableId +
 * scheduledDate; an ad-hoc (timetableId-less) creation path is not
 * something lecture.service.ts supports today, and this file does not
 * invent a second create endpoint speculatively.
 *
 * This router only defines paths relative to its own mount point; it is
 * not yet wired into app.ts (no other lecture module file has been
 * mounted there either) — see this task's verification notes.
 */
export const lectureRouter = Router();

lectureRouter.use(requireAuth);

lectureRouter.post(
  '/',
  authorize('lecture', 'create'),
  validate(createLectureBodySchema),
  lectureController.createLecture,
);

lectureRouter.get(
  '/',
  authorize('lecture', 'read'),
  validate(listLecturesQuerySchema, 'query'),
  lectureController.listLectures,
);

lectureRouter.get(
  '/:id',
  authorize('lecture', 'read'),
  validate(lectureIdParamsSchema, 'params'),
  lectureController.getLectureById,
);
