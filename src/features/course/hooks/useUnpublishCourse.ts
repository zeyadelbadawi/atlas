/**
 * useUnpublishCourse hook.
 *
 * Mutation hook for reverting a published course back to draft.
 */
import { useApiMutation, useInvalidate } from '@/shared/hooks';
import { courseKeys } from '@services/query';
import type { ApiError } from '@api';
import { courseService } from '../services/CourseService';
import type { Course } from '@types';

export function useUnpublishCourse(academyId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<Course, string, ApiError>({
    mutationFn: (courseId) =>
      courseService.unpublishCourse(academyId, courseId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(courseKeys.all);
    },
  });
}
