/**
 * useDeleteQuiz hook.
 *
 * Phase 4 — mutation hook for deleting a quiz.
 */
import { useApiMutation, useAuth, useInvalidate } from '@/shared/hooks';
import { quizKeys } from '@services/query';
import type { ApiError } from '@api';
import { quizService } from '../services/QuizService';

export function useDeleteQuiz(courseId: string) {
  const { invalidate } = useInvalidate();
  const { user } = useAuth();

  return useApiMutation<void, string, ApiError>({
    mutationFn: (quizId) => quizService.deleteQuiz(courseId, quizId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(quizKeys.authoringList(user?.id, courseId));
    },
  });
}
