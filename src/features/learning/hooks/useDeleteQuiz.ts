/**
 * useDeleteQuiz hook.
 *
 * Phase 4 — mutation hook for deleting a quiz.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation } from '@/shared/hooks';
import { invalidateCourseCurriculum } from '@services/query/curriculum-invalidation';
import type { ApiError } from '@api';
import { quizService } from '../services/QuizService';
import { INLINE_ERRORS_META } from '@services/query';

export function useDeleteQuiz(courseId: string) {
  const queryClient = useQueryClient();

  return useApiMutation<void, string, ApiError>({
    mutationFn: (quizId) => quizService.deleteQuiz(courseId, quizId),
    showSuccessToast: false,
    showErrorToast: false,
    // B3 (V05) — the authoring screen shows the failure itself; the
    // app-wide reporter must not add a second message.
    meta: { [INLINE_ERRORS_META]: true },
    onSuccess: async () => {
      // Authoring list + the course builder (unit rows, attach picker).
      await invalidateCourseCurriculum(queryClient, { courseId });
    },
  });
}
