// apps/api/src/modules/lectures/lecture.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../common/responses/ApiResponse.js';

import { lectureService } from './lecture.service.js';
import type {
  CreateLectureInput,
  ListLecturesFilters,
  ListLecturesOptions,
} from './lecture.types.js';
import type {
  CreateLectureBody,
  LectureIdParams,
  ListLecturesQuery,
} from './lecture.validation.js';

/**
 * Thin HTTP adapter over LectureService — matches timetable.controller.ts /
 * subjectOffering.controller.ts exactly: plain exported async functions (no
 * class), no Prisma, no repository, no business logic, no RBAC decisions, no
 * duplicated validation. Every handler assumes route middleware has already
 * run requireAuth -> authorize(...) -> validate(...) in that order, so
 * req.user is set and req.valid.{body,params,query} already holds validated,
 * coerced data.
 *
 * This module intentionally exposes exactly three operations — create,
 * get-by-id, list. There is no update, delete, cancel, complete, or
 * reschedule handler: LectureService has no such method to call, and
 * lecture.types.ts defines neither an UpdateLectureInput nor a
 * Cancel/CompleteLectureInput. A Lecture is a historical occurrence whose
 * identity AttendanceSession depends on (`AttendanceSession.lectureId` is
 * @unique with onDelete: Cascade), so its identity fields must not move
 * underneath the attendance records that point at them. Status transitions
 * are future dedicated service operations, not a generic PATCH, and are not
 * anticipated or stubbed here.
 *
 * The create body intentionally carries only timetableId and scheduledDate.
 * subjectOfferingId, subjectComponentId, facultyAssignmentId, facultyUserId,
 * roomId, semesterCatalogId, academicYearId, startTime, and endTime are all
 * real Lecture columns, but every one of them is resolved by
 * lectureService.createLecture from the referenced Timetable row (and the
 * FacultyAssignment behind it) — accepting any of them here would let a
 * caller create a Lecture whose room or time disagrees with the pattern it
 * claims to realize. `status` is likewise absent: the schema defaults it to
 * SCHEDULED, and no caller may create a row already COMPLETED or CANCELLED.
 *
 * `timetableId` is required here even though the Prisma column is nullable —
 * the nullability exists for future ad-hoc lectures, which are a materially
 * wider input shape with no service operation behind them yet. No /ad-hoc
 * route and no second create handler is invented for it.
 *
 * actorUserId (the authenticated administrator/coordinator performing the
 * scheduling action) is read from req.user and passed as its own service
 * parameter. It is never written to facultyUserId — the person teaching the
 * lecture is reached through Timetable -> FacultyAssignment -> facultyUserId
 * by the service, and the two identities are never merged. No attendance
 * concern appears in this file; Attendance references a Lecture from its own
 * module.
 */

export const createLecture = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as CreateLectureBody;
  const actorUserId = req.user!.id;

  const input: CreateLectureInput = {
    timetableId: body.timetableId,
    scheduledDate: body.scheduledDate,
  };

  const lecture = await lectureService.createLecture(actorUserId, input);

  ApiResponse.created(res, lecture, 'Lecture created');
};

export const getLectureById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as LectureIdParams;

  const lecture = await lectureService.getLectureById(params.id);

  ApiResponse.ok(res, lecture);
};

export const listLectures = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListLecturesQuery;

  /**
   * Conditional spread per field — matching timetable.controller.ts /
   * semesterEnrollment.controller.ts — rather than rest-destructuring
   * `query`. Under `exactOptionalPropertyTypes: true`, a key must be
   * entirely absent when unset, not present-with-value-undefined.
   *
   * fromDate/toDate are passed straight through as the YYYY-MM-DD strings
   * validation produced. They are inclusive bounds on a single column, not
   * two separate filters, and the repository owns collapsing them into one
   * clause and anchoring each to UTC — no date parsing, comparison, or
   * reordering happens in this file. An inverted range is forwarded
   * unchanged rather than silently swapped.
   */
  const filters: ListLecturesFilters = {
    ...(query.timetableId !== undefined && { timetableId: query.timetableId }),
    ...(query.subjectOfferingId !== undefined && { subjectOfferingId: query.subjectOfferingId }),
    ...(query.subjectComponentId !== undefined && {
      subjectComponentId: query.subjectComponentId,
    }),
    ...(query.facultyAssignmentId !== undefined && {
      facultyAssignmentId: query.facultyAssignmentId,
    }),
    ...(query.facultyUserId !== undefined && { facultyUserId: query.facultyUserId }),
    ...(query.semesterCatalogId !== undefined && { semesterCatalogId: query.semesterCatalogId }),
    ...(query.academicYearId !== undefined && { academicYearId: query.academicYearId }),
    ...(query.roomId !== undefined && { roomId: query.roomId }),
    ...(query.status !== undefined && { status: query.status }),
    ...(query.fromDate !== undefined && { fromDate: query.fromDate }),
    ...(query.toDate !== undefined && { toDate: query.toDate }),
  };

  const options: ListLecturesOptions = {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };

  const result = await lectureService.listLectures(filters, options);

  // lectureService returns `readonly LectureDTO[]`; ApiResponse.paginated's
  // signature takes `T[]`, so it is spread into a fresh mutable array here
  // rather than widening either signature. No pagination math happens here —
  // ApiResponse.paginated derives totalPages from `total`.
  ApiResponse.paginated(res, [...result.lectures], {
    page: query.page,
    limit: query.limit,
    total: result.total,
  });
};
