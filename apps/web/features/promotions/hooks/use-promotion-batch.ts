import { useQuery } from '@tanstack/react-query';

import { getPromotionBatch } from '../api/promotions';

import { promotionKeys } from './promotion-keys';

export function usePromotionBatch(id: string) {
  return useQuery({
    queryKey: promotionKeys.batchDetail(id),
    queryFn: ({ signal }) => getPromotionBatch(id, signal),
    enabled: Boolean(id),
  });
}
