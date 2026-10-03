/**
 * useUpdateQuiz hook.
 *
 * Phase 4 — mutation hook for updating a quiz. `questions`, when present in
 * the payload, replaces the whole question/option set.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useAuth, useInvalidate } from '@/shared/hooks';
import { quizKeys } from '@services/query';
import { invalidateCourseCurriculum } from '@services/query/curriculum-invalidation';
import type { ApiError } from '@api';
import { quizService } from '../services/QuizService';
import type { QuizAuthoring, UpdateQuizPayload } from '@types';

export interface UpdateQuizVariables {
  readonly quizId: string;
  readonly payload: UpdateQuizPayload;
}

export function useUpdateQuiz(courseId: string) {
  const { invalidate } = useInvalidate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useApiMutation<QuizAuthoring, UpdateQuizVariables, ApiError>({
    mutationFn: ({ quizId, payload }) =>
      quizService.updateQuiz(courseId, quizId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_result, { quizId }) => {
      // Authoring list + the course builder (unit row title/status, picker).
      await invalidateCourseCurriculum(queryClient, { courseId });
      await invalidate(quizKeys.authoringDetail(user?.id, courseId, quizId));
    },
  });
}
