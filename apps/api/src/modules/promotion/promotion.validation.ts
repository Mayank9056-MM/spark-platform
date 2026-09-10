// apps/api/src/modules/promotion/promotion.validation.ts

import { z } from 'zod';

/**
 * HTTP-boundary validation for the Promotion module (PromotionBatch +
 * PromotionDecision). Answers only "is this HTTP input structurally
 * valid?" — never whether a semesterCatalogId/academicYearId/
 * studentEnrollmentId/fromSemesterEnrollmentId actually exists, whether
 * a batch is still DRAFT, whether a student is eligible for a given
 * outcome, or whether the caller is authorized. Those belong to
 * promotion.service.ts / the authorization layer, not this file.
 *
 * promotion.types.ts remains the domain contract. This file defines the
 * narrower HTTP input shapes and exports its own inferred types,
 * matching every sibling validation module's convention exactly
 * (`export const xBodySchema = ...; export type XBody = z.infer<...>`) —
 * it does not attempt to make those inferred types structurally
 * identical to CreatePromotionBatchInput / CreatePromotionDecisionInput.
 *
 * ── actor identity is never validated here ──────────────────────────
 * initiatedByUserId and decidedByUserId are never part of any schema
 * below. The actor comes from req.user via authentication middleware,
 * exactly as promotion.types.ts's module header documents — the same
 * pattern every sibling module follows (no create/update schema in this
 * codebase accepts an actor id from the request body).
 *
 * ── server-owned fields are absent, not merely optional ─────────────
 * status, finalizedAt, decidedAt, toSemesterEnrollmentId, id,
 * createdAt, updatedAt appear in no schema below. No `.strict()` is
 * used anywhere in this codebase, so if a client sends one of these
 * anyway, Zod's default object behavior silently strips it before the
 * data ever reaches the controller/service — matching every sibling
 * create schema's identical treatment of database-generated columns.
 *
 * ── promotionBatchId is route context, not body ─────────────────────
 * The intended route is nested: POST /promotions/batches/:batchId/decisions.
 * createPromotionDecisionBodySchema has no promotionBatchId key; the
 * batch identity is validated separately by
 * promotionBatchDecisionsParamsSchema against the route's :batchId
 * segment.
 *
 * ── finalization has no body schema ──────────────────────────────────
 * POST /promotions/batches/:id/finalize carries no client-supplied
 * data — only promotionBatchIdParamsSchema (id) is needed, per the
 * task's explicit instruction not to invent an empty-object schema.
 *
 * ── sortBy is an explicit whitelist ──────────────────────────────────
 * Both list query schemas restrict sortBy to exactly the keys
 * ListPromotionBatchesOptions/ListPromotionDecisionsOptions declare, so
 * an arbitrary client string can never reach a Prisma `orderBy` —
 * identical reasoning to every sibling list-query schema.
 *
 * ── no cross-field / database-dependent refinements ──────────────────
 * Nothing here validates that semesterCatalogId belongs to
 * academicYearId, that studentEnrollmentId owns
 * fromSemesterEnrollmentId, that a batch is DRAFT, or that an outcome
 * is eligible. All of that requires database state and belongs to
 * promotion.service.ts, per the task's explicit boundary.
 */

// ─────────────────────────────────────────────────────────────────────────
// Promotion batch status / outcome enums
// ─────────────────────────────────────────────────────────────────────────

/** Mirrors schema.prisma's PromotionBatchStatus enum exactly (2 values). */
const promotionBatchStatusSchema = z.enum(['DRAFT', 'FINALIZED']);

/** Mirrors schema.prisma's PromotionOutcome enum exactly (5 values). */
const promotionOutcomeSchema = z.enum(['PROMOTE', 'REPEAT', 'WITHDRAW', 'DISCONTINUE', 'GRADUATE']);

// ─────────────────────────────────────────────────────────────────────────
// Remarks
// ─────────────────────────────────────────────────────────────────────────

