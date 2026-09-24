'use client';

import { useQuery } from '@tanstack/react-query';

import { getCurricula, type ListCurriculaParams } from '../api/curricula';

import { academicKeys } from './academic-keys';

export function useCurricula(params: ListCurriculaParams = {}, enabled = true) {
  return useQuery({
    queryKey: academicKeys.curriculumList(params as Record<string, unknown>),
    queryFn: ({ signal }) => getCurricula(params, signal),
    enabled,
    staleTime: 60 * 1000,
  });
}
