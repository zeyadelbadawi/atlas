/**
 * useCompleteLesson hook.
 *
 * Mutation hook for marking a lesson complete. Invalidates the course's
 * progress query so the curriculum navigation and progress bar update
 * immediately from the fresh server response.
 */
import { useApiMutation, useAuth, useInvalidate } from '@/shared/hooks';
import { progressKeys } from '@services/query';
import type { ApiError } from '@api';
import { progressService } from '../services/ProgressService';
import type { CompleteLessonPayload, CourseProgress } from '@types';

export function useCompleteLesson(courseId: string) {
  const { invalidate } = useInvalidate();
  const { user } = useAuth();

  return useApiMutation<CourseProgress, CompleteLessonPayload, ApiError>({
    mutationFn: (payload) => progressService.completeLesson(courseId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(progressKeys.course(user?.id, courseId));
    },
  });
}
