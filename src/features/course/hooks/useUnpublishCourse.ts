/**
 * useUnpublishCourse hook.
 *
 * Mutation hook for reverting a published course back to draft.
 */
import { useApiMutation, useAcademyBoundMutation } from '@/shared/hooks';
import type { AcademyScopedVariables } from '@/shared/hooks';
import type { ApiError } from '@api';
import { useCourseCatalogInvalidation } from './useCourseCatalogInvalidation';
import { courseService } from '../services/CourseService';
import type { Course } from '@types';
import { COURSE_INLINE_ERRORS_META } from './inline-errors';

export function useUnpublishCourse(academyId: string) {
  const invalidateCatalog = useCourseCatalogInvalidation();

  const mutation = useApiMutation<
    Course,
    AcademyScopedVariables<string>,
    ApiError
  >({
    mutationFn: ({ academyId, payload: courseId }) =>
      courseService.unpublishCourse(academyId, courseId),
    showSuccessToast: false,
    showErrorToast: false,
    meta: COURSE_INLINE_ERRORS_META,
    onSuccess: async (_course, { academyId, payload: courseId }) => {
      await invalidateCatalog(academyId, courseId);
    },
  });

  return useAcademyBoundMutation(mutation, academyId);
}
