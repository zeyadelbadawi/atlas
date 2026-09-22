/**
 * useQuizAttemptResults — the policy-filtered results of one attempt.
 *
 * The server applies the disclosure matrix; this hook never receives a
 * correct answer the learner may not see yet. Refetched on focus so a
 * result that was "awaiting grading" updates when the reviewer finishes.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { quizKeys } from '@services/query';
import type { ApiError } from '@api';
import { quizService } from '../services/QuizService';
import type { QuizAttemptResults } from '@types';

export interface UseQuizAttemptResultsOptions {
  readonly enabled?: boolean;
}

export function useQuizAttemptResults(
  courseId: string,
  quizId: string,
  attemptId: string | undefined,
  options?: UseQuizAttemptResultsOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<QuizAttemptResults, ApiError>({
    queryKey: quizKeys.results(user?.id, courseId, quizId, attemptId ?? ''),
    queryFn: () =>
      quizService.getQuizAttemptResults(courseId, quizId, attemptId ?? ''),
    enabled: enabled && !!user?.id && !!courseId && !!quizId && !!attemptId,
  });
}
