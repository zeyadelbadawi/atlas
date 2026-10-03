/**
 * useDeleteCourse hook.
 *
 * Mutation hook for deleting a course.
 */
import { useApiMutation } from '@/shared/hooks';
import type { ApiError } from '@api';
import { useCourseCatalogInvalidation } from './useCourseCatalogInvalidation';
import { courseService } from '../services/CourseService';

export function useDeleteCourse(academyId: string) {
  const invalidateCatalog = useCourseCatalogInvalidation(academyId);

  return useApiMutation<void, string, ApiError>({
    mutationFn: (courseId) => courseService.deleteCourse(academyId, courseId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, courseId) => {
      await invalidateCatalog(courseId);
    },
  });
}
