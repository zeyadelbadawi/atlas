/**
 * useAttemptClock — the countdown for a timed attempt (P64 Phase 3, AD-8).
 *
 * The server's `serverNow` is captured the moment the session arrives and
 * turned into an offset against the local clock; every tick then reads
 * the local clock, applies the offset, and subtracts from `deadlineAt`.
 * A device with a wrong clock therefore still counts down what the
 * server will enforce. Nothing here decides that time is up — the
 * `onExpired` callback only tells the caller to ASK the server, which
 * either has already auto-submitted or will refuse the next save.
 *
 * Announcements (10 / 5 / 1 min, 30 s) fire once each through a
 * `crossedAnnouncement` comparison of consecutive ticks, so a throttled
 * background tab that skips seconds still announces the threshold it
 * crossed, and never twice.
 */
import { useEffect, useRef, useState } from 'react';
import {
  crossedAnnouncement,
  remainingSeconds,
  serverClockOffsetMs,
} from '../utils/quiz-attempt.utils';

export interface UseAttemptClockOptions {
  /** ISO server clock at the moment the session (or last save) arrived. */
  readonly serverNow: string | null;
  readonly deadlineAt: string | null;
  readonly enabled: boolean;
  /** Called once when the countdown reaches zero. */
  readonly onExpired?: () => void;
  /** Called once per crossed announcement threshold, with the seconds. */
  readonly onAnnounce?: (seconds: number) => void;
}

export interface UseAttemptClockResult {
  /** Seconds left as the server sees them, `null` when there is no deadline. */
  readonly remaining: number | null;
  readonly expired: boolean;
}

export function useAttemptClock({
  serverNow,
  deadlineAt,
  enabled,
  onExpired,
  onAnnounce,
}: UseAttemptClockOptions): UseAttemptClockResult {
  const offsetRef = useRef(0);
  const expiredRef = useRef(false);
  const previousRef = useRef<number | null>(null);
  const onExpiredRef = useRef(onExpired);
  const onAnnounceRef = useRef(onAnnounce);
  onExpiredRef.current = onExpired;
  onAnnounceRef.current = onAnnounce;

  const [remaining, setRemaining] = useState<number | null>(() =>
    deadlineAt && serverNow
      ? remainingSeconds(
          deadlineAt,
          Date.now(),
          serverClockOffsetMs(serverNow, Date.now())
        )
      : null
  );

  // Re-measure the offset whenever the server hands us a fresh clock.
  useEffect(() => {
    if (!serverNow) return;
    offsetRef.current = serverClockOffsetMs(serverNow, Date.now());
  }, [serverNow]);

  useEffect(() => {
    expiredRef.current = false;
    previousRef.current = null;
  }, [deadlineAt]);

  useEffect(() => {
    if (!enabled || !deadlineAt) {
      setRemaining(null);
      return;
    }

    const tick = () => {
      const next = remainingSeconds(deadlineAt, Date.now(), offsetRef.current);
      setRemaining(next);

      const crossed = crossedAnnouncement(previousRef.current, next);
      if (crossed !== null) onAnnounceRef.current?.(crossed);
      previousRef.current = next;

      if (next !== null && next <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpiredRef.current?.();
      }
    };

    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [enabled, deadlineAt]);

  return { remaining, expired: expiredRef.current };
}
