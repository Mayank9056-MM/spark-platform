// apps/api/src/modules/promotion/promotion.routes.ts

import { Router } from 'express';

import { requireAuth } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { authorize } from '../rbac/authorization/authorization.middleware.js';

import * as promotionController from './promotion.controller.js';
import {
  createPromotionBatchBodySchema,
  createPromotionDecisionBodySchema,
  listPromotionBatchesQuerySchema,
  listPromotionDecisionsQuerySchema,
  promotionBatchDecisionsParamsSchema,
  promotionBatchIdParamsSchema,
  promotionDecisionIdParamsSchema,
} from './promotion.validation.js';

/**
 * HTTP route composition for the Promotion module (PromotionBatch +
 * PromotionDecision) — mirrors semesterEnrollment.routes.ts /
 * academic-year.routes.ts exactly. requireAuth is applied once via
 * `router.use(...)`, then every route is exactly
 * authorize(resource, action) -> validate(schema, source) -> the
 * corresponding promotionController handler. No business logic, no
 * Prisma, no service/repository calls, and no manual validation live
 * here.
 *
 * Intended mount point: `/api/v1/promotion` (see the "NOTE ON APP
 * MOUNTING" below). Every path declared in this file is relative to
 * that mount — this router never repeats its own prefix, matching
 * every sibling router in app.ts.
 *
 * No update/delete routes for either resource: PromotionService does
 * not expose updatePromotionBatch/deletePromotionBatch/
 * updatePromotionDecision/deletePromotionDecision, so no such route is
 * stubbed or guessed here.
 *
 * ── RBAC resource: 'student' (NOT a dedicated 'promotion' resource) ───
 * AuthorizationResource (authorization.types.ts) is a closed union with
 * no 'promotion' / 'promotionBatch' / 'promotionDecision' entry, and
 * inventing one is explicitly out of scope for this task. This reuses
 * the exact precedent already established by semesterEnrollment.routes.ts,
 * which documents reusing 'student' (the root record every
 * SemesterEnrollment — and, transitively, every PromotionBatch/
 * PromotionDecision — ultimately concerns) instead of a non-existent
 * dedicated resource. As with that file, this mapping is NOT a settled
 * design decision — see the accompanying report's Blockers section.
 *
 * ── finalize action: mapped to 'update' (NOT a dedicated 'finalize'
 *    action) ──────────────────────────────────────────────────────────
 * AuthorizationAction is also a closed union: 'create' | 'read' |
 * 'update' | 'delete' | 'archive' | 'restore' | 'activate' | 'cancel'.
 * None of these is literally "finalize". 'activate' is already given a
 * specific, different, reversible meaning elsewhere (academic-year.routes.ts:
 * "make this the college's one currently-active AcademicYear"), so
 * reusing it here for an irreversible DRAFT -> FINALIZED transition
 * would conflate two different kinds of domain command under one
 * permission. Finalizing a batch is a one-way status transition on an
 * already-existing resource, which is closer in kind to 'update' than
 * to any other existing action, so 'update' is used here. This is a
 * genuine RBAC-catalog gap, not a confident mapping — flagged in the
 * accompanying report rather than silently invented.
 *
 * ── NOTE ON APP MOUNTING ────────────────────────────────────────────
 * app.ts does not yet import or mount a promotionRouter. Wiring it in
 * (`app.use('/api/v1/promotion', promotionRouter);`) is a one-line
 * change to app.ts, which is outside this task's scope (only
 * promotion.controller.ts / promotion.routes.ts were requested) and is
 * therefore NOT made here — it is called out explicitly in the
 * accompanying report instead of being done silently.
 */
export const promotionRouter = Router();

promotionRouter.use(requireAuth);

// ── Promotion batches ────────────────────────────────────────────────

promotionRouter.post(
  '/batches',
  authorize('student', 'create'),
  validate(createPromotionBatchBodySchema),
  promotionController.createPromotionBatch,
);

promotionRouter.get(
  '/batches',
  authorize('student', 'read'),
  validate(listPromotionBatchesQuerySchema, 'query'),
  promotionController.listPromotionBatches,
);

promotionRouter.get(
  '/batches/:id',
  authorize('student', 'read'),
  validate(promotionBatchIdParamsSchema, 'params'),
  promotionController.getPromotionBatchById,
);

promotionRouter.post(
  '/batches/:id/finalize',
  authorize('student', 'update'),
  validate(promotionBatchIdParamsSchema, 'params'),
  promotionController.finalizePromotionBatch,
);

// ── Promotion decisions (nested under a batch) ─────────────────────────

promotionRouter.post(
  '/batches/:batchId/decisions',
  authorize('student', 'create'),
  validate(promotionBatchDecisionsParamsSchema, 'params'),
  validate(createPromotionDecisionBodySchema),
  promotionController.createPromotionDecision,
);

promotionRouter.get(
  '/batches/:batchId/decisions',
  authorize('student', 'read'),
  validate(promotionBatchDecisionsParamsSchema, 'params'),
  validate(listPromotionDecisionsQuerySchema, 'query'),
  promotionController.listPromotionDecisionsForBatch,
);

promotionRouter.get(
  '/decisions/:id',
  authorize('student', 'read'),
  validate(promotionDecisionIdParamsSchema, 'params'),
  promotionController.getPromotionDecisionById,
);
