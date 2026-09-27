import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createPromotionBatch } from '../api/promotions';
import type { CreatePromotionBatchInput } from '../schemas/promotion.schema';

import { promotionKeys } from './promotion-keys';

export function useCreatePromotionBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePromotionBatchInput) => createPromotionBatch(payload),
    onSuccess: (created) => {
      queryClient.setQueryData(promotionKeys.batchDetail(created.id), created);
      void queryClient.invalidateQueries({
        queryKey: promotionKeys.all,
      });
    },
  });
}
