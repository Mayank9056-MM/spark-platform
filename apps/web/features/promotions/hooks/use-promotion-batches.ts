import { useQuery } from '@tanstack/react-query';

import { listPromotionBatches } from '../api/promotions';
import type { ListPromotionBatchesParams } from '../schemas/promotion.schema';

import { promotionKeys } from './promotion-keys';

export function usePromotionBatches(params?: ListPromotionBatchesParams) {
  return useQuery({
    queryKey: promotionKeys.batches(params),
    queryFn: ({ signal }) => listPromotionBatches(params, signal),
  });
}
