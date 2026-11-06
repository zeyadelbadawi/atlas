/**
 * useDeleteCourse hook.
 *
 * Mutation hook for deleting a course.
 */
import { useApiMutation, useAcademyBoundMutation } from '@/shared/hooks';
import type { AcademyScopedVariables } from '@/shared/hooks';
import type { ApiError } from '@api';
import { useCourseCatalogInvalidation } from './useCourseCatalogInvalidation';
import { courseService } from '../services/CourseService';
import { COURSE_INLINE_ERRORS_META } from './inline-errors';

export function useDeleteCourse(academyId: string) {
  const invalidateCatalog = useCourseCatalogInvalidation();

  const mutation = useApiMutation<
    void,
    AcademyScopedVariables<string>,
    ApiError
  >({
    mutationFn: ({ academyId, payload: courseId }) =>
      courseService.deleteCourse(academyId, courseId),
    showSuccessToast: false,
    showErrorToast: false,
    meta: COURSE_INLINE_ERRORS_META,
    onSuccess: async (_data, { academyId, payload: courseId }) => {
      await invalidateCatalog(academyId, courseId);
    },
  });

  return useAcademyBoundMutation(mutation, academyId);
}
