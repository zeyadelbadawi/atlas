/**
 * useRecordQuizAttemptEvents — one batch of integrity events (P64 Phase 3, AD-9).
 *
 * The server decides what counts (warm-up, debounce, sub-second
 * visibility) and answers with the action the attempt now needs:
 * nothing, a warning, or an auto-submit that has already happened.
 */
import { useApiMutation } from '@/shared/hooks';
import type { ApiError } from '@api';
import { quizService } from '../services/QuizService';
import type {
  RecordQuizAttemptEventsPayload,
  RecordQuizAttemptEventsResponse,
} from '@types';

export interface RecordQuizAttemptEventsVariables {
  readonly attemptId: string;
  readonly payload: RecordQuizAttemptEventsPayload;
}

export function useRecordQuizAttemptEvents(courseId: string, quizId: string) {
  return useApiMutation<
    RecordQuizAttemptEventsResponse,
    RecordQuizAttemptEventsVariables,
    ApiError
  >({
    mutationFn: ({ attemptId, payload }) =>
      quizService.recordQuizAttemptEvents(courseId, quizId, attemptId, payload),
    showSuccessToast: false,
    showErrorToast: false,
  });
}
