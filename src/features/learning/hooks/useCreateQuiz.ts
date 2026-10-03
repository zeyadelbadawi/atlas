/**
 * useCreateQuiz hook.
 *
 * Phase 4 — mutation hook for creating a quiz with its complete
 * question/option set.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { invalidateCourseCurriculum } from '@services/query/curriculum-invalidation';
import type { ApiError } from '@api';
import { quizService } from '../services/QuizService';
import type { CreateQuizPayload, QuizAuthoring } from '@types';

export function useCreateQuiz(courseId: string) {
  const queryClient = useQueryClient();

  return useApiMutation<QuizAuthoring, CreateQuizPayload, ApiError>({
    mutationFn: (payload) => quizService.createQuiz(courseId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      // Authoring list + the course builder (unit rows, attach picker).
      await invalidateCourseCurriculum(queryClient, { courseId });
    },
  });
}
