/**
 * useAssignCourseInstructor hook.
 *
 * Mutation hook for granting course-level instructor access (Phase 3).
 */
import { useApiMutation } from '@/shared/hooks';
import type { ApiError } from '@api';
import { useCourseCatalogInvalidation } from './useCourseCatalogInvalidation';
import { courseService } from '../services/CourseService';
import type { AssignCourseInstructorPayload, Course } from '@types';

export interface AssignCourseInstructorVariables {
  readonly courseId: string;
  readonly payload: AssignCourseInstructorPayload;
}

export function useAssignCourseInstructor(academyId: string) {
  const invalidateCatalog = useCourseCatalogInvalidation(academyId);

  return useApiMutation<Course, AssignCourseInstructorVariables, ApiError>({
    mutationFn: ({ courseId, payload }) =>
      courseService.assignCourseInstructor(academyId, courseId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_course, { courseId }) => {
      await invalidateCatalog(courseId);
    },
  });
}