/**
 * PROMOTION_DECISION_REMARKS_MAX_LENGTH reuses
 * studentEnrollment.validation.ts's REASON_MAX_LENGTH (500) — no
 * sibling module has an optional free-text field to mirror directly
 * (schema.prisma's PromotionDecision.remarks is an unbounded nullable
 * String), but remarks is the same class of administrative free-text
 * justification as a cancel/withdraw `reason`, so the same
 * already-flagged bound is reused rather than inventing a new number
 * (matching program.validation.ts reusing
 * DEPARTMENT_CODE_MAX_LENGTH for PROGRAM_CODE_MAX_LENGTH).
 *
 * The shape — `.trim().min(1).max(N).optional()` — matches every
 * sibling list-query `search` field: optional, but non-empty and
 * bounded when present. This is the closest existing precedent for an
 * "optional but not blank-if-given" string, and it matches
 * CreatePromotionDecisionInput's `remarks?: string` exactly (present-
 * and-non-empty, or omitted — never present-and-empty).
 */
const PROMOTION_DECISION_REMARKS_MAX_LENGTH = 500;

const promotionDecisionRemarksSchema = z
  .string()
  .trim()
  .min(1, 'Remarks must not be empty')
  .max(
    PROMOTION_DECISION_REMARKS_MAX_LENGTH,
    `Remarks must be at most ${PROMOTION_DECISION_REMARKS_MAX_LENGTH} characters`,
  )
  .optional();

// ─────────────────────────────────────────────────────────────────────────
// Create promotion batch
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors CreatePromotionBatchInput exactly: semesterCatalogId and
 * academicYearId only. status/finalizedAt/initiatedByUserId/id/
 * createdAt/updatedAt are all absent — see file-level note above.
 * Whether these two ids reference existing rows, and whether a batch
 * already exists for this (semesterCatalogId, academicYearId) pair, are
 * database questions for PromotionService, not this boundary.
 */
export const createPromotionBatchBodySchema = z.object({
  semesterCatalogId: z.uuid(),
  academicYearId: z.uuid(),
});
export type CreatePromotionBatchBody = z.infer<typeof createPromotionBatchBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Create promotion decision
// ─────────────────────────────────────────────────────────────────────────

/**
 * Mirrors CreatePromotionDecisionInput exactly: studentEnrollmentId,
 * fromSemesterEnrollmentId, outcome are required; remarks is optional.
 * promotionBatchId (route context), decidedByUserId (actor context),
 * decidedAt (server default), toSemesterEnrollmentId (business-derived),
 * id, and createdAt are all absent — see file-level note above.
 */
export const createPromotionDecisionBodySchema = z.object({
  studentEnrollmentId: z.uuid(),
  fromSemesterEnrollmentId: z.uuid(),
  outcome: promotionOutcomeSchema,
  remarks: promotionDecisionRemarksSchema,
});
export type CreatePromotionDecisionBody = z.infer<typeof createPromotionDecisionBodySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Promotion batch ID params
// ─────────────────────────────────────────────────────────────────────────

/**
 * `id` — matches departmentIdParamsSchema / programIdParamsSchema /
 * academicYearIdParamsSchema's convention for generic single-resource
 * routes. Covers both GET /promotions/batches/:id and
 * POST /promotions/batches/:id/finalize — finalization carries no body,
 * so this params schema is the only validation that route needs.
 */
export const promotionBatchIdParamsSchema = z.object({
  id: z.uuid(),
});
export type PromotionBatchIdParams = z.infer<typeof promotionBatchIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// Promotion decision ID params
// ─────────────────────────────────────────────────────────────────────────

/** `id` — for GET /promotions/decisions/:id. */
export const promotionDecisionIdParamsSchema = z.object({
  id: z.uuid(),
});
export type PromotionDecisionIdParams = z.infer<typeof promotionDecisionIdParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// Promotion batch decisions route params (nested)
// ─────────────────────────────────────────────────────────────────────────

