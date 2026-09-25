import { z } from 'zod';

import {
  type CreateCurriculumVersionFormValues,
  type CurriculumStatus,
  type CurriculumStructure,
  curriculumStructureSchema,
  type CurriculumVersion,
  curriculumVersionSchema,
  type UpdateCurriculumVersionFormValues,
} from '../schemas/academic.schema';

import type { PaginatedResult } from '@/lib/api/envelope';
import { apiPaginatedRequest, apiRequest } from '@/lib/api/http-client';

const deleteResponseSchema = z
  .null()
  .optional()
  .or(
    z.object({
      success: z.boolean().optional(),
    }),
  );

export interface ListCurriculaParams {
  page?: number;
  limit?: number;
  search?: string;
  programId?: string;
  status?: CurriculumStatus;
  sortBy?: 'label' | 'status' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export function getCurricula(
  params?: ListCurriculaParams,
  signal?: AbortSignal,
): Promise<PaginatedResult<CurriculumVersion>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.programId) query.set('programId', params.programId);
  if (params?.status) query.set('status', params.status);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);

  const endpoint = `/academic/curricula${query.toString() ? `?${query.toString()}` : ''}`;
  return apiPaginatedRequest(endpoint, curriculumVersionSchema, { method: 'GET', signal });
}

export function getCurriculum(id: string, signal?: AbortSignal): Promise<CurriculumVersion> {
  return apiRequest(`/academic/curricula/${id}`, curriculumVersionSchema, {
    method: 'GET',
    signal,
  });
}

export function getCurriculumStructure(
  id: string,
  signal?: AbortSignal,
): Promise<CurriculumStructure> {
  return apiRequest(`/academic/curricula/${id}/structure`, curriculumStructureSchema, {
    method: 'GET',
    signal,
  });
}

export function createCurriculum(
  payload: CreateCurriculumVersionFormValues,
  signal?: AbortSignal,
): Promise<CurriculumVersion> {
  return apiRequest('/academic/curricula', curriculumVersionSchema, {
    method: 'POST',
    body: payload,
    signal,
  });
}

export function updateCurriculum(
  id: string,
  payload: UpdateCurriculumVersionFormValues,
  signal?: AbortSignal,
): Promise<CurriculumVersion> {
  return apiRequest(`/academic/curricula/${id}`, curriculumVersionSchema, {
    method: 'PATCH',
    body: payload,
    signal,
  });
}

export function activateCurriculum(id: string, signal?: AbortSignal): Promise<CurriculumVersion> {
  return apiRequest(`/academic/curricula/${id}/activate`, curriculumVersionSchema, {
    method: 'POST',
    signal,
  });
}

export function retireCurriculum(id: string, signal?: AbortSignal): Promise<CurriculumVersion> {
  return apiRequest(`/academic/curricula/${id}/retire`, curriculumVersionSchema, {
    method: 'POST',
    signal,
  });
}

export function deleteCurriculum(
  id: string,
  signal?: AbortSignal,
): Promise<{ success?: boolean } | null | undefined> {
  return apiRequest(`/academic/curricula/${id}`, deleteResponseSchema, {
    method: 'DELETE',
    signal,
  });
}
