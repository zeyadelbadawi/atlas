/**
 * useSubmitQuizAttempt hook.
 *
 * Mutation hook that submits a quiz attempt's answers for scoring. Scoring
 * itself happens entirely behind the service abstraction — this hook never
 * computes a score or a pass/fail outcome.
 */
import { useApiMutation, useAuth, useInvalidate } from '@/shared/hooks';
import { progressKeys, quizKeys } from '@services/query';
import type { ApiError } from '@api';
import { quizService } from '../services/QuizService';
import type { QuizAttempt, SubmitQuizAttemptPayload } from '@types';

export interface SubmitQuizAttemptVariables {
  readonly attemptId: string;
  readonly payload: SubmitQuizAttemptPayload;
}

export function useSubmitQuizAttempt(courseId: string, quizId: string) {
  const { invalidate } = useInvalidate();
  const { user } = useAuth();

  return useApiMutation<QuizAttempt, SubmitQuizAttemptVariables, ApiError>({
    mutationFn: ({ attemptId, payload }) =>
      quizService.submitQuizAttempt(courseId, quizId, attemptId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(quizKeys.attempts(user?.id, courseId, quizId));
      // A passed quiz can change the course's completion state.
      await invalidate(progressKeys.course(user?.id, courseId));
    },
  });
}
