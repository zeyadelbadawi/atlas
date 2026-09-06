/**
 * useUpdateQuiz hook.
 *
 * Phase 4 — mutation hook for updating a quiz. `questions`, when present in
 * the payload, replaces the whole question/option set.
 */
import { useApiMutation, useAuth, useInvalidate } from '@/shared/hooks';
import { quizKeys } from '@services/query';
import type { ApiError } from '@api';
import { quizService } from '../services/QuizService';
import type { QuizAuthoring, UpdateQuizPayload } from '@types';

export interface UpdateQuizVariables {
  readonly quizId: string;
  readonly payload: UpdateQuizPayload;
}

export function useUpdateQuiz(courseId: string) {
  const { invalidate } = useInvalidate();
  const { user } = useAuth();

  return useApiMutation<QuizAuthoring, UpdateQuizVariables, ApiError>({
    mutationFn: ({ quizId, payload }) =>
      quizService.updateQuiz(courseId, quizId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_result, { quizId }) => {
      await invalidate(quizKeys.authoringList(user?.id, courseId));
      await invalidate(quizKeys.authoringDetail(user?.id, courseId, quizId));
    },
  });
}
