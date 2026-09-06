/**
 * useQuizForAuthoring hook.
 *
 * Phase 4 — fetches a single quiz with its full question/option set,
 * including `isCorrect`, for an authoring user. Structurally separate from
 * `useQuiz` (the student-facing, `isCorrect`-free contract).
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { quizKeys } from '@services/query';
import { quizService } from '../services/QuizService';
import type { QuizAuthoring } from '@types';

export interface UseQuizForAuthoringOptions {
  readonly enabled?: boolean;
}

export function useQuizForAuthoring(
  courseId: string,
  quizId: string | undefined,
  options?: UseQuizForAuthoringOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<QuizAuthoring>({
    queryKey: quizKeys.authoringDetail(user?.id, courseId, quizId ?? ''),
    queryFn: () => quizService.getQuizForAuthoring(courseId, quizId as string),
    enabled: enabled && !!user?.id && !!courseId && !!quizId,
  });
}
