/**
 * useDeleteCourseSection hook.
 *
 * Mutation hook for deleting a course section and its lessons. Quizzes and
 * assignments it held fall back to course level, so the attach picker and
 * authoring lists are invalidated along with the sections.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { invalidateCourseCurriculum } from '@services/query/curriculum-invalidation';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';

export function useDeleteCourseSection(academyId: string, courseId: string) {
  const queryClient = useQueryClient();

  return useApiMutation<void, string, ApiError>({
    mutationFn: (sectionId) =>
      courseService.deleteCourseSection(academyId, courseId, sectionId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidateCourseCurriculum(queryClient, { academyId, courseId });
    },
  });
}
