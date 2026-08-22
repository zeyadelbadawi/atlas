/**
 * useUpdateCourse hook.
 *
 * Mutation hook for updating an existing course.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';
import type { Course, UpdateCoursePayload } from '@types';

export interface UpdateCourseVariables {
  readonly courseId: string;
  readonly payload: UpdateCoursePayload;
}

export function useUpdateCourse(academyId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<Course, UpdateCourseVariables, ApiError>({
    mutationFn: ({ courseId, payload }) =>
      courseService.updateCourse(academyId, courseId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(courseKeys.all);
    },
  });
}
