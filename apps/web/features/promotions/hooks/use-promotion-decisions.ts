import { useQuery } from '@tanstack/react-query';

import { listPromotionDecisions } from '../api/promotions';
import type { ListPromotionDecisionsParams } from '../schemas/promotion.schema';

import { promotionKeys } from './promotion-keys';

export function usePromotionDecisions(batchId: string, params?: ListPromotionDecisionsParams) {
  return useQuery({
    queryKey: promotionKeys.decisions(batchId, params),
    queryFn: ({ signal }) => listPromotionDecisions(batchId, params, signal),
    enabled: Boolean(batchId),
  });
}
