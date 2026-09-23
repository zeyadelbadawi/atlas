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
    // The quiz detail now carries the learner's own effective attempt
    // allowance (extra-attempt override included), which a reviewer can
    // change while the learner sits on the quiz. Refresh it on mount and
    // whenever the learner returns to the tab so a granted extra attempt
    // appears without a hard reload (P4 Issue A).
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
}
