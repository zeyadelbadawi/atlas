/**
 * useQuizAttempts hook.
 *
 * Fetches the current student's attempt history for a quiz using
 * TanStack Query.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { quizKeys } from '@services/query';
import { quizService } from '../services/QuizService';
import type { PaginatedResult, QuizAttempt } from '@types';

export interface UseQuizAttemptsOptions {
  readonly enabled?: boolean;
}

export function useQuizAttempts(
  courseId: string,
  quizId: string,
  options?: UseQuizAttemptsOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<PaginatedResult<QuizAttempt>>({
    queryKey: quizKeys.attempts(user?.id, courseId, quizId),
    queryFn: () => quizService.getQuizAttempts(courseId, quizId),
    enabled: enabled && !!user?.id && !!courseId && !!quizId,
    // Retake eligibility can change out from under the learner (a reviewer
    // granting an extra attempt — P4 Issue 6/A), so re-check on every mount
    // and whenever the learner returns to the tab, rather than trusting the
    // default stale window (which never refetches on focus).
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}
