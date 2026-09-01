// apps/api/src/modules/academic/subjects/subject.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../../common/responses/ApiResponse.js';

import { subjectService } from './subject.service.js';
import type {
  CreateSubjectInput,
  ListSubjectsFilters,
  UpdateSubjectInput,
} from './subject.types.js';
import type {
  CreateSubjectBody,
  ListSubjectsQuery,
  SubjectIdParams,
  UpdateSubjectBody,
} from './subject.validation.js';

/**
 * HTTP adapter for the Subject module — thin by design, mirroring
 * department.controller.ts / semester.controller.ts exactly. Every
 * method here does exactly: read validated input → call SubjectService
 * → send an ApiResponse. No Prisma, no repository, no AuditService, no
 * RBAC decisions, and no business rules live in this file. No DTO
 * mapping here either — SubjectService already returns SubjectDTO /
 * ListSubjectsResult.
 *
 * Route middleware (subject.routes.ts) is expected to run, in order:
 * requireAuth → authorize(...) → validate(schema, source) → the handler
 * below. Every handler therefore assumes `req.user` is set and
 * `req.valid.{body,params,query}` already holds validated, coerced
 * data.
 *
 * Plain exported async functions, not a class — matching every sibling
 * controller in this codebase.
 */

export const createSubject = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as CreateSubjectBody;
  const actorUserId = req.user!.id;

  const input: CreateSubjectInput = {
    semesterCatalogId: body.semesterCatalogId,
    code: body.code,
    name: body.name,
    ...(body.electiveGroupId !== undefined && { electiveGroupId: body.electiveGroupId }),
    ...(body.isElective !== undefined && { isElective: body.isElective }),
  };

  const subject = await subjectService.createSubject(actorUserId, input);
  ApiResponse.created(res, subject, 'Subject created');
};

export const getSubjectById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as SubjectIdParams;
  const subject = await subjectService.getSubjectById(params.id);
  ApiResponse.ok(res, subject);
};

export const listSubjects = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListSubjectsQuery;

  const filters: ListSubjectsFilters = {
    ...(query.search !== undefined && { search: query.search }),
    ...(query.semesterCatalogId !== undefined && { semesterCatalogId: query.semesterCatalogId }),
    ...(query.electiveGroupId !== undefined && { electiveGroupId: query.electiveGroupId }),
    ...(query.isElective !== undefined && { isElective: query.isElective }),
  };

  const { subjects, total } = await subjectService.listSubjects(filters, {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  ApiResponse.paginated(res, subjects, { page: query.page, limit: query.limit, total });
};

export const updateSubject = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as SubjectIdParams;
  const body = req.valid?.body as UpdateSubjectBody;
  const actorUserId = req.user!.id;

  /**
   * `semesterCatalogId` is never read from `body` here —
   * `updateSubjectBodySchema` doesn't accept it at all, so there is
   * nothing to omit; this preserves the domain's immutability rule at
   * the HTTP boundary. `electiveGroupId` uses `!== undefined` (not
   * truthiness) so an explicit `null` in the body — clearing the
   * elective group — is forwarded, not dropped.
   */
  const input: UpdateSubjectInput = {
    ...(body.code !== undefined && { code: body.code }),
    ...(body.name !== undefined && { name: body.name }),
    ...(body.electiveGroupId !== undefined && { electiveGroupId: body.electiveGroupId }),
    ...(body.isElective !== undefined && { isElective: body.isElective }),
  };

  const subject = await subjectService.updateSubject(actorUserId, params.id, input);
  ApiResponse.ok(res, subject, 'Subject updated');
};

export const deleteSubject = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as SubjectIdParams;
  const actorUserId = req.user!.id;

  await subjectService.deleteSubject(actorUserId, params.id);
  ApiResponse.ok(res, null, 'Subject deleted');
};
