/**
 * useQuiz hook.
 *
 * Fetches a single quiz with its questions using TanStack Query.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { quizKeys } from '@services/query';
import { quizService } from '../services/QuizService';
import type { Quiz } from '@types';

export interface UseQuizOptions {
  readonly enabled?: boolean;
}

export function useQuiz(
  courseId: string,
  quizId: string,
  options?: UseQuizOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<Quiz>({
    queryKey: quizKeys.detail(user?.id, courseId, quizId),
    queryFn: () => quizService.getQuiz(courseId, quizId),
    enabled: enabled && !!user?.id && !!courseId && !!quizId,
  });
}
