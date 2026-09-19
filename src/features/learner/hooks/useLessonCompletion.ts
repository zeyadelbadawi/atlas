/**
 * Marking a lesson complete, and taking it back (§E.3's completion
 * behaviours).
 *
 * UNDO IS NOT A UI AFFORDANCE HERE. `DELETE …/progress/complete-lesson/
 * :lessonId` is a real reversal: the server recomputes course progress
 * and answers with it, so the sidebar, the progress bar and the
 * next-activity pointer all move back together. A local "unmark" that
 * only repainted a tick would leave the learner's real progress claiming
 * a lesson they had just said they had not finished — and the certificate
 * eligibility Phase 3 will read is computed from the server's copy, not
 * from the tick.
 *
 * BOTH MUTATIONS INVALIDATE THE SEQUENCE AS WELL AS PROGRESS. Completing
 * an item is what unlocks the next one, so a sidebar refreshed from
 * progress alone would show the new tick beside a Next button still
 * pointing at a lock. They are one fact with two readers.
 *
 * NEITHER SHOWS A TOAST. §E.3 asks for an INLINE confirmation with
 * "Next: …", which the action bar renders where the learner is already
 * looking; a toast in the corner saying the same thing is a second,
 * worse copy of it.
 */
import { useApiMutation, useAuth, useInvalidate } from '@hooks';
import { learnerKeys, progressKeys } from '@services/query';
import type { ApiError } from '@api';
import type { CompleteLessonPayload, CourseProgress } from '@types';
import { progressService } from '@features/learning';
import { lessonContentService } from '../services/LessonContentService';

/** Marks a lesson complete for the current learner. */
export function useCompleteLessonInPlayer(courseId: string) {
  const { invalidate } = useInvalidate();
  const { user } = useAuth();

  return useApiMutation<CourseProgress, CompleteLessonPayload, ApiError>({
    mutationFn: (payload) => progressService.completeLesson(courseId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await Promise.all([
        invalidate(progressKeys.course(user?.id, courseId)),
        invalidate(learnerKeys.sequence(user?.id, courseId)),
      ]);
    },
  });
}

/** Reverses a completion. See this file's doc comment for why it is a real call. */
export function useUndoLessonCompletion(courseId: string) {
  const { invalidate } = useInvalidate();
  const { user } = useAuth();

  return useApiMutation<CourseProgress, string, ApiError>({
    mutationFn: (lessonId) =>
      lessonContentService.undoCompleteLesson(courseId, lessonId),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await Promise.all([
        invalidate(progressKeys.course(user?.id, courseId)),
        invalidate(learnerKeys.sequence(user?.id, courseId)),
      ]);
    },
  });
}
