/**
 * useAssignCourseInstructor hook.
 *
 * Mutation hook for granting course-level instructor access (Phase 3).
 */
import { useApiMutation, useAcademyBoundMutation } from '@/shared/hooks';
import type { AcademyScopedVariables } from '@/shared/hooks';
import type { ApiError } from '@api';
import { useCourseCatalogInvalidation } from './useCourseCatalogInvalidation';
import { courseService } from '../services/CourseService';
import type { AssignCourseInstructorPayload, Course } from '@types';

export interface AssignCourseInstructorVariables {
  readonly courseId: string;
  readonly payload: AssignCourseInstructorPayload;
}

export function useAssignCourseInstructor(academyId: string) {
  const invalidateCatalog = useCourseCatalogInvalidation();

  const mutation = useApiMutation<
    Course,
    AcademyScopedVariables<AssignCourseInstructorVariables>,
    ApiError
  >({
    mutationFn: ({ academyId, payload: { courseId, payload } }) =>
      courseService.assignCourseInstructor(academyId, courseId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_course, { academyId, payload: { courseId } }) => {
      await invalidateCatalog(academyId, courseId);
    },
  });

  return useAcademyBoundMutation(mutation, academyId);
}
