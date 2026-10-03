/**
 * useDeleteCourseSection hook.
 *
 * Mutation hook for deleting a course section and its lessons. Quizzes and
 * assignments it held fall back to course level, so the attach picker and
 * authoring lists are invalidated along with the sections.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useAcademyBoundMutation } from '@/shared/hooks';
import type { AcademyScopedVariables } from '@/shared/hooks';
import { invalidateCourseCurriculum } from '@services/query/curriculum-invalidation';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';

export function useDeleteCourseSection(academyId: string, courseId: string) {
  const queryClient = useQueryClient();

  const mutation = useApiMutation<
    void,
    AcademyScopedVariables<string>,
    ApiError
  >({
    mutationFn: ({ academyId, payload: sectionId }) =>
      courseService.deleteCourseSection(academyId, courseId, sectionId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, { academyId }) => {
      await invalidateCourseCurriculum(queryClient, { academyId, courseId });
    },
  });

  return useAcademyBoundMutation(mutation, academyId);
}
