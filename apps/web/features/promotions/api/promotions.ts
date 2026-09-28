import {
  type CreatePromotionBatchInput,
  type CreatePromotionDecisionInput,
  type ListPromotionBatchesParams,
  type ListPromotionDecisionsParams,
  type PromotionBatch,
  promotionBatchSchema,
  type PromotionDecision,
  promotionDecisionSchema,
} from '../schemas/promotion.schema';

import type { PaginatedResult } from '@/lib/api/envelope';
import { apiPaginatedRequest, apiRequest } from '@/lib/api/http-client';

export function listPromotionBatches(
  params?: ListPromotionBatchesParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<PromotionBatch>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.semesterCatalogId) query.set('semesterCatalogId', params.semesterCatalogId);
  if (params?.academicYearId) query.set('academicYearId', params.academicYearId);
  if (params?.status) query.set('status', params.status);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const endpoint = `/promotions/batches${query.toString() ? `?${query.toString()}` : ''}`;
  return apiPaginatedRequest(endpoint, promotionBatchSchema, { method: 'GET', signal });
}

export function getPromotionBatch(id: string, signal?: AbortSignal): Promise<PromotionBatch> {
  return apiRequest(`/promotions/batches/${id}`, promotionBatchSchema, {
    method: 'GET',
    signal,
  });
}

export function createPromotionBatch(
  payload: CreatePromotionBatchInput,
  signal?: AbortSignal,
): Promise<PromotionBatch> {
  return apiRequest('/promotions/batches', promotionBatchSchema, {
    method: 'POST',
    body: payload,
    signal,
  });
}

export function finalizePromotionBatch(id: string, signal?: AbortSignal): Promise<PromotionBatch> {
  return apiRequest(`/promotions/batches/${id}/finalize`, promotionBatchSchema, {
    method: 'POST',
    signal,
  });
}

export function listPromotionDecisions(
  batchId: string,
  params?: ListPromotionDecisionsParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<PromotionDecision>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.studentEnrollmentId) query.set('studentEnrollmentId', params.studentEnrollmentId);
  if (params?.outcome) query.set('outcome', params.outcome);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const endpoint = `/promotions/batches/${batchId}/decisions${query.toString() ? `?${query.toString()}` : ''}`;
  return apiPaginatedRequest(endpoint, promotionDecisionSchema, { method: 'GET', signal });
}

export function createPromotionDecision(
  batchId: string,
  payload: CreatePromotionDecisionInput,
  signal?: AbortSignal,
): Promise<PromotionDecision> {
  return apiRequest(`/promotions/batches/${batchId}/decisions`, promotionDecisionSchema, {
    method: 'POST',
    body: payload,
    signal,
  });
}

export function getPromotionDecision(id: string, signal?: AbortSignal): Promise<PromotionDecision> {
  return apiRequest(`/promotions/decisions/${id}`, promotionDecisionSchema, {
    method: 'GET',
    signal,
  });
}
