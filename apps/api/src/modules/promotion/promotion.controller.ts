// apps/api/src/modules/promotion/promotion.controller.ts

import type { Request, Response } from 'express';

import { ApiResponse } from '../../common/responses/ApiResponse.js';

import { promotionService } from './promotion.service.js';
import type {
  CreatePromotionBatchInput,
  CreatePromotionDecisionInput,
  ListPromotionBatchesFilters,
  ListPromotionBatchesOptions,
  ListPromotionDecisionsFilters,
  ListPromotionDecisionsOptions,
} from './promotion.types.js';
import type {
  CreatePromotionBatchBody,
  CreatePromotionDecisionBody,
  ListPromotionBatchesQuery,
  ListPromotionDecisionsQuery,
  PromotionBatchDecisionsParams,
  PromotionBatchIdParams,
  PromotionDecisionIdParams,
} from './promotion.validation.js';

/**
 * HTTP adapter for the Promotion module (PromotionBatch +
 * PromotionDecision) — thin by design, matching
 * semesterEnrollment.controller.ts / academic-year.controller.ts
 * exactly. Every handler reads validated input, calls PromotionService,
 * and sends an ApiResponse. No Prisma, no repository access, no audit
 * logic, no RBAC decisions, and no promotion business rules (batch
 * status checks, decision eligibility, next-semester resolution, target
 * academic year resolution, enrollment/status transitions) live in this
 * file — all of that belongs to promotion.service.ts.
 *
 * Route middleware (see promotion.routes.ts) is expected to run, in
 * order: requireAuth -> authorize(resource, action) ->
 * validate(schema, source) -> the handler below. Every handler here
 * assumes req.user is set and req.valid.{body,params,query} already
 * holds validated, coerced data.
 *
 * Plain exported async functions, not a class — matching every sibling
 * controller in this codebase (academic-year.controller.ts,
 * semesterEnrollment.controller.ts, studentEnrollment.controller.ts,
 * admission.controller.ts).
 */

export const createPromotionBatch = async (req: Request, res: Response): Promise<void> => {
  const body = req.valid?.body as CreatePromotionBatchBody;
  const actorUserId = req.user!.id;

  const input: CreatePromotionBatchInput = {
    semesterCatalogId: body.semesterCatalogId,
    academicYearId: body.academicYearId,
  };

  const promotionBatch = await promotionService.createPromotionBatch(actorUserId, input);
  ApiResponse.created(res, promotionBatch, 'Promotion batch created');
};

export const getPromotionBatchById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as PromotionBatchIdParams;
  const promotionBatch = await promotionService.getPromotionBatchById(params.id);
  ApiResponse.ok(res, promotionBatch);
};

export const listPromotionBatches = async (req: Request, res: Response): Promise<void> => {
  const query = req.valid?.query as ListPromotionBatchesQuery;

  // Conditional spread per field — matching semesterEnrollment.controller.ts's
  // listSemesterEnrollments — rather than rest-destructuring `query`.
  // Under exactOptionalPropertyTypes: true, an optional filter key must
  // be entirely absent when unset, not present-with-value-undefined.
  const filters: ListPromotionBatchesFilters = {
    ...(query.semesterCatalogId !== undefined && { semesterCatalogId: query.semesterCatalogId }),
    ...(query.academicYearId !== undefined && { academicYearId: query.academicYearId }),
    ...(query.status !== undefined && { status: query.status }),
  };

  const options: ListPromotionBatchesOptions = {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };

  const result = await promotionService.listPromotionBatches(filters, options);

  // promotionService returns `readonly PromotionBatchDTO[]`;
  // ApiResponse.paginated takes `T[]`, so it is spread into a fresh
  // mutable array here rather than widening either signature. No
  // pagination math happens here — the repository already returns
  // `total`, and ApiResponse.paginated derives totalPages.
  ApiResponse.paginated(res, [...result.promotionBatches], {
    page: query.page,
    limit: query.limit,
    total: result.total,
  });
};

/**
 * Dedicated domain command, not a generic PATCH — no request body.
 * The controller does not know (and must not encode) which decisions
 * exist, what outcome each carries, which enrollments get created or
 * transitioned, or whether finalization succeeds; all of that is
 * finalizePromotionBatch's concern in the service.
 */
export const finalizePromotionBatch = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as PromotionBatchIdParams;
  const actorUserId = req.user!.id;

  const promotionBatch = await promotionService.finalizePromotionBatch(actorUserId, params.id);
  ApiResponse.ok(res, promotionBatch, 'Promotion batch finalized');
};

/**
 * batchId comes from route context (promotionBatchDecisionsParamsSchema
 * validates req.params.batchId), never from the request body —
 * createPromotionDecisionBodySchema has no promotionBatchId key at all,
 * so there is nothing in the body that could override the route's batch.
 */
export const createPromotionDecision = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as PromotionBatchDecisionsParams;
  const body = req.valid?.body as CreatePromotionDecisionBody;
  const actorUserId = req.user!.id;

  const input: CreatePromotionDecisionInput = {
    studentEnrollmentId: body.studentEnrollmentId,
    fromSemesterEnrollmentId: body.fromSemesterEnrollmentId,
    outcome: body.outcome,
    ...(body.remarks !== undefined && { remarks: body.remarks }),
  };

  const promotionDecision = await promotionService.createPromotionDecision(
    actorUserId,
    params.batchId,
    input,
  );

  ApiResponse.created(res, promotionDecision, 'Promotion decision created');
};

export const getPromotionDecisionById = async (req: Request, res: Response): Promise<void> => {
  const params = req.valid?.params as PromotionDecisionIdParams;
  const promotionDecision = await promotionService.getPromotionDecisionById(params.id);
  ApiResponse.ok(res, promotionDecision);
};

/**
 * Route-scoped list: batchId comes from req.params (validated by
 * promotionBatchDecisionsParamsSchema), merged with the paginated query
 * filters. Calls the paginated promotionService.listPromotionDecisions
 * — never the repository's findAllByBatchIdTx, which exists solely for
 * transactionally-consistent finalization (see promotion.repository.ts's
 * own doc comment) and is never reachable from the HTTP layer.
 */
export const listPromotionDecisionsForBatch = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const params = req.valid?.params as PromotionBatchDecisionsParams;
  const query = req.valid?.query as ListPromotionDecisionsQuery;

  const filters: ListPromotionDecisionsFilters = {
    promotionBatchId: params.batchId,
    ...(query.studentEnrollmentId !== undefined && {
      studentEnrollmentId: query.studentEnrollmentId,
    }),
    ...(query.outcome !== undefined && { outcome: query.outcome }),
  };

  const options: ListPromotionDecisionsOptions = {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  };

  const result = await promotionService.listPromotionDecisions(filters, options);

  ApiResponse.paginated(res, [...result.promotionDecisions], {
    page: query.page,
    limit: query.limit,
    total: result.total,
  });
};
