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
 * BOTH MUTATIONS REFRESH EVERY READER OF THE COURSE'S PROGRESS — the
 * sequence, the completion evaluation and the Start / Continue labels
 * (`useRefreshCourseProgress`). Completing an item is what unlocks the
 * next one, so a sidebar refreshed from progress alone would show the new
 * tick beside a Next button still pointing at a lock.
 *
 * NEITHER SHOWS A TOAST. §E.3 asks for an INLINE confirmation with
 * "Next: …", which the action bar renders where the learner is already
 * looking; a toast in the corner saying the same thing is a second,
 * worse copy of it.
 */
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useApiMutation, useAuth } from '@hooks';
import { normalizeUnknownError, type ApiError } from '@api';
import type { CourseProgress, CourseSequenceResponse } from '@types';
import { learnerKeys } from '@services/query';
import {
  newClientOpId,
  queueLessonOp,
  sendLessonOp,
  type LessonOpPayload,
} from '../offline/learner-outbox';
import { useRefreshCourseProgress } from './useRefreshCourseProgress';

/**
 * ACADEMY OFFLINE. Every complete/undo is stamped (`opId`, `clientOpAt`) so
 * the server can order it against operations from other devices. Without a
 * connection — or when the request fails for lack of one — the operation is
 * kept in the durable outbox instead of failing, the sidebar shows the
 * learner's intent at once, and the mutation resolves with `{ queued: true }`
 * so the player can say "saved on this device, will sync". It is sent, in
 * order, when the connection returns (`learner-outbox.ts`).
 */
export type LessonOpOutcome =
  | (CourseProgress & { readonly queued?: false })
  | { readonly queued: true; readonly action: 'complete' | 'undo' };

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/** The learner's intent, painted into the cached outline until the server's answer replaces it. */
function applyOptimistic(
  queryClient: QueryClient,
  payload: LessonOpPayload
): void {
  queryClient.setQueryData<CourseSequenceResponse>(
    learnerKeys.sequence(payload.userId, payload.courseId),
    (current) => {
      if (!current) return current;
      let delta = 0;
      const items = current.items.map((item) => {
        if (item.id !== payload.lessonId) return item;
        const wasCompleted = item.state === 'completed';
        if (payload.action === 'complete' && !wasCompleted) delta = 1;
        if (payload.action === 'undo' && wasCompleted) delta = -1;
        return {
          ...item,
          state:
            payload.action === 'complete'
              ? ('completed' as const)
              : ('available' as const),
        };
      });
      return {
        ...current,
        items,
        completedCount: Math.max(0, current.completedCount + delta),
      };
    }
  );
}

async function runLessonOp(
  queryClient: QueryClient,
  payload: LessonOpPayload
): Promise<LessonOpOutcome> {
  if (!isOffline()) {
    try {
      return await sendLessonOp(payload);
    } catch (error) {
      const kind = normalizeUnknownError(error).kind;
      if (kind !== 'network' && kind !== 'timeout') throw error;
    }
  }
  const stored = await queueLessonOp(payload);
  // No durable storage in this browser: the change genuinely needs a
  // connection, and the learner is told so rather than shown a tick that
  // would vanish on reload.
  if (!stored) throw normalizeUnknownError(new TypeError('Network Error'));
  applyOptimistic(queryClient, payload);
  return { queued: true, action: payload.action };
}

function useLessonOp(courseId: string, action: 'complete' | 'undo') {
  const refreshCourseProgress = useRefreshCourseProgress(courseId);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useApiMutation<LessonOpOutcome, string, ApiError>({
    mutationFn: (lessonId) =>
      runLessonOp(queryClient, {
        userId: user?.id ?? '',
        courseId,
        lessonId,
        action,
        opId: newClientOpId(),
        clientOpAt: Date.now(),
      }),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async (outcome) => {
      if (!outcome.queued) await refreshCourseProgress();
    },
  });
}

/** Marks a lesson complete for the current learner (queued when offline). */
export function useCompleteLessonInPlayer(courseId: string) {
  return useLessonOp(courseId, 'complete');
}

/** Reverses a completion. See this file's doc comment for why it is a real call. */
export function useUndoLessonCompletion(courseId: string) {
  return useLessonOp(courseId, 'undo');
}
