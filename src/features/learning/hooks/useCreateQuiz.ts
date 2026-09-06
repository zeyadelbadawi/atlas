/**
 * useCreateQuiz hook.
 *
 * Phase 4 — mutation hook for creating a quiz with its complete
 * question/option set.
 */
import { useApiMutation, useAuth, useInvalidate } from '@/shared/hooks';
import { quizKeys } from '@services/query';
import type { ApiError } from '@api';
import { quizService } from '../services/QuizService';
import type { CreateQuizPayload, QuizAuthoring } from '@types';

export function useCreateQuiz(courseId: string) {
  const { invalidate } = useInvalidate();
  const { user } = useAuth();

  return useApiMutation<QuizAuthoring, CreateQuizPayload, ApiError>({
    mutationFn: (payload) => quizService.createQuiz(courseId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(quizKeys.authoringList(user?.id, courseId));
    },
  });
}
