/**
 * useRemoveCourseInstructor hook.
 *
 * Mutation hook for revoking course-level instructor access (Phase 3).
 * Does not affect the instructor's Academy roster membership.
 */
import { useApiMutation, useAcademyBoundMutation } from '@/shared/hooks';
import type { AcademyScopedVariables } from '@/shared/hooks';
import type { ApiError } from '@api';
import { useCourseCatalogInvalidation } from './useCourseCatalogInvalidation';
import { courseService } from '../services/CourseService';

export interface RemoveCourseInstructorVariables {
  readonly courseId: string;
  readonly userId: string;
}

export function useRemoveCourseInstructor(academyId: string) {
  const invalidateCatalog = useCourseCatalogInvalidation();

  const mutation = useApiMutation<
    void,
    AcademyScopedVariables<RemoveCourseInstructorVariables>,
    ApiError
  >({
    mutationFn: ({ academyId, payload: { courseId, userId } }) =>
      courseService.removeCourseInstructor(academyId, courseId, userId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, { academyId, payload: { courseId } }) => {
      await invalidateCatalog(academyId, courseId);
    },
  });

  return useAcademyBoundMutation(mutation, academyId);
}
