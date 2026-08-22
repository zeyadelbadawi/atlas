/**
 * useDeleteCourseSection hook.
 *
 * Mutation hook for deleting a course section and its lessons.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';

export function useDeleteCourseSection(academyId: string, courseId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<void, string, ApiError>({
    mutationFn: (sectionId) =>
      courseService.deleteCourseSection(academyId, courseId, sectionId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(courseKeys.sections(academyId, courseId));
      await invalidate(courseKeys.detail(academyId, courseId));
    },
  });
}
