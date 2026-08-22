/**
 * useQuizzes hook.
 *
 * Fetches the quizzes belonging to a course using TanStack Query.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { quizKeys } from '@services/query';
import { quizService } from '../services/QuizService';
import type { PaginatedResult, Quiz } from '@types';

export interface UseQuizzesOptions {
  readonly enabled?: boolean;
}

export function useQuizzes(courseId: string, options?: UseQuizzesOptions) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<PaginatedResult<Quiz>>({
    queryKey: quizKeys.list(user?.id, courseId),
    queryFn: () => quizService.getQuizzes(courseId),
    enabled: enabled && !!user?.id && !!courseId,
  });
}
