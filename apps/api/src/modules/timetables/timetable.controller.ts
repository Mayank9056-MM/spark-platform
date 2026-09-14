// apps/api/src/modules/timetables/timetable.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../common/responses/ApiResponse.js';

import { timetableService } from './timetable.service.js';
import type {
  CreateTimetableInput,
  ListTimetablesFilters,
  ListTimetablesOptions,
} from './timetable.types.js';
import type {
  CreateTimetableBody,
  ListTimetablesQuery,
  TimetableIdParams,
} from './timetable.validation.js';

/**
 * Thin HTTP adapter over TimetableService — matches
 * facultyAssignment.controller.ts / subjectOffering.controller.ts
 * exactly: plain exported async functions (no class), no Prisma, no
 * repository, no business logic, no RBAC decisions, no duplicated
 * validation. Every handler assumes route middleware has already run
 * requireAuth -> authorize(...) -> validate(...) in that order, so
 * req.user is set and req.valid.{body,params,query} already holds
 * validated, coerced data.
 *
 * This module intentionally exposes exactly three operations — create,
 * get-by-id, list. There is no update/delete handler here:
 * TimetableService has no updateTimetable/deleteTimetable method to
 * call — timetable.types.ts defines no UpdateTimetableInput, since a
 * Timetable row is closed (effectiveTo set) and a new one created on
 * any change, never edited in place (see the schema comment on
 * Timetable.effectiveTo).
 *
 * The create body intentionally carries only facultyAssignmentId /
 * timeSlotId / roomId / effectiveFrom — subjectOfferingId,
 * subjectComponentId, semesterCatalogId, academicYearId, dayOfWeek,
 * startTime, and endTime are all real Timetable columns but are
 * resolved by timetableService.createTimetable from the referenced
 * FacultyAssignment/SubjectOffering/TimeSlot rows, not accepted here —
 * see CreateTimetableInput's own doc comment. There is likewise no
 * facultyUserId in this body: the faculty member is reached through
 * Timetable -> FacultyAssignment -> facultyUserId, not assigned
 * directly.
 *
 * actorUserId (the authenticated caller performing the scheduling
 * action) is read from req.user and passed as its own service
 * parameter, distinct from any identity embedded in the referenced
 * FacultyAssignment — the two are never merged.
 */

export const createTimetable = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as CreateTimetableBody;
  const actorUserId = req.user!.id;

  const input: CreateTimetableInput = {
    facultyAssignmentId: body.facultyAssignmentId,
    timeSlotId: body.timeSlotId,
    roomId: body.roomId,
    ...(body.effectiveFrom !== undefined && { effectiveFrom: body.effectiveFrom }),
  };

  const timetable = await timetableService.createTimetable(actorUserId, input);

  ApiResponse.created(res, timetable, 'Timetable created');
};

export const getTimetableById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as TimetableIdParams;

  const timetable = await timetableService.getTimetableById(params.id);

  ApiResponse.ok(res, timetable);
};

export const listTimetables = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListTimetablesQuery;

  /**
   * Conditional spread per field — matching facultyAssignment.controller.ts
   * / subjectOffering.controller.ts — rather than rest-destructuring
   * `query`. Under `exactOptionalPropertyTypes: true`, a key must be
   * entirely absent when unset, not present-with-value-undefined.
   */
  const filters: ListTimetablesFilters = {
    ...(query.subjectOfferingId !== undefined && { subjectOfferingId: query.subjectOfferingId }),
    ...(query.subjectComponentId !== undefined && {
      subjectComponentId: query.subjectComponentId,
    }),
    ...(query.facultyAssignmentId !== undefined && {
      facultyAssignmentId: query.facultyAssignmentId,
    }),
    ...(query.semesterCatalogId !== undefined && { semesterCatalogId: query.semesterCatalogId }),
    ...(query.academicYearId !== undefined && { academicYearId: query.academicYearId }),
    ...(query.timeSlotId !== undefined && { timeSlotId: query.timeSlotId }),
    ...(query.roomId !== undefined && { roomId: query.roomId }),
    ...(query.dayOfWeek !== undefined && { dayOfWeek: query.dayOfWeek }),
    ...(query.isCancelled !== undefined && { isCancelled: query.isCancelled }),
  };

  const options: ListTimetablesOptions = {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };

  const result = await timetableService.listTimetables(filters, options);

  // timetableService returns `readonly TimetableDTO[]`; ApiResponse.paginated's
  // signature takes `T[]`, so it is spread into a fresh mutable array here
  // rather than widening either signature. No pagination math happens here —
  // ApiResponse.paginated derives totalPages from `total`.
  ApiResponse.paginated(res, [...result.timetables], {
    page: query.page,
    limit: query.limit,
    total: result.total,
  });
};
