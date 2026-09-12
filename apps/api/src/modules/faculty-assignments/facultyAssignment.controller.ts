// apps/api/src/modules/faculty-assignments/facultyAssignment.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../common/responses/ApiResponse.js';

import { facultyAssignmentService } from './facultyAssignment.service.js';
import type {
  CreateFacultyAssignmentInput,
  ListFacultyAssignmentsFilters,
  ListFacultyAssignmentsOptions,
} from './facultyAssignment.types.js';
import type {
  CreateFacultyAssignmentBody,
  FacultyAssignmentIdParams,
  ListFacultyAssignmentsQuery,
} from './facultyAssignment.validation.js';

/**
 * Thin HTTP adapter over FacultyAssignmentService — matches
 * subjectOffering.controller.ts / semesterEnrollment.controller.ts
 * exactly: plain exported async functions (no class), no Prisma, no
 * repository, no business logic, no RBAC decisions, no duplicated
 * validation. Every handler assumes route middleware has already run
 * requireAuth -> authorize(...) -> validate(...) in that order, so
 * req.user is set and req.valid.{body,params,query} already holds
 * validated, coerced data.
 *
 * This module intentionally exposes exactly three operations — create,
 * get-by-id, list. There is no update/delete handler here:
 * FacultyAssignmentService has no updateFacultyAssignment/
 * deleteFacultyAssignment method to call — facultyAssignment.types.ts
 * defines no UpdateFacultyAssignmentInput, since subjectOfferingId/
 * subjectComponentId/facultyUserId become immutable identity fields the
 * moment any downstream scheduling activity (Timetable/Lecture)
 * references the row.
 *
 * facultyUserId in the create body is the faculty member BEING
 * assigned; actorUserId (the authenticated caller) is read separately
 * from req.user and passed as its own service parameter — the two are
 * never merged.
 */

export const createFacultyAssignment = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as CreateFacultyAssignmentBody;
  const actorUserId = req.user!.id;

  const input: CreateFacultyAssignmentInput = {
    subjectOfferingId: body.subjectOfferingId,
    subjectComponentId: body.subjectComponentId,
    facultyUserId: body.facultyUserId,
  };

  const facultyAssignment = await facultyAssignmentService.createFacultyAssignment(
    actorUserId,
    input,
  );

  ApiResponse.created(res, facultyAssignment, 'Faculty assignment created');
};

export const getFacultyAssignmentById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as FacultyAssignmentIdParams;

  const facultyAssignment = await facultyAssignmentService.getFacultyAssignmentById(params.id);

  ApiResponse.ok(res, facultyAssignment);
};

export const listFacultyAssignments = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListFacultyAssignmentsQuery;

  /**
   * Conditional spread per field — matching subjectOffering.controller.ts
   * / semesterEnrollment.controller.ts — rather than rest-destructuring
   * `query`. Under `exactOptionalPropertyTypes: true`, a key must be
   * entirely absent when unset, not present-with-value-undefined.
   */
  const filters: ListFacultyAssignmentsFilters = {
    ...(query.subjectOfferingId !== undefined && { subjectOfferingId: query.subjectOfferingId }),
    ...(query.subjectComponentId !== undefined && {
      subjectComponentId: query.subjectComponentId,
    }),
    ...(query.facultyUserId !== undefined && { facultyUserId: query.facultyUserId }),
  };

  const options: ListFacultyAssignmentsOptions = {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };

  const result = await facultyAssignmentService.listFacultyAssignments(filters, options);

  // facultyAssignmentService returns `readonly FacultyAssignmentDTO[]`;
  // ApiResponse.paginated's signature takes `T[]`, so it is spread into a
  // fresh mutable array here rather than widening either signature. No
  // pagination math happens here — ApiResponse.paginated derives
  // totalPages from `total`.
  ApiResponse.paginated(res, [...result.facultyAssignments], {
    page: query.page,
    limit: query.limit,
    total: result.total,
  });
};
