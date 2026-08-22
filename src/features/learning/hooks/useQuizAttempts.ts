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
  });
}
