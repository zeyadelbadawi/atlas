/**
 * useUpdateCourse hook.
 *
 * Mutation hook for updating an existing course.
 */
import { useApiMutation } from '@/shared/hooks';
import type { ApiError } from '@api';
import { useCourseCatalogInvalidation } from './useCourseCatalogInvalidation';
import { courseService } from '../services/CourseService';
import type { Course, UpdateCoursePayload } from '@types';

export interface UpdateCourseVariables {
  readonly courseId: string;
  readonly payload: UpdateCoursePayload;
}

export function useUpdateCourse(academyId: string) {
  const invalidateCatalog = useCourseCatalogInvalidation(academyId);

  return useApiMutation<Course, UpdateCourseVariables, ApiError>({
    mutationFn: ({ courseId, payload }) =>
      courseService.updateCourse(academyId, courseId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_course, { courseId }) => {
      await invalidateCatalog(courseId);
    },
  });
}
