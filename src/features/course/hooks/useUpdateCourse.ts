/**
 * useUpdateCourse hook.
 *
 * Mutation hook for updating an existing course.
 */
import { useApiMutation, useAcademyBoundMutation } from '@/shared/hooks';
import type { AcademyScopedVariables } from '@/shared/hooks';
import type { ApiError } from '@api';
import { useCourseCatalogInvalidation } from './useCourseCatalogInvalidation';
import { courseService } from '../services/CourseService';
import type { Course, UpdateCoursePayload } from '@types';

export interface UpdateCourseVariables {
  readonly courseId: string;
  readonly payload: UpdateCoursePayload;
}

export function useUpdateCourse(academyId: string) {
  const invalidateCatalog = useCourseCatalogInvalidation();

  const mutation = useApiMutation<
    Course,
    AcademyScopedVariables<UpdateCourseVariables>,
    ApiError
  >({
    mutationFn: ({ academyId, payload: { courseId, payload } }) =>
      courseService.updateCourse(academyId, courseId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_course, { academyId, payload: { courseId } }) => {
      await invalidateCatalog(academyId, courseId);
    },
  });

  return useAcademyBoundMutation(mutation, academyId);
}
