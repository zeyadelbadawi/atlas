/**
 * useQuizzesForAuthoring hook.
 *
 * Phase 4 — fetches every quiz belonging to a course (draft + published) for
 * an authoring user (course instructor or Owner/Manager). Structurally
 * separate from `useQuizzes`, which only ever returns published quizzes to
 * an enrolled student.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { quizKeys } from '@services/query';
import { quizService } from '../services/QuizService';
import type { PaginatedResult, Quiz } from '@types';

export interface UseQuizzesForAuthoringOptions {
  readonly enabled?: boolean;
}

export function useQuizzesForAuthoring(
  courseId: string,
  options?: UseQuizzesForAuthoringOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<PaginatedResult<Quiz>>({
    queryKey: quizKeys.authoringList(user?.id, courseId),
    queryFn: () => quizService.getQuizzesForAuthoring(courseId),
    enabled: enabled && !!user?.id && !!courseId,
  });
}
