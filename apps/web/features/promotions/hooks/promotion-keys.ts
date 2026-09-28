import type {
  ListPromotionBatchesParams,
  ListPromotionDecisionsParams,
} from '../schemas/promotion.schema';

export const promotionKeys = {
  all: ['promotions'] as const,
  batches: (params?: ListPromotionBatchesParams) =>
    [...promotionKeys.all, 'batches', params ?? {}] as const,
  batchDetail: (id: string) => [...promotionKeys.all, 'batches', 'detail', id] as const,
  decisions: (batchId: string, params?: ListPromotionDecisionsParams) =>
    [...promotionKeys.all, 'batches', batchId, 'decisions', params ?? {}] as const,
  decisionDetail: (id: string) => [...promotionKeys.all, 'decisions', 'detail', id] as const,
};
