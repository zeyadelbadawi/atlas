/**
 * Academy offline — the learner's queued changes and the quiz rebase:
 *
 *  - lesson complete/undo queued offline are stamped, a newer op for the
 *    same lesson replaces the older pending one, and the outbox sends
 *    oldest-first, stopping at the first transient failure (ordering);
 *  - an assignment submit is queued under its idempotency key (it can
 *    never be queued twice) and replayed with that same key;
 *  - entries older than the replay window are not sent;
 *  - a stale quiz autosave (`applied: false`) is rebased onto the server's
 *    copy and retried at revision + 1 — the learner's edits are never
 *    dropped.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient } from '@tanstack/react-query';
import { ApiError, createApiError } from '@api';
import {
  MemoryOfflineStore,
  setOfflineStoreForTesting,
} from '@/services/offline/offline-store';
import {
  OUTBOX_TOO_OLD_KEY,
  drainOutbox,
  resetOutboxForTesting,
  startOutbox,
  type OutboxEntry,
} from '@/services/offline/mutation-queue';

const completeLesson = vi.fn();
const undoCompleteLesson = vi.fn();
const submitAssignment = vi.fn();
const saveQuizAnswers = vi.fn();

vi.mock('../services/LessonContentService', () => ({
  lessonContentService: {
    undoCompleteLesson: (...a: unknown[]) => undoCompleteLesson(...a),
  },
}));
vi.mock('@features/learning', () => ({
  useSaveQuizAnswers: () => ({ mutateAsync: saveQuizAnswers }),
  progressService: {
    completeLesson: (...a: unknown[]) => completeLesson(...a),
  },
  assignmentService: {
    submitAssignment: (...a: unknown[]) => submitAssignment(...a),
  },
}));

import {
  ASSIGNMENT_SUBMIT_KIND,
  LEARNER_OUTBOX_MAX_AGE_MS,
  LESSON_OP_KIND,
  queueAssignmentSubmit,
  queueLessonOp,
  registerLearnerOutboxHandlers,
  resetLearnerOutboxRegistrationForTesting,
} from './learner-outbox';
import { rebaseAnswers, useQuizAutosave } from '../hooks/useQuizAutosave';

const U1 = 'user-1';
let store: MemoryOfflineStore;
let online = true;

beforeEach(() => {
  store = new MemoryOfflineStore();
  setOfflineStoreForTesting(store);
  resetOutboxForTesting();
  resetLearnerOutboxRegistrationForTesting();
  online = false;
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
  completeLesson.mockReset().mockResolvedValue({ applied: true });
  undoCompleteLesson.mockReset().mockResolvedValue({ applied: true });
  submitAssignment.mockReset().mockResolvedValue({ id: 's1' });
  saveQuizAnswers.mockReset();
});

afterEach(() => {
  setOfflineStoreForTesting(null);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function start() {
  registerLearnerOutboxHandlers(new QueryClient());
  return startOutbox(() => U1);
}

const op = (
  lessonId: string,
  action: 'complete' | 'undo',
  clientOpAt: number
) => ({
  userId: U1,
  courseId: 'c1',
  lessonId,
  action,
  opId: `op-${lessonId}-${action}-${clientOpAt}`,
  clientOpAt,
});

describe('lesson operations queued offline', () => {
  it('a newer op for the same lesson replaces the pending older one; each is stamped', async () => {
    const stop = start();
    await queueLessonOp(op('l1', 'complete', 1_000));
    await queueLessonOp(op('l2', 'complete', 1_500));
    await queueLessonOp(op('l1', 'undo', 2_000));

    const pending = await store.getAll<OutboxEntry>('outbox');
    expect(
      pending.map((e) => (e.payload as { opId: string }).opId).sort()
    ).toEqual(['op-l1-undo-2000', 'op-l2-complete-1500']);

    online = true;
    await drainOutbox();
    expect(completeLesson).toHaveBeenCalledWith('c1', {
      lessonId: 'l2',
      opId: 'op-l2-complete-1500',
      clientOpAt: 1_500,
    });
    expect(undoCompleteLesson).toHaveBeenCalledWith('c1', 'l1', {
      params: { opId: 'op-l1-undo-2000', clientOpAt: 2_000 },
    });
    expect(await store.getAll('outbox')).toEqual([]);
    stop();
  });

  it('sends oldest first and stops at a transient failure, so later ops never overtake', async () => {
    const stop = start();
    let now = 10_000;
    vi.spyOn(Date, 'now').mockImplementation(() => (now += 10));
    await queueLessonOp(op('l1', 'complete', 1));
    await queueLessonOp(op('l2', 'complete', 2));
    await queueLessonOp(op('l3', 'complete', 3));
    const order: string[] = [];
    completeLesson.mockImplementation(
      async (_c: string, body: { lessonId: string }) => {
        order.push(body.lessonId);
        if (body.lessonId === 'l2')
          throw new ApiError(createApiError('network'));
        return { applied: true };
      }
    );

    online = true;
    await drainOutbox();
    expect(order).toEqual(['l1', 'l2']); // l3 waited behind the failure
    const left = await store.getAll<OutboxEntry>('outbox');
    expect(
      left.map((e) => (e.payload as { lessonId: string }).lessonId).sort()
    ).toEqual(['l2', 'l3']);
    stop();
  });

  it('a stale op the server did not apply (newer one won elsewhere) is done, not retried', async () => {
    const stop = start();
    await queueLessonOp(op('l1', 'complete', 1));
    completeLesson.mockResolvedValue({ applied: false });
    online = true;
    await drainOutbox();
    expect(completeLesson).toHaveBeenCalledTimes(1);
    expect(await store.getAll('outbox')).toEqual([]);
    stop();
  });

  it('an entry older than the replay window is not sent', async () => {
    const stop = start();
    await queueLessonOp(op('l1', 'complete', 1));
    online = true;
    await drainOutbox(() => Date.now() + LEARNER_OUTBOX_MAX_AGE_MS + 1);
    expect(completeLesson).not.toHaveBeenCalled();
    const [entry] = await store.getAll<OutboxEntry>('outbox');
    expect(entry).toMatchObject({
      status: 'failed',
      lastErrorKey: OUTBOX_TOO_OLD_KEY,
    });
    expect(entry.kind).toBe(LESSON_OP_KIND);
    stop();
  });
});

describe('assignment submit queued offline', () => {
  const submit = {
    userId: U1,
    courseId: 'c1',
    assignmentId: 'asg1',
    response: 'My essay',
    idempotencyKey: 'key-1234567890',
    baseRevision: 0,
  };

  it('is stored under its idempotency key (never twice) and replayed with that key', async () => {
    const stop = start();
    await queueAssignmentSubmit(submit);
    await queueAssignmentSubmit(submit);
    const entries = await store.getAll<OutboxEntry>('outbox');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: submit.idempotencyKey,
      kind: ASSIGNMENT_SUBMIT_KIND,
    });

    online = true;
    await drainOutbox();
    expect(submitAssignment).toHaveBeenCalledWith('c1', 'asg1', {
      response: 'My essay',
      attachmentAssetId: undefined,
      idempotencyKey: submit.idempotencyKey,
      baseRevision: 0,
    });
    expect(await store.getAll('outbox')).toEqual([]);
    stop();
  });

  it('a server that moved on (409) becomes a visible conflict, never a resubmission', async () => {
    const stop = start();
    await queueAssignmentSubmit(submit);
    submitAssignment.mockRejectedValue(
      new ApiError(
        createApiError('conflict', {
          status: 409,
          messageKey: 'errors.assignment.submissionChanged',
        })
      )
    );
    online = true;
    await drainOutbox();
    await drainOutbox();
    expect(submitAssignment).toHaveBeenCalledTimes(1);
    const [entry] = await store.getAll<OutboxEntry>('outbox');
    expect(entry.status).toBe('conflict');
    stop();
  });
});

describe('quiz autosave rebase on applied:false', () => {
  it('rebaseAnswers keeps the learner’s edits and takes the server copy elsewhere', () => {
    const baseline = [
      { questionId: 'q1', selectedOptionIds: ['a'] },
      { questionId: 'q2', selectedOptionIds: ['a'] },
    ];
    const local = [
      { questionId: 'q1', selectedOptionIds: ['b'] }, // edited here
      { questionId: 'q2', selectedOptionIds: ['a'] }, // untouched here
    ];
    const server = [
      { questionId: 'q1', selectedOptionIds: ['a'] },
      { questionId: 'q2', selectedOptionIds: ['c'] }, // changed in another tab
      { questionId: 'q3', text: 'from the other tab' },
    ];
    expect(rebaseAnswers(server, local, baseline)).toEqual([
      { questionId: 'q1', selectedOptionIds: ['b'] },
      { questionId: 'q2', selectedOptionIds: ['c'] },
      { questionId: 'q3', text: 'from the other tab' },
    ]);
    // An older server without the copy: the learner's full set is kept.
    expect(rebaseAnswers(undefined, local, baseline)).toEqual(local);
  });

  it('retries at the server revision + 1 with the merged answers, never dropping them', async () => {
    saveQuizAnswers
      .mockResolvedValueOnce({
        attemptId: 'att1',
        revision: 7,
        applied: false,
        savedAt: null,
        serverNow: new Date().toISOString(),
        deadlineAt: null,
        answers: [{ questionId: 'q2', selectedOptionIds: ['z'] }],
      })
      .mockResolvedValueOnce({
        attemptId: 'att1',
        revision: 8,
        applied: true,
        savedAt: new Date().toISOString(),
        serverNow: new Date().toISOString(),
        deadlineAt: null,
      });
    const onRebased = vi.fn();
    const { result } = renderHook(() =>
      useQuizAutosave({
        courseId: 'c1',
        quizId: 'q',
        attemptId: 'att1',
        initialRevision: 2,
        enabled: true,
        confirmedAnswers: [],
        onRebased,
      })
    );
    await act(async () => {
      result.current.schedule([{ questionId: 'q1', selectedOptionIds: ['a'] }]);
      await result.current.flush();
    });
    await vi.waitFor(() => expect(saveQuizAnswers).toHaveBeenCalledTimes(2));

    expect(saveQuizAnswers.mock.calls[0][0].payload.revision).toBe(3);
    const retry = saveQuizAnswers.mock.calls[1][0].payload;
    expect(retry.revision).toBe(8);
    expect(retry.answers).toEqual([
      { questionId: 'q1', selectedOptionIds: ['a'] },
      { questionId: 'q2', selectedOptionIds: ['z'] },
    ]);
    expect(onRebased).toHaveBeenCalledWith(retry.answers);
    await vi.waitFor(() => expect(result.current.state).toBe('saved'));
  });
});
