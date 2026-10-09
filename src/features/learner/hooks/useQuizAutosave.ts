/**
 * useQuizAutosave — the save queue behind "Saved just now" (P64 Phase 3, AD-8).
 *
 * ONE IN-FLIGHT SAVE, MONOTONIC REVISIONS. Every edit bumps a local
 * revision; a save carries the revision it was taken at. If another edit
 * lands while a save is in flight the queue marks itself dirty and sends
 * again as soon as the first save returns — never two concurrent PUTs,
 * so the server's "ignore anything older than what I have" rule can
 * never drop the learner's latest answers on the floor.
 *
 * FAILURE IS A STATE, NOT A TOAST. A network failure moves the indicator
 * to "Offline — will retry" and schedules a retry with backoff; the
 * learner keeps answering. A definitive refusal (the attempt is over:
 * expired, submitted, invalidated) stops the queue and tells the caller,
 * which then asks the server for results rather than guessing.
 *
 * A STALE SAVE IS REBASED, NEVER DROPPED (academy offline work). The
 * server ignores a revision it has already passed (`applied: false`) — two
 * tabs, or a reload while a save was in flight. That used to be treated as
 * success and the learner's latest answers were silently lost. Now the
 * queue adopts the server's revision, merges: every question the learner
 * changed since the last CONFIRMED save keeps the learner's answer, every
 * other question takes the server's (newer) copy, and sends the merge at
 * revision + 1. The runner is told (`onRebased`) so the screen shows what
 * is being saved. Bounded: after `MAX_REBASES` in a row it backs off like
 * any other failure, still holding the answers.
 *
 * UNTIMED ATTEMPTS ARE JOURNALLED ON THE DEVICE (`journal`). Every edit is
 * written to the learner's own offline store, so a reload or a closed tab
 * while offline loses nothing; the journal is restored by the runner and
 * deleted once the server confirmed it. A TIMED attempt is never
 * journalled and never completed offline: its clock, its deadline and its
 * submission belong to the server.
 *
 * FLUSH ON HIDE. `pagehide` and a hidden `visibilitychange` flush the
 * pending edit immediately: the browser gives an in-flight request a
 * moment to complete after a tab is backgrounded, which is the closest
 * an authenticated JSON request gets to `sendBeacon`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { isApiError } from '@api';
import type { QuizAnswer, SaveQuizAnswersResponse } from '@types';
import { useSaveQuizAnswers } from '@features/learning';
import { deleteQuizJournal, saveQuizJournal } from '@services/offline';
import {
  AUTOSAVE_DEBOUNCE_MS,
  answersEqual,
  toAnswerMap,
} from '../utils/quiz-attempt.utils';

/** Consecutive stale answers rebased before the queue backs off instead. */
export const MAX_REBASES = 3;

/**
 * Merges the learner's unconfirmed edits onto the server's newer copy.
 *
 *   - a question the learner changed since `baseline` (the last answers the
 *     server confirmed from this queue) keeps the learner's answer —
 *     including a cleared one;
 *   - every other question takes the server's copy.
 *
 * Without a server copy (an older server), the learner's full set is kept.
 */
export function rebaseAnswers(
  server: readonly QuizAnswer[] | undefined,
  local: readonly QuizAnswer[],
  baseline: readonly QuizAnswer[]
): QuizAnswer[] {
  if (!server) return [...local];
  const serverMap = toAnswerMap(server);
  const localMap = toAnswerMap(local);
  const baseMap = toAnswerMap(baseline);
  const ids = new Set([
    ...local.map((a) => a.questionId),
    ...server.map((a) => a.questionId),
    ...baseline.map((a) => a.questionId),
  ]);
  const merged: QuizAnswer[] = [];
  for (const id of ids) {
    const edited = !answersEqual(localMap[id], baseMap[id]);
    const chosen = edited ? localMap[id] : serverMap[id];
    if (chosen) merged.push(chosen);
  }
  return merged;
}

export type AutosaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'offline';

/** Message keys the server uses to say "this attempt no longer accepts answers". */
const TERMINAL_MESSAGE_KEYS: ReadonlySet<string> = new Set([
  'errors.quiz.attemptExpired',
  'errors.quiz.attemptAlreadySubmitted',
  'errors.quiz.attemptInvalidated',
]);

const RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 20_000];

export interface UseQuizAutosaveOptions {
  readonly courseId: string;
  readonly quizId: string;
  readonly attemptId: string;
  /** The revision the server last confirmed (from the session). */
  readonly initialRevision: number;
  readonly enabled: boolean;
  /** The attempt is over on the server: caller moves to results. */
  readonly onTerminal?: (messageKey: string) => void;
  /** Every confirmed save, so the clock can re-sync from `serverNow`. */
  readonly onSaved?: (response: SaveQuizAnswersResponse) => void;
  /** The answers the server last confirmed (the session's), the rebase baseline. */
  readonly confirmedAnswers?: readonly QuizAnswer[];
  /** A stale save was rebased onto the server's copy: these answers are now being saved. */
  readonly onRebased?: (answers: readonly QuizAnswer[]) => void;
  /**
   * Journal edits on this device — UNTIMED attempts only (`timed: true`
   * refuses, by design).
   */
  readonly journal?: { readonly userId: string; readonly timed: boolean };
}

export interface UseQuizAutosaveResult {
  readonly state: AutosaveState;
  readonly lastSavedAt: string | null;
  /** Queue the current answers; debounced. */
  readonly schedule: (answers: readonly QuizAnswer[]) => void;
  /** Send whatever is pending now (used before submit and on hide). Resolves when nothing is pending. */
  readonly flush: () => Promise<void>;
  /** The revision the NEXT save will carry — submit sends it too. */
  readonly currentRevision: () => number;
}

