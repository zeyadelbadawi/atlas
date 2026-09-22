/**
 * useSaveQuizAnswers — autosave (P64 Phase 3, AD-8).
 *
 * No toasts and no query invalidation: the caller owns the save
 * indicator and the revision counter, and invalidating the session query
 * on every keystroke would refetch the questions mid-answer.
 */
import { useApiMutation } from '@/shared/hooks';
import type { ApiError } from '@api';
import { quizService } from '../services/QuizService';
import type { SaveQuizAnswersPayload, SaveQuizAnswersResponse } from '@types';

export interface SaveQuizAnswersVariables {
  readonly attemptId: string;
  readonly payload: SaveQuizAnswersPayload;
}

export function useSaveQuizAnswers(courseId: string, quizId: string) {
  return useApiMutation<
    SaveQuizAnswersResponse,
    SaveQuizAnswersVariables,
    ApiError
  >({
    mutationFn: ({ attemptId, payload }) =>
      quizService.saveQuizAnswers(courseId, quizId, attemptId, payload),
    showSuccessToast: false,
    showErrorToast: false,
  });
}
