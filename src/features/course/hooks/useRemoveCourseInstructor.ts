/**
 * useRemoveCourseInstructor hook.
 *
 * Mutation hook for revoking course-level instructor access (Phase 3).
 * Does not affect the instructor's Academy roster membership.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';

export interface RemoveCourseInstructorVariables {
  readonly courseId: string;
  readonly userId: string;
}

export function useRemoveCourseInstructor(academyId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<void, RemoveCourseInstructorVariables, ApiError>({
    mutationFn: ({ courseId, userId }) =>
      courseService.removeCourseInstructor(academyId, courseId, userId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(courseKeys.all);
    },
  });
}
