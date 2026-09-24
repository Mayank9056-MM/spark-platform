'use client';

import { useQuery } from '@tanstack/react-query';

import { getCurriculum, getCurriculumStructure } from '../api/curricula';

import { academicKeys } from './academic-keys';

export function useCurriculum(id: string, enabled = true) {
  return useQuery({
    queryKey: academicKeys.curriculumDetail(id),
    queryFn: ({ signal }) => getCurriculum(id, signal),
    enabled: Boolean(id) && enabled,
    staleTime: 60 * 1000,
  });
}

export function useCurriculumStructure(id: string, enabled = true) {
  return useQuery({
    queryKey: academicKeys.curriculumStructure(id),
    queryFn: ({ signal }) => getCurriculumStructure(id, signal),
    enabled: Boolean(id) && enabled,
    staleTime: 30 * 1000,
  });
}
