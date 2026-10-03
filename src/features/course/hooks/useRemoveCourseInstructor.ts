/**
 * useRemoveCourseInstructor hook.
 *
 * Mutation hook for revoking course-level instructor access (Phase 3).
 * Does not affect the instructor's Academy roster membership.
 */
import { useApiMutation } from '@/shared/hooks';
import type { ApiError } from '@api';
import { useCourseCatalogInvalidation } from './useCourseCatalogInvalidation';
import { courseService } from '../services/CourseService';

export interface RemoveCourseInstructorVariables {
  readonly courseId: string;
  readonly userId: string;
}

export function useRemoveCourseInstructor(academyId: string) {
  const invalidateCatalog = useCourseCatalogInvalidation(academyId);

  return useApiMutation<void, RemoveCourseInstructorVariables, ApiError>({
    mutationFn: ({ courseId, userId }) =>
      courseService.removeCourseInstructor(academyId, courseId, userId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, { courseId }) => {
      await invalidateCatalog(courseId);
    },
  });
}
