/**
 * Academy offline — the learner changes that may wait in the durable
 * outbox (`@services/offline` mutation-queue) and be sent later.
 *
 * Each one makes the replay argument the outbox demands:
 *
 *  LESSON COMPLETE / UNDO (`learner.lesson-op`). Both are idempotent
 *  state-setters, and each carries `opId` + `clientOpAt`: the server applies
 *  the newest stamp per learner and lesson and answers `applied: false` to
 *  an older one arriving late (another device acted since), which is then
 *  simply dropped — never retried into overwriting the newer intent. A
 *  newer local op for the same lesson REPLACES a pending older one, and the
 *  outbox sends oldest first and stops at the first transient failure, so
 *  ordering holds end to end.
 *
 *  ASSIGNMENT SUBMIT (`learner.assignment-submit`). Not idempotent by
 *  nature — so it carries an `idempotencyKey` (the same one the learner's
 *  first attempt used, kept with the local draft) and the `baseRevision` the
 *  learner saw. A replay returns the original submission; a server that has
 *  moved on answers 409 and the entry becomes a CONFLICT the learner sees,
 *  never a silent second submission and never a reset grade. The learner
 *  sees "waiting to send" for as long as it is queued and can cancel it.
 *
 * Quiz attempts are NOT here: a quiz is submitted online only, and a timed
 * attempt's clock and completion belong to the server.
 */
import type { QueryClient } from '@tanstack/react-query';
import type { CourseProgress } from '@types';
import {
  deleteAssignmentDraft,
  enqueueOutbox,
  registerOutboxHandler,
} from '@services/offline';
import {
  assignmentKeys,
  completionKeys,
  learnerKeys,
  progressKeys,
} from '@services/query';
import { assignmentService, progressService } from '@features/learning';
import { lessonContentService } from '../services/LessonContentService';

export const LESSON_OP_KIND = 'learner.lesson-op';
export const ASSIGNMENT_SUBMIT_KIND = 'learner.assignment-submit';
/** The client gives up well inside the server's 10-day replay memory. */
export const LEARNER_OUTBOX_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface LessonOpPayload {
  readonly userId: string;
  readonly courseId: string;
  readonly lessonId: string;
  readonly action: 'complete' | 'undo';
  readonly opId: string;
  readonly clientOpAt: number;
}

export interface AssignmentSubmitPayload {
  readonly userId: string;
  readonly courseId: string;
  readonly assignmentId: string;
  readonly response?: string;
  readonly attachmentAssetId?: string;
  readonly idempotencyKey: string;
  readonly baseRevision: number;
}

/** A fresh client operation id (the server accepts `[A-Za-z0-9_-]{8,100}`). */
export function newClientOpId(): string {
  return crypto.randomUUID();
}

/** Sends one stamped lesson operation; the answer may say `applied: false`. */
export async function sendLessonOp(
  payload: LessonOpPayload
): Promise<CourseProgress> {
  const stamp = { opId: payload.opId, clientOpAt: payload.clientOpAt };
  return payload.action === 'complete'
    ? progressService.completeLesson(payload.courseId, {
        lessonId: payload.lessonId,
        ...stamp,
      })
    : lessonContentService.undoCompleteLesson(
        payload.courseId,
        payload.lessonId,
        { params: stamp }
      );
}

function refreshCourse(
  queryClient: QueryClient,
  userId: string,
  courseId: string
): void {
  void queryClient.invalidateQueries({
    queryKey: learnerKeys.sequence(userId, courseId),
  });
  void queryClient.invalidateQueries({
    queryKey: progressKeys.course(userId, courseId),
  });
  void queryClient.invalidateQueries({
    queryKey: completionKeys.course(userId, courseId),
  });
}

let registeredFor: QueryClient | null = null;

export function registerLearnerOutboxHandlers(queryClient: QueryClient): void {
  if (registeredFor === queryClient) return;
  registeredFor = queryClient;

  registerOutboxHandler<LessonOpPayload>(LESSON_OP_KIND, {
    run: async (payload) => {
      // `applied: false` is an answer, not a failure: a newer operation
      // already won on the server. Either way the entry is done.
      await sendLessonOp(payload);
      refreshCourse(queryClient, payload.userId, payload.courseId);
    },
    // The lesson or the enrolment is gone: nothing left to sync.
    dropOnStatus: [404],
    maxAgeMs: LEARNER_OUTBOX_MAX_AGE_MS,
  });

  registerOutboxHandler<AssignmentSubmitPayload>(ASSIGNMENT_SUBMIT_KIND, {
    run: async (payload) => {
      await assignmentService.submitAssignment(
        payload.courseId,
        payload.assignmentId,
        {
          response: payload.response,
          attachmentAssetId: payload.attachmentAssetId,
          idempotencyKey: payload.idempotencyKey,
          baseRevision: payload.baseRevision,
        }
      );
      await deleteAssignmentDraft(
        payload.userId,
        payload.courseId,
        payload.assignmentId
      );
      void queryClient.invalidateQueries({
        queryKey: assignmentKeys.submission(
          payload.userId,
          payload.courseId,
          payload.assignmentId
        ),
      });
      refreshCourse(queryClient, payload.userId, payload.courseId);
    },
    maxAgeMs: LEARNER_OUTBOX_MAX_AGE_MS,
  });
}

/** Queues a lesson operation, replacing any pending older one for the same lesson. */
export function queueLessonOp(payload: LessonOpPayload): Promise<boolean> {
  return enqueueOutbox<LessonOpPayload>(
    payload.userId,
    LESSON_OP_KIND,
    payload,
    payload.opId,
    {
      supersedes: (entry) =>
        entry.payload.courseId === payload.courseId &&
        entry.payload.lessonId === payload.lessonId &&
        entry.payload.clientOpAt <= payload.clientOpAt,
    }
  );
}

/** Queues an assignment submit; the outbox entry id IS the idempotency key, so it can never be queued twice. */
export function queueAssignmentSubmit(
  payload: AssignmentSubmitPayload
): Promise<boolean> {
  return enqueueOutbox<AssignmentSubmitPayload>(
    payload.userId,
    ASSIGNMENT_SUBMIT_KIND,
    payload,
    payload.idempotencyKey
  );
}

/** Tests only. */
export function resetLearnerOutboxRegistrationForTesting(): void {
  registeredFor = null;
}
