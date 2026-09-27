import { z } from 'zod';

export const promotionBatchStatusSchema = z.enum(['DRAFT', 'FINALIZED']);
export type PromotionBatchStatus = z.infer<typeof promotionBatchStatusSchema>;

export const promotionOutcomeSchema = z.enum([
  'PROMOTE',
  'REPEAT',
  'WITHDRAW',
  'DISCONTINUE',
  'GRADUATE',
]);
export type PromotionOutcome = z.infer<typeof promotionOutcomeSchema>;

export const promotionBatchSchema = z.object({
  id: z.string().uuid(),
  semesterCatalogId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  initiatedByUserId: z.string(),
  status: promotionBatchStatusSchema,
  finalizedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PromotionBatch = z.infer<typeof promotionBatchSchema>;

export const createPromotionBatchSchema = z.object({
  semesterCatalogId: z.string().uuid('Semester catalog ID must be a valid UUID'),
  academicYearId: z.string().uuid('Academic year ID must be a valid UUID'),
});
export type CreatePromotionBatchInput = z.infer<typeof createPromotionBatchSchema>;

export const listPromotionBatchesQuerySchema = z.object({
  semesterCatalogId: z.string().uuid().optional(),
  academicYearId: z.string().uuid().optional(),
  status: promotionBatchStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  sortBy: z.enum(['createdAt', 'finalizedAt']).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});
export type ListPromotionBatchesParams = z.infer<typeof listPromotionBatchesQuerySchema>;

export const promotionDecisionSchema = z.object({
  id: z.string().uuid(),
  promotionBatchId: z.string().uuid(),
  studentEnrollmentId: z.string().uuid(),
  fromSemesterEnrollmentId: z.string().uuid(),
  toSemesterEnrollmentId: z.string().uuid().nullable(),
  outcome: promotionOutcomeSchema,
  remarks: z.string().nullable(),
  decidedByUserId: z.string(),
  decidedAt: z.string(),
  createdAt: z.string(),
});
export type PromotionDecision = z.infer<typeof promotionDecisionSchema>;

export const createPromotionDecisionSchema = z.object({
  studentEnrollmentId: z.string().uuid('Student enrollment ID must be a valid UUID'),
  fromSemesterEnrollmentId: z.string().uuid('From semester enrollment ID must be a valid UUID'),
  outcome: promotionOutcomeSchema,
  remarks: z.string().trim().max(500, 'Remarks cannot exceed 500 characters').optional(),
});
export type CreatePromotionDecisionInput = z.infer<typeof createPromotionDecisionSchema>;

export const listPromotionDecisionsQuerySchema = z.object({
  studentEnrollmentId: z.string().uuid().optional(),
  outcome: promotionOutcomeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  sortBy: z.enum(['decidedAt', 'createdAt']).default('createdAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
});
export type ListPromotionDecisionsParams = z.infer<typeof listPromotionDecisionsQuerySchema>;
