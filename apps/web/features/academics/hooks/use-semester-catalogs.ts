'use client';

import { useQuery } from '@tanstack/react-query';

import { getSemesterCatalogs, type ListSemesterCatalogsParams } from '../api/semester-catalogs';

import { academicKeys } from './academic-keys';

export function useSemesterCatalogs(params: ListSemesterCatalogsParams = {}, enabled = true) {
  return useQuery({
    queryKey: academicKeys.semesterList(params as Record<string, unknown>),
    queryFn: ({ signal }) => getSemesterCatalogs(params, signal),
    enabled,
    staleTime: 60 * 1000,
  });
}
