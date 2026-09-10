// apps/api/src/modules/promotion/promotion.mapper.ts

import type { PromotionBatch, PromotionDecision } from '@spark/database/client';

import type { PromotionBatchDTO, PromotionDecisionDTO } from './promotion.types.js';

/**
 * Maps Prisma PromotionBatch/PromotionDecision entities to their
 * API-safe DTOs. Exposes only the scalar fields defined by
 * PromotionBatchDTO/PromotionDecisionDTO and does not depend on any
 * loaded relations — both work correctly against a plain
 * `findUnique({ where: { id } })` row with no `include`.
 */
export function toPromotionBatchDTO(batch: PromotionBatch): PromotionBatchDTO {
  return {
    id: batch.id,
    semesterCatalogId: batch.semesterCatalogId,
    academicYearId: batch.academicYearId,
    initiatedByUserId: batch.initiatedByUserId,
    status: batch.status,
    finalizedAt: batch.finalizedAt ? batch.finalizedAt.toISOString() : null,
    createdAt: batch.createdAt.toISOString(),
    updatedAt: batch.updatedAt.toISOString(),
  };
}

/** Maps promotion batches to their API-safe DTO representation. */
export function toPromotionBatchDTOList(batches: readonly PromotionBatch[]): PromotionBatchDTO[] {
  return batches.map(toPromotionBatchDTO);
}

/** Maps a promotion decision to its API-safe DTO representation. */
export function toPromotionDecisionDTO(decision: PromotionDecision): PromotionDecisionDTO {
  return {
    id: decision.id,
    promotionBatchId: decision.promotionBatchId,
    studentEnrollmentId: decision.studentEnrollmentId,
    fromSemesterEnrollmentId: decision.fromSemesterEnrollmentId,
    toSemesterEnrollmentId: decision.toSemesterEnrollmentId,
    outcome: decision.outcome,
    remarks: decision.remarks,
    decidedByUserId: decision.decidedByUserId,
    decidedAt: decision.decidedAt.toISOString(),
    createdAt: decision.createdAt.toISOString(),
  };
}

/** Maps promotion decisions to their API-safe DTO representation. */
export function toPromotionDecisionDTOList(
  decisions: readonly PromotionDecision[],
): PromotionDecisionDTO[] {
  return decisions.map(toPromotionDecisionDTO);
}
