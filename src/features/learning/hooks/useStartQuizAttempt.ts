/**
 * useStartQuizAttempt hook.
 *
 * Mutation hook that starts a new quiz attempt.
 */
import { useApiMutation, useAuth, useInvalidate } from '@/shared/hooks';
import { quizKeys } from '@services/query';
import type { ApiError } from '@api';
import { quizService } from '../services/QuizService';
import type { QuizAttempt } from '@types';

export function useStartQuizAttempt(courseId: string, quizId: string) {
  const { invalidate } = useInvalidate();
  const { user } = useAuth();

  return useApiMutation<QuizAttempt, void, ApiError>({
    mutationFn: () => quizService.startQuizAttempt(courseId, quizId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(quizKeys.attempts(user?.id, courseId, quizId));
    },
  });
}
