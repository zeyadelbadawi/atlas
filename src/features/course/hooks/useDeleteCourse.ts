/**
 * useDeleteCourse hook.
 *
 * Mutation hook for deleting a course.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';

export function useDeleteCourse(academyId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<void, string, ApiError>({
    mutationFn: (courseId) => courseService.deleteCourse(academyId, courseId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(courseKeys.all);
    },
  });
}
