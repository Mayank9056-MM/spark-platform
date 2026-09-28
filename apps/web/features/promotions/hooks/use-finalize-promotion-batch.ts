import { useMutation, useQueryClient } from '@tanstack/react-query';

import { finalizePromotionBatch } from '../api/promotions';

import { promotionKeys } from './promotion-keys';

export function useFinalizePromotionBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => finalizePromotionBatch(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(promotionKeys.batchDetail(updated.id), updated);
      void queryClient.invalidateQueries({
        queryKey: promotionKeys.all,
      });
      // Invalidate student & semester enrollment queries as finalization creates next semester enrollments
      void queryClient.invalidateQueries({
        queryKey: ['semester-enrollments'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['students'],
      });
    },
  });
}
