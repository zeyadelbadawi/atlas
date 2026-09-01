/**
 * useAssignCourseInstructor hook.
 *
 * Mutation hook for granting course-level instructor access (Phase 3).
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';
import type { AssignCourseInstructorPayload, Course } from '@types';

export interface AssignCourseInstructorVariables {
  readonly courseId: string;
  readonly payload: AssignCourseInstructorPayload;
}

export function useAssignCourseInstructor(academyId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<Course, AssignCourseInstructorVariables, ApiError>({
    mutationFn: ({ courseId, payload }) =>
      courseService.assignCourseInstructor(academyId, courseId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(courseKeys.all);
    },
  });
}
