/**
 * useCreateCourse hook.
 *
 * Mutation hook for creating a new course within an academy.
 */
import { useApiMutation, useAcademyBoundMutation } from '@/shared/hooks';
import type { AcademyScopedVariables } from '@/shared/hooks';
import type { ApiError } from '@api';
import { useCourseCatalogInvalidation } from './useCourseCatalogInvalidation';
import { courseService } from '../services/CourseService';
import type { Course, CreateCoursePayload } from '@types';

export function useCreateCourse(academyId: string) {
  const invalidateCatalog = useCourseCatalogInvalidation();

  const mutation = useApiMutation<
    Course,
    AcademyScopedVariables<CreateCoursePayload>,
    ApiError
  >({
    mutationFn: ({ academyId, payload }) =>
      courseService.createCourse(academyId, payload),
    // The page shows its own contextual success/error toast and maps
    // validation errors onto form fields, so the mutation's generic toast is
    // suppressed to avoid showing the user two messages for one failure.
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (course, { academyId }) => {
      await invalidateCatalog(academyId, course.id);
    },
  });

  return useAcademyBoundMutation(mutation, academyId);
}
