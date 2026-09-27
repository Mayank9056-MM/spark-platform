import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createPromotionDecision } from '../api/promotions';
import type { CreatePromotionDecisionInput } from '../schemas/promotion.schema';

import { promotionKeys } from './promotion-keys';

export function useCreatePromotionDecision(batchId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePromotionDecisionInput) =>
      createPromotionDecision(batchId, payload),
    onSuccess: (created) => {
      queryClient.setQueryData(promotionKeys.decisionDetail(created.id), created);
      void queryClient.invalidateQueries({
        queryKey: promotionKeys.decisions(batchId),
      });
    },
  });
}
