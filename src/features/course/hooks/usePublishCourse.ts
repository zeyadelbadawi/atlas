/**
 * usePublishCourse hook.
 *
 * Mutation hook for publishing a course. Publishing is a service-driven
 * action — the frontend never assumes what publishing enables beyond
 * updating the course's own status.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';
import type { Course } from '@types';

export function usePublishCourse(academyId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<Course, string, ApiError>({
    mutationFn: (courseId) => courseService.publishCourse(academyId, courseId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(courseKeys.all);
    },
  });
}
