/**
 * useQuizAttemptSession — the resumable state of one attempt (P64 Phase 3, AD-8).
 *
 * Read once when the attempt opens and again after a reload; NOT polled.
 * The countdown derives from the `serverNow`/`remainingSeconds` pair this
 * returns plus the local monotonic clock, so re-fetching would only reset
 * the offset the timer already holds. `refetchOnWindowFocus` is off for
 * the same reason: a tab switch is an integrity event, not a reason to
 * replace the questions under the learner's pointer.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { quizKeys } from '@services/query';
import type { ApiError } from '@api';
import { quizService } from '../services/QuizService';
import type { QuizAttemptSession } from '@types';

export interface UseQuizAttemptSessionOptions {
  readonly enabled?: boolean;
}

export function useQuizAttemptSession(
  courseId: string,
  quizId: string,
  attemptId: string | undefined,
  options?: UseQuizAttemptSessionOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<QuizAttemptSession, ApiError>({
    queryKey: quizKeys.session(user?.id, courseId, quizId, attemptId ?? ''),
    queryFn: () =>
      quizService.getQuizAttemptSession(courseId, quizId, attemptId ?? ''),
    enabled: enabled && !!user?.id && !!courseId && !!quizId && !!attemptId,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
}
