/**
 * useQuizIntegrity — the honest integrity layer (P64 Phase 3, AD-9).
 *
 * WHAT IT DOES: attaches listeners for the events the quiz author chose to
 * record (tab hidden/visible, window blur/focus, fullscreen exit/enter,
 * copy/cut/paste/context menu on the attempt, printing), batches them,
 * and sends them with client timestamps. The SERVER decides what counts
 * (warm-up, debounce, sub-second visibility) and answers with the action
 * the attempt now needs. This hook does not count violations itself and
 * never prevents anything — the copy says "recorded", because that is
 * all that happens.
 *
 * WHAT IT DOES NOT DO: block copying, keyboard shortcuts or leaving the
 * page. In `strict` mode the server auto-submits at the threshold and
 * says so in its response; the caller then shows the results with the
 * reason. Full screen itself is `useQuizFullscreen`'s (the request must
 * come from a click); this hook only records entering, leaving, and the
 * browser being unable to (`fullscreen_unavailable`).
 *
 * Mode `off` attaches nothing at all.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  QuizAttemptEventInput,
  QuizAttemptEventType,
  QuizAttemptSettings,
  RecordQuizAttemptEventsResponse,
} from '@types';
import { useRecordQuizAttemptEvents } from '@features/learning';
import {
  INTEGRITY_FLUSH_INTERVAL_MS,
  INTEGRITY_HEARTBEAT_MS,
  integrityActive,
} from '../utils/quiz-attempt.utils';

/** Mirrors the server's batch cap (`MAX_EVENTS_PER_BATCH`). */
const MAX_BATCH = 50;

export interface UseQuizIntegrityOptions {
  readonly courseId: string;
  readonly quizId: string;
  readonly attemptId: string;
  readonly settings: QuizAttemptSettings | undefined;
  readonly enabled: boolean;
  /** The element whose copy/paste/context-menu events are recorded. */
  readonly containerRef: React.RefObject<HTMLElement>;
  /** The server says the learner must be warned (warn / strict). */
  readonly onWarn?: (violations: number, max: number) => void;
  /** The server auto-submitted the attempt because the limit was reached. */
  readonly onAutoSubmitted?: () => void;
}

export interface UseQuizIntegrityResult {
  readonly violationCount: number;
  readonly maxViolations: number;
  /** Record that the learner dismissed a warning (the reviewer sees the acknowledgement). */
  readonly acknowledgeWarning: () => void;
  /** Record that the browser could not go full screen (context for the reviewer; never a violation). */
  readonly recordFullscreenUnavailable: (
    reason: 'unsupported' | 'refused'
  ) => void;
}

