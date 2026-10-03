/**
 * useUnpublishCourse hook.
 *
 * Mutation hook for reverting a published course back to draft.
 */
import { useApiMutation } from '@/shared/hooks';
import type { ApiError } from '@api';
import { useCourseCatalogInvalidation } from './useCourseCatalogInvalidation';
import { courseService } from '../services/CourseService';
import type { Course } from '@types';

export function useUnpublishCourse(academyId: string) {
  const invalidateCatalog = useCourseCatalogInvalidation(academyId);

  return useApiMutation<Course, string, ApiError>({
    mutationFn: (courseId) =>
      courseService.unpublishCourse(academyId, courseId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_course, courseId) => {
      await invalidateCatalog(courseId);
    },
  });
}
