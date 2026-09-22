/**
 * P64 Phase 3 — reviewer hooks over one quiz attempt (§D.2, §D.3, §D.7).
 *
 * Grading and voiding both invalidate the attempt AND the roster list:
 * a manual grade changes the score column, and a void refunds an attempt
 * the roster counts. Overrides are their own small list.
 */
import {
  useApiMutation,
  useApiQuery,
  useAuth,
  useInvalidate,
} from '@/shared/hooks';
import { instructorKeys } from '@services/query';
import type { ApiError } from '@api';
import { instructorService } from '../services/InstructorService';
import type {
  GradeQuizAttemptPayload,
  InvalidateQuizAttemptPayload,
  QuizAttemptReview,
  QuizStudentOverride,
  UpsertQuizStudentOverridePayload,
} from '@types';

export interface UseQuizAttemptReviewOptions {
  readonly enabled?: boolean;
}

export function useQuizAttemptReview(
  courseId: string,
  quizId: string,
  attemptId: string,
  options?: UseQuizAttemptReviewOptions
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<QuizAttemptReview, ApiError>({
    queryKey: instructorKeys.quizAttempt(user?.id, courseId, quizId, attemptId),
    queryFn: () =>
      instructorService.getQuizAttempt(courseId, quizId, attemptId),
    enabled: enabled && !!user?.id && !!courseId && !!quizId && !!attemptId,
  });
}

function useInvalidateAttemptViews(courseId: string, quizId: string) {
  const { invalidate } = useInvalidate();
  const { user } = useAuth();
  return async (attemptId: string) => {
    await invalidate(
      instructorKeys.quizAttempt(user?.id, courseId, quizId, attemptId)
    );
    // Prefix without the `query` element, so every page of the roster refreshes.
    await invalidate([
      ...instructorKeys.all,
      'quiz-attempts',
      user?.id,
      courseId,
      quizId,
    ]);
  };
}

export function useGradeQuizAttempt(courseId: string, quizId: string) {
  const refresh = useInvalidateAttemptViews(courseId, quizId);

  return useApiMutation<
    QuizAttemptReview,
    { readonly attemptId: string; readonly payload: GradeQuizAttemptPayload },
    ApiError
  >({
    mutationFn: ({ attemptId, payload }) =>
      instructorService.gradeQuizAttempt(courseId, quizId, attemptId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, { attemptId }) => refresh(attemptId),
  });
}

export function useInvalidateQuizAttempt(courseId: string, quizId: string) {
  const refresh = useInvalidateAttemptViews(courseId, quizId);

  return useApiMutation<
    QuizAttemptReview,
    {
      readonly attemptId: string;
      readonly payload: InvalidateQuizAttemptPayload;
    },
    ApiError
  >({
    mutationFn: ({ attemptId, payload }) =>
      instructorService.invalidateQuizAttempt(
        courseId,
        quizId,
        attemptId,
        payload
      ),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (_data, { attemptId }) => refresh(attemptId),
  });
}

export function useQuizOverrides(
  courseId: string,
  quizId: string,
  options?: { readonly enabled?: boolean }
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<readonly QuizStudentOverride[], ApiError>({
    queryKey: instructorKeys.quizOverrides(user?.id, courseId, quizId),
    queryFn: () => instructorService.getQuizOverrides(courseId, quizId),
    enabled: enabled && !!user?.id && !!courseId && !!quizId,
  });
}

export function useUpsertQuizOverride(courseId: string, quizId: string) {
  const { invalidate } = useInvalidate();
  const { user } = useAuth();

  return useApiMutation<
    QuizStudentOverride,
    UpsertQuizStudentOverridePayload,
    ApiError
  >({
    mutationFn: (payload) =>
      instructorService.upsertQuizOverride(courseId, quizId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(
        instructorKeys.quizOverrides(user?.id, courseId, quizId)
      );
    },
  });
}

export function useDeleteQuizOverride(courseId: string, quizId: string) {
  const { invalidate } = useInvalidate();
  const { user } = useAuth();

  return useApiMutation<void, string, ApiError>({
    mutationFn: (studentId) =>
      instructorService.deleteQuizOverride(courseId, quizId, studentId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(
        instructorKeys.quizOverrides(user?.id, courseId, quizId)
      );
    },
  });
}

/** The CSV text; the page turns it into a download. A mutation because it is an explicit export action. */
export function useIntegrityCsv(courseId: string, quizId: string) {
  return useApiMutation<string, void, ApiError>({
    mutationFn: () => instructorService.getIntegrityCsv(courseId, quizId),
    showSuccessToast: false,
    showErrorToast: false,
  });
}