export function useQuizIntegrity({
  courseId,
  quizId,
  attemptId,
  settings,
  enabled,
  containerRef,
  onWarn,
  onAutoSubmitted,
}: UseQuizIntegrityOptions): UseQuizIntegrityResult {
  const record = useRecordQuizAttemptEvents(courseId, quizId);
  const recordRef = useRef(record);
  recordRef.current = record;
  const onWarnRef = useRef(onWarn);
  const onAutoSubmittedRef = useRef(onAutoSubmitted);
  onWarnRef.current = onWarn;
  onAutoSubmittedRef.current = onAutoSubmitted;

  const queueRef = useRef<QuizAttemptEventInput[]>([]);
  const flushingRef = useRef(false);
  const stoppedRef = useRef(false);
  const [violationCount, setViolationCount] = useState(0);
  const [maxViolations, setMaxViolations] = useState(
    settings?.maxViolations ?? 0
  );

  const active = enabled && !!settings && integrityActive(settings);

  useEffect(() => {
    if (settings) setMaxViolations(settings.maxViolations);
  }, [settings]);

  const handleResponse = useCallback(
    (response: RecordQuizAttemptEventsResponse) => {
      setViolationCount(response.violationCount);
      setMaxViolations(response.maxViolations);
      if (response.action === 'auto_submit') {
        stoppedRef.current = true;
        onAutoSubmittedRef.current?.();
      } else if (response.action === 'warn') {
        onWarnRef.current?.(response.violationCount, response.maxViolations);
      }
    },
    []
  );

  const flush = useCallback(async () => {
    if (flushingRef.current || stoppedRef.current) return;
    if (queueRef.current.length === 0) return;
    const events = queueRef.current.splice(0, MAX_BATCH);
    flushingRef.current = true;
    try {
      const response = await recordRef.current.mutateAsync({
        attemptId,
        payload: { events },
      });
      handleResponse(response);
    } catch {
      // Events are evidence, not answers: a lost batch is not retried
      // forever. Keep them for the next flush once, then let go.
      if (queueRef.current.length < MAX_BATCH) {
        queueRef.current.unshift(...events);
      }
    } finally {
      flushingRef.current = false;
    }
  }, [attemptId, handleResponse]);

  const push = useCallback(
    (type: QuizAttemptEventType, payload?: Record<string, unknown>) => {
      if (!active || stoppedRef.current) return;
      queueRef.current.push({
        type,
        clientAt: new Date().toISOString(),
        ...(payload ? { payload } : {}),
      });
      // Hidden tabs are throttled; send at once so the timestamp is honest.
      if (
        type === 'visibility_hidden' ||
        type === 'fullscreen_exit' ||
        type === 'print'
      ) {
        void flush();
      }
    },
    [active, flush]
  );

  // Listeners.
  useEffect(() => {
    if (!active) return;
    stoppedRef.current = false;

    const onVisibility = () =>
      push(
        document.visibilityState === 'hidden'
          ? 'visibility_hidden'
          : 'visibility_visible'
      );
    const onBlur = () => push('blur');
    const onFocus = () => push('focus');
    const onFullscreen = () =>
      push(document.fullscreenElement ? 'fullscreen_enter' : 'fullscreen_exit');
    // Full screen is usually entered by the Start click, before this
    // listener exists: record the state the attempt opened in.
    if (document.fullscreenElement) push('fullscreen_enter');
    const onBeforePrint = () => push('print');
    const onClipboard = (event: ClipboardEvent) =>
      push(event.type as 'copy' | 'cut' | 'paste');
    const onContextMenu = () => push('contextmenu');

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('fullscreenchange', onFullscreen);
    window.addEventListener('beforeprint', onBeforePrint);
    const container = containerRef.current;
    container?.addEventListener('copy', onClipboard);
    container?.addEventListener('cut', onClipboard);
    container?.addEventListener('paste', onClipboard);
    container?.addEventListener('contextmenu', onContextMenu);

    const flushTimer = window.setInterval(
      () => void flush(),
      INTEGRITY_FLUSH_INTERVAL_MS
    );
    const heartbeatTimer = window.setInterval(
      () => push('heartbeat'),
      INTEGRITY_HEARTBEAT_MS
    );

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('fullscreenchange', onFullscreen);
      window.removeEventListener('beforeprint', onBeforePrint);
      container?.removeEventListener('copy', onClipboard);
      container?.removeEventListener('cut', onClipboard);
      container?.removeEventListener('paste', onClipboard);
      container?.removeEventListener('contextmenu', onContextMenu);
      window.clearInterval(flushTimer);
      window.clearInterval(heartbeatTimer);
      void flush();
    };
  }, [active, containerRef, push, flush]);

  const acknowledgeWarning = useCallback(() => {
    push('warning_acknowledged');
    void flush();
  }, [push, flush]);

  const recordFullscreenUnavailable = useCallback(
    (reason: 'unsupported' | 'refused') => {
      push('fullscreen_unavailable', { reason });
      void flush();
    },
    [push, flush]
  );

  return {
    violationCount,
    maxViolations,
    acknowledgeWarning,
    recordFullscreenUnavailable,
  };
}
