'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createElectiveGroup, deleteElectiveGroup, updateElectiveGroup } from '../api/electives';
import { createSemesterCatalog, deleteSemesterCatalog } from '../api/semester-catalogs';
import { createSubject, deleteSubject, updateSubject } from '../api/subjects';
import type {
  CreateElectiveGroupFormValues,
  CreateSemesterCatalogFormValues,
  CreateSubjectFormValues,
  UpdateElectiveGroupFormValues,
  UpdateSubjectFormValues,
} from '../schemas/academic.schema';

import { academicKeys } from './academic-keys';

export function useCreateSemesterCatalog(curriculumVersionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateSemesterCatalogFormValues) => createSemesterCatalog(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: academicKeys.curriculumStructure(curriculumVersionId),
      });
      void queryClient.invalidateQueries({
        queryKey: academicKeys.semesters(),
      });
    },
  });
}

export function useDeleteSemesterCatalog(curriculumVersionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSemesterCatalog(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: academicKeys.curriculumStructure(curriculumVersionId),
      });
      void queryClient.invalidateQueries({
        queryKey: academicKeys.semesters(),
      });
    },
  });
}

export function useCreateSubject(curriculumVersionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateSubjectFormValues) => createSubject(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: academicKeys.curriculumStructure(curriculumVersionId),
      });
      void queryClient.invalidateQueries({
        queryKey: academicKeys.subjects(),
      });
    },
  });
}

export function useUpdateSubject(curriculumVersionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: UpdateSubjectFormValues }) =>
      updateSubject(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: academicKeys.curriculumStructure(curriculumVersionId),
      });
      void queryClient.invalidateQueries({
        queryKey: academicKeys.subjects(),
      });
    },
  });
}

export function useDeleteSubject(curriculumVersionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSubject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: academicKeys.curriculumStructure(curriculumVersionId),
      });
      void queryClient.invalidateQueries({
        queryKey: academicKeys.subjects(),
      });
    },
  });
}

export function useCreateElectiveGroup(curriculumVersionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateElectiveGroupFormValues) => createElectiveGroup(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: academicKeys.curriculumStructure(curriculumVersionId),
      });
      void queryClient.invalidateQueries({
        queryKey: academicKeys.electives(),
      });
    },
  });
}

export function useUpdateElectiveGroup(curriculumVersionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: UpdateElectiveGroupFormValues }) =>
      updateElectiveGroup(id, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: academicKeys.curriculumStructure(curriculumVersionId),
      });
      void queryClient.invalidateQueries({
        queryKey: academicKeys.electives(),
      });
    },
  });
}

export function useDeleteElectiveGroup(curriculumVersionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteElectiveGroup(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: academicKeys.curriculumStructure(curriculumVersionId),
      });
      void queryClient.invalidateQueries({
        queryKey: academicKeys.electives(),
      });
    },
  });
}
