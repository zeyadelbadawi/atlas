/**
 * usePublishCourse hook.
 *
 * Mutation hook for publishing a course. Publishing is a service-driven
 * action — the frontend never assumes what publishing enables beyond
 * updating the course's own status.
 */
import { useApiMutation, useAcademyBoundMutation } from '@/shared/hooks';
import type { AcademyScopedVariables } from '@/shared/hooks';
import type { ApiError } from '@api';
import { useCourseCatalogInvalidation } from './useCourseCatalogInvalidation';
import { courseService } from '../services/CourseService';
import type { Course } from '@types';

export function usePublishCourse(academyId: string) {
  const invalidateCatalog = useCourseCatalogInvalidation();

  const mutation = useApiMutation<
    Course,
    AcademyScopedVariables<string>,
    ApiError
  >({
    mutationFn: ({ academyId, payload: courseId }) =>
      courseService.publishCourse(academyId, courseId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_course, { academyId, payload: courseId }) => {
      await invalidateCatalog(academyId, courseId);
    },
  });

  return useAcademyBoundMutation(mutation, academyId);
}
