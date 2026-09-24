'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  activateCurriculum,
  createCurriculum,
  deleteCurriculum,
  retireCurriculum,
  updateCurriculum,
} from '../api/curricula';
import type {
  CreateCurriculumVersionFormValues,
  UpdateCurriculumVersionFormValues,
} from '../schemas/academic.schema';

import { academicKeys } from './academic-keys';

export function useCreateCurriculum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateCurriculumVersionFormValues) => createCurriculum(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: academicKeys.curricula(),
      });
    },
  });
}

export function useUpdateCurriculum(id?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id: mutationId,
      values,
    }: {
      id?: string;
      values: UpdateCurriculumVersionFormValues;
    }) => {
      const targetId = mutationId ?? id;
      if (!targetId) throw new Error('Curriculum version ID is required');
      return updateCurriculum(targetId, values);
    },
    onSuccess: (data, variables) => {
      const targetId = variables.id ?? id;
      if (targetId) {
        void queryClient.invalidateQueries({ queryKey: academicKeys.curriculumDetail(targetId) });
        void queryClient.invalidateQueries({
          queryKey: academicKeys.curriculumStructure(targetId),
        });
      }
      void queryClient.invalidateQueries({ queryKey: academicKeys.curricula() });
    },
  });
}

export function useActivateCurriculum(id?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mutationId?: string) => {
      const targetId = mutationId ?? id;
      if (!targetId) throw new Error('Curriculum version ID is required');
      return activateCurriculum(targetId);
    },
    onSuccess: (data, variables) => {
      const targetId = variables ?? id;
      if (targetId) {
        void queryClient.invalidateQueries({ queryKey: academicKeys.curriculumDetail(targetId) });
        void queryClient.invalidateQueries({
          queryKey: academicKeys.curriculumStructure(targetId),
        });
      }
      void queryClient.invalidateQueries({ queryKey: academicKeys.curricula() });
      void queryClient.invalidateQueries({ queryKey: academicKeys.all });
    },
  });
}

export function useRetireCurriculum(id?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mutationId?: string) => {
      const targetId = mutationId ?? id;
      if (!targetId) throw new Error('Curriculum version ID is required');
      return retireCurriculum(targetId);
    },
    onSuccess: (data, variables) => {
      const targetId = variables ?? id;
      if (targetId) {
        void queryClient.invalidateQueries({ queryKey: academicKeys.curriculumDetail(targetId) });
        void queryClient.invalidateQueries({
          queryKey: academicKeys.curriculumStructure(targetId),
        });
      }
      void queryClient.invalidateQueries({ queryKey: academicKeys.curricula() });
      void queryClient.invalidateQueries({ queryKey: academicKeys.all });
    },
  });
}

export function useDeleteCurriculum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCurriculum(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: academicKeys.curricula(),
      });
    },
  });
}
