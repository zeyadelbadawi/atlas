/**
 * The playback heartbeat, and the lease it keeps alive (§D.6, §D.7, §E.4).
 *
 * WHAT IT SENDS. The learner's position, and the lease id, every
 * `heartbeatSeconds` (20, against a 60-second lease TTL — two missed
 * beats before another device can claim it). Position is the ONLY number
 * this hook is allowed to report: the server derives watched time from
 * the deltas it observes between beats, because a client-reported
 * "watched" figure would make the watched-ratio completion rule
 * decorative, which is the whole reason §D.6 records evidence server-side
 * at all.
 *
 * WHAT IT LISTENS FOR. `leaseHeld: false` — another device took over.
 * The player PAUSES and says so, and it does not lose a second of
 * progress: everything up to the last successful beat is already recorded
 * server-side, and the position the learner stopped at is what the next
 * grant will resume from. §E.4's requirement is "lease-lost pause state
 * (no progress loss)", and the no-progress-loss half is a consequence of
 * the evidence living on the server, not of anything this hook saves.
 *
 * WHY IT BEATS WHILE PAUSED TOO. The lease is a CONCURRENT-SESSION limit,
 * not a watching meter. A learner who pauses to take notes for two
 * minutes has not stopped learning on this device, and letting the lease
 * lapse would let their own phone in a pocket claim it and then tell them
 * they are "learning on another device". The server ignores a delta of
 * zero, so a paused beat costs nothing but the lease.
 *
 * WHY THE POSITION ARRIVES THROUGH A REF. The media element's
 * `currentTime` changes several times a second. Passing it as a prop
 * would re-render the whole player on every tick and re-arm this
 * interval with it; a getter read at beat time asks the element once
 * every twenty seconds instead.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlaybackHeartbeatResponse, PlaybackLease } from '@types';
import { lessonContentService } from '../services/LessonContentService';

export interface UsePlaybackHeartbeatOptions {
  readonly courseId: string;
  readonly lessonId: string;
  /** Null when the grant carried no lease — a preview, or an unavailable lease store. */
  readonly lease: PlaybackLease | null;
  /** Read at beat time, never watched. Returns whole seconds. */
  readonly getPositionSeconds: () => number;
  /** Nothing is sent while this is false (the lesson is not playable yet). */
  readonly enabled?: boolean;
}

export interface UsePlaybackHeartbeatResult {
  /**
   * False once another device has taken the lease. Latched: the player
   * must stay paused until the learner decides what to do, rather than
   * flickering back if a later beat happens to succeed.
   */
  readonly leaseHeld: boolean;
  /** The server's answer to "may this lesson be completed yet?" — never computed here. */
  readonly completionEligible: boolean;
  readonly maxWatchedRatio: number;
  /** Sends one beat now — used at pause, at seek and before unmount. */
  readonly beat: () => Promise<void>;
  /** Hands the lease back immediately, so another device need not wait out the TTL. */
  readonly release: () => Promise<void>;
}

/** Fallback cadence when a grant carries no lease to read one from. */
const DEFAULT_HEARTBEAT_SECONDS = 20;

export function usePlaybackHeartbeat({
  courseId,
  lessonId,
  lease,
  getPositionSeconds,
  enabled = true,
}: UsePlaybackHeartbeatOptions): UsePlaybackHeartbeatResult {
  const [leaseHeld, setLeaseHeld] = useState(true);
  const [completionEligible, setCompletionEligible] = useState(false);
  const [maxWatchedRatio, setMaxWatchedRatio] = useState(0);

  const positionRef = useRef(getPositionSeconds);
  positionRef.current = getPositionSeconds;

  // Read inside the beat rather than captured in its closure, so a lease
  // refreshed by a takeover is used by the very next beat.
  const leaseRef = useRef(lease);
  leaseRef.current = lease;

  const isActiveRef = useRef(true);

  const apply = useCallback((response: PlaybackHeartbeatResponse) => {
    if (!isActiveRef.current) return;
    setCompletionEligible(response.completionEligible);
    setMaxWatchedRatio(response.maxWatchedRatio);
    // Latched deliberately — see `leaseHeld` above.
    if (!response.leaseHeld) setLeaseHeld(false);
  }, []);

  const beat = useCallback(async () => {
    const position = Math.max(0, Math.floor(positionRef.current()));
    const currentLease = leaseRef.current;
    try {
      const response = await lessonContentService.recordHeartbeat(courseId, {
        lessonId,
        positionSeconds: position,
        ...(currentLease ? { leaseId: currentLease.leaseId } : {}),
      });
      apply(response);
    } catch {
      /*
       * A failed beat is not a failed lesson. The lease outlives two
       * misses, the position will be re-sent by the next beat, and
       * turning a dropped request into an interruption would punish
       * exactly the learners on the worst connections. Deliberately
       * silent: the grant refresh in `useLessonGrant` is what notices
       * when access has genuinely gone.
       */
    }
  }, [apply, courseId, lessonId]);

  const release = useCallback(async () => {
    const currentLease = leaseRef.current;
    if (!currentLease) return;
    try {
      await lessonContentService.releaseLease(courseId, {
        leaseId: currentLease.leaseId,
      });
    } catch {
      // Best-effort by design: the lease expires on its own in 60
      // seconds, which is what makes a crashed browser recoverable.
    }
  }, [courseId]);

  // A new lesson is a new lease; anything latched about the old one goes.
  useEffect(() => {
    setLeaseHeld(true);
    setCompletionEligible(false);
    setMaxWatchedRatio(0);
  }, [lessonId]);

  useEffect(() => {
    isActiveRef.current = true;
    return () => {
      isActiveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !leaseHeld) return;

    const seconds = lease?.heartbeatSeconds ?? DEFAULT_HEARTBEAT_SECONDS;
    const interval = window.setInterval(
      () => void beat(),
      Math.max(5, seconds) * 1000
    );
    return () => window.clearInterval(interval);
  }, [beat, enabled, lease?.heartbeatSeconds, leaseHeld]);

  /*
   * One last beat and a lease hand-back when the player closes, so the
   * learner's own next device does not wait out a TTL to be told it may
   * start. Fires on unmount only — `pagehide` would double it on a normal
   * navigation, and a beat lost to a hard tab close costs at most the
   * seconds since the last one.
   */
  useEffect(() => {
    if (!enabled) return;
    return () => {
      void beat().then(() => release());
    };
  }, [beat, enabled, release]);

  return { leaseHeld, completionEligible, maxWatchedRatio, beat, release };
}