export function useQuizAutosave({
  courseId,
  quizId,
  attemptId,
  initialRevision,
  enabled,
  onTerminal,
  onSaved,
  confirmedAnswers,
  onRebased,
  journal,
}: UseQuizAutosaveOptions): UseQuizAutosaveResult {
  const save = useSaveQuizAnswers(courseId, quizId);
  const saveRef = useRef(save);
  saveRef.current = save;

  const [state, setState] = useState<AutosaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const revisionRef = useRef(initialRevision);
  const pendingRef = useRef<readonly QuizAnswer[] | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const debounceRef = useRef<number | null>(null);
  const retryRef = useRef<number | null>(null);
  const failuresRef = useRef(0);
  const stoppedRef = useRef(false);
  const onTerminalRef = useRef(onTerminal);
  const onSavedRef = useRef(onSaved);
  const onRebasedRef = useRef(onRebased);
  const journalRef = useRef(journal);
  onTerminalRef.current = onTerminal;
  onSavedRef.current = onSaved;
  onRebasedRef.current = onRebased;
  journalRef.current = journal;
  const baselineRef = useRef<readonly QuizAnswer[]>(confirmedAnswers ?? []);
  const rebasesRef = useRef(0);

  useEffect(() => {
    revisionRef.current = initialRevision;
    stoppedRef.current = false;
    failuresRef.current = 0;
    rebasesRef.current = 0;
  }, [initialRevision, attemptId]);

  const clearTimers = () => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    if (retryRef.current !== null) window.clearTimeout(retryRef.current);
    debounceRef.current = null;
    retryRef.current = null;
  };

  const send = useCallback((): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current;
    const answers = pendingRef.current;
    if (!answers || stoppedRef.current) return Promise.resolve();
    pendingRef.current = null;
    const revision = revisionRef.current + 1;
    setState('saving');

    const run = (async () => {
      try {
        const response = await saveRef.current.mutateAsync({
          attemptId,
          payload: { revision, answers },
        });
        revisionRef.current = Math.max(revisionRef.current, response.revision);
        failuresRef.current = 0;
        if (response.applied === false) {
          // Stale: the server holds a newer copy. Rebase and send again —
          // the learner's answers are never dropped.
          rebasesRef.current += 1;
          const merged = rebaseAnswers(
            response.answers,
            pendingRef.current ?? answers,
            baselineRef.current
          );
          if (response.answers) baselineRef.current = response.answers;
          pendingRef.current = merged;
          onRebasedRef.current?.(merged);
          if (rebasesRef.current > MAX_REBASES) {
            throw new Error('quiz-autosave: rebase limit');
          }
          setState('dirty');
          return;
        }
        rebasesRef.current = 0;
        baselineRef.current = answers;
        setLastSavedAt(response.savedAt ?? new Date().toISOString());
        onSavedRef.current?.(response);
        setState(pendingRef.current ? 'dirty' : 'saved');
        const journalOptions = journalRef.current;
        if (!pendingRef.current && journalOptions && !journalOptions.timed) {
          void deleteQuizJournal(journalOptions.userId, attemptId);
        }
      } catch (error) {
        const key = isApiError(error) ? error.messageKey : '';
        if (isApiError(error) && TERMINAL_MESSAGE_KEYS.has(key)) {
          stoppedRef.current = true;
          pendingRef.current = null;
          setState('saved');
          onTerminalRef.current?.(key);
          return;
        }
        // Anything else is retried: keep the answers, back off, try again.
        pendingRef.current = pendingRef.current ?? answers;
        failuresRef.current += 1;
        setState('offline');
        const delay =
          RETRY_DELAYS_MS[
            Math.min(failuresRef.current - 1, RETRY_DELAYS_MS.length - 1)
          ];
        retryRef.current = window.setTimeout(() => {
          retryRef.current = null;
          void send();
        }, delay);
      } finally {
        inFlightRef.current = null;
        // An edit that landed during the request goes out right away.
        if (
          pendingRef.current &&
          !stoppedRef.current &&
          retryRef.current === null
        ) {
          void send();
        }
      }
    })();

    inFlightRef.current = run;
    return run;
  }, [attemptId]);

  const schedule = useCallback(
    (answers: readonly QuizAnswer[]) => {
      if (!enabled || stoppedRef.current) return;
      pendingRef.current = answers;
      setState('dirty');
      const journalOptions = journalRef.current;
      if (journalOptions && !journalOptions.timed) {
        void saveQuizJournal({
          userId: journalOptions.userId,
          attemptId,
          answers,
          baseRevision: revisionRef.current,
          timed: false,
        });
      }
      if (debounceRef.current !== null)
        window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = null;
        void send();
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [enabled, send, attemptId]
  );

  const flush = useCallback(async () => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (retryRef.current !== null) {
      window.clearTimeout(retryRef.current);
      retryRef.current = null;
    }
    await send();
    if (inFlightRef.current) await inFlightRef.current;
  }, [send]);

  // Flush on hide / unload so a closed tab loses nothing the learner typed.
  useEffect(() => {
    if (!enabled) return;
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onPageHide = () => void flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [enabled, flush]);

  useEffect(() => () => clearTimers(), []);

  const currentRevision = useCallback(() => revisionRef.current + 1, []);

  return { state, lastSavedAt, schedule, flush, currentRevision };
}