/**
 * `batchId` — deliberately distinct from `promotionBatchIdParamsSchema`
 * above, which validates a route's `:id` segment. This schema validates
 * the parent-batch segment of the nested decisions routes:
 * POST /promotions/batches/:batchId/decisions and
 * GET /promotions/batches/:batchId/decisions. No sibling module has a
 * nested-resource route to copy a naming convention from; the key is
 * named to match the literal route param it binds to, following the
 * same `id: z.uuid()` shape every other params schema in this codebase
 * uses.
 */
export const promotionBatchDecisionsParamsSchema = z.object({
  batchId: z.uuid(),
});
export type PromotionBatchDecisionsParams = z.infer<typeof promotionBatchDecisionsParamsSchema>;

// ─────────────────────────────────────────────────────────────────────────
// List promotion batches query
// ─────────────────────────────────────────────────────────────────────────

/**
 * PROMOTION_LIST_DEFAULT_PAGE_SIZE / PROMOTION_LIST_MAX_PAGE_SIZE (20 /
 * 100) match every sibling module's identical page-size convention
 * exactly. Declared once and reused by both list schemas below, since
 * this file has two list endpoints sharing the same bound rather than
 * one — duplicating the same two numbers twice in one file would be an
 * unjustified departure from how every sibling constant is declared
 * once per meaning.
 */
const PROMOTION_LIST_DEFAULT_PAGE_SIZE = 20;
const PROMOTION_LIST_MAX_PAGE_SIZE = 100;

/**
 * Combines ListPromotionBatchesFilters (semesterCatalogId,
 * academicYearId, status) and ListPromotionBatchesOptions (page, limit,
 * sortBy, sortOrder) into one query schema, matching every sibling
 * module's identical Filters+Options merge. No `search` — PromotionBatch
 * has no own string field to match against, matching
 * ListSemesterEnrollmentsFilters's identical reasoning.
 *
 * `sortBy` is whitelisted to exactly ListPromotionBatchesOptions's two
 * keys ('createdAt' | 'finalizedAt') so an arbitrary client string can
 * never reach a Prisma `orderBy`.
 */
export const listPromotionBatchesQuerySchema = z.object({
  semesterCatalogId: z.uuid().optional(),
  academicYearId: z.uuid().optional(),
  status: promotionBatchStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PROMOTION_LIST_MAX_PAGE_SIZE)
    .default(PROMOTION_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['createdAt', 'finalizedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListPromotionBatchesQuery = z.infer<typeof listPromotionBatchesQuerySchema>;

// ─────────────────────────────────────────────────────────────────────────
// List promotion decisions query
// ─────────────────────────────────────────────────────────────────────────

/**
 * Combines ListPromotionDecisionsFilters (promotionBatchId,
 * studentEnrollmentId, outcome) and ListPromotionDecisionsOptions
 * (page, limit, sortBy, sortOrder). `promotionBatchId` remains a query
 * filter here for the global GET /promotions/decisions endpoint
 * (distinct from the route-scoped GET /promotions/batches/:batchId/decisions,
 * which uses promotionBatchDecisionsParamsSchema instead). No `search`
 * — PromotionDecision has no own string field to match against.
 *
 * `sortBy` is whitelisted to exactly ListPromotionDecisionsOptions's
 * two keys ('decidedAt' | 'createdAt').
 */
export const listPromotionDecisionsQuerySchema = z.object({
  promotionBatchId: z.uuid().optional(),
  studentEnrollmentId: z.uuid().optional(),
  outcome: promotionOutcomeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(PROMOTION_LIST_MAX_PAGE_SIZE)
    .default(PROMOTION_LIST_DEFAULT_PAGE_SIZE),
  sortBy: z.enum(['decidedAt', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListPromotionDecisionsQuery = z.infer<typeof listPromotionDecisionsQuerySchema>;
