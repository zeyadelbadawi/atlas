/**
 * useReorderCourseLessons hook.
 *
 * Mutation hook for persisting a new lesson order within a section (legacy
 * lessons-only endpoint; the builder reorders through `useReorderUnitItems`).
 * The server lays lessons into the unit's unified sequence, so the unit item
 * lists are invalidated too.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useAcademyBoundMutation } from '@/shared/hooks';
import type { AcademyScopedVariables } from '@/shared/hooks';
import { invalidateCourseCurriculum } from '@services/query/curriculum-invalidation';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';
import type { ReorderItemsPayload } from '@types';

export interface ReorderCourseLessonsVariables {
  readonly sectionId: string;
  readonly payload: ReorderItemsPayload;
}

export function useReorderCourseLessons(academyId: string, courseId: string) {
  const queryClient = useQueryClient();

  const mutation = useApiMutation<
    void,
    AcademyScopedVariables<ReorderCourseLessonsVariables>,
    ApiError
  >({
    mutationFn: ({ academyId, payload: { sectionId, payload } }) =>
      courseService.reorderCourseLessons(
        academyId,
        courseId,
        sectionId,
        payload
      ),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, { academyId }) => {
      await invalidateCourseCurriculum(queryClient, { academyId, courseId });
    },
  });

  return useAcademyBoundMutation(mutation, academyId);
}
