/**
 * useInstructorQuizAttempts hook.
 *
 * Fetches every student's attempts at a course quiz, for an authorized
 * instructor. Never exposes correct answers — `QuizAttemptSummary` carries
 * only the same result fields a student sees for their own attempt.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { instructorKeys } from '@services/query';
import { instructorService } from '../services/InstructorService';
import type { CollectionQuery, PaginatedResult, QuizAttemptSummary } from '@types';

export interface UseInstructorQuizAttemptsOptions {
  readonly query?: CollectionQuery;
  readonly enabled?: boolean;
}

export function useInstructorQuizAttempts(
  courseId: string,
  quizId: string,
  options?: UseInstructorQuizAttemptsOptions
) {
  const { query, enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<PaginatedResult<QuizAttemptSummary>>({
    queryKey: instructorKeys.quizAttempts(user?.id, courseId, quizId, query),
    queryFn: () => instructorService.getQuizAttempts(courseId, quizId, query),
    enabled: enabled && !!user?.id && !!courseId && !!quizId,
  });
}
