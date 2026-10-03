/**
 * useDeleteCourseLesson hook.
 *
 * Mutation hook for deleting a lesson. Invalidates the whole builder
 * curriculum so the row disappears from its unit without a refresh.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useAcademyBoundMutation } from '@/shared/hooks';
import type { AcademyScopedVariables } from '@/shared/hooks';
import { invalidateCourseCurriculum } from '@services/query/curriculum-invalidation';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';

export interface DeleteCourseLessonVariables {
  readonly sectionId: string;
  readonly lessonId: string;
}

export function useDeleteCourseLesson(academyId: string, courseId: string) {
  const queryClient = useQueryClient();

  const mutation = useApiMutation<
    void,
    AcademyScopedVariables<DeleteCourseLessonVariables>,
    ApiError
  >({
    mutationFn: ({ academyId, payload: { sectionId, lessonId } }) =>
      courseService.deleteCourseLesson(
        academyId,
        courseId,
        sectionId,
        lessonId
      ),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, { academyId }) => {
      await invalidateCourseCurriculum(queryClient, { academyId, courseId });
    },
  });

  return useAcademyBoundMutation(mutation, academyId);
}
