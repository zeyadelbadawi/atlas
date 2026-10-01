/**
 * The grant consumer, with SILENT REFRESH (§E.3).
 *
 * THIS IS MANDATORY, NOT AN OPTIMISATION, and the reason is arithmetic
 * rather than polish: a Normal-tier credential lives ten minutes and a
 * lesson can easily run forty. A player that fetches one grant and keeps
 * playing is a player that dies four times during a single video, on
 * every learner, every time. §I states the lifetimes; §L makes the
 * refresh part of the API contract for exactly this reason.
 *
 * WHAT "SILENT" MEANS HERE. The refresh is a background refetch of a
 * query that already has data, so React Query keeps serving the old grant
 * until the new one lands — no loading state, no unmount, no remount of
 * the `<video>` element, nothing the learner can see. The MEDIA side of
 * silence is the video adapter's job, not this hook's: this hook only
 * publishes a new URL, and `ProtectedVideoPlayer` decides when to adopt
 * it (see its own doc comment — it waits until the old credential is
 * actually dead, then restores position, rate and play state around the
 * swap).
 *
 * WHEN IT REFRESHES. At 70% of the credential's REAL remaining life, from
 * `expiresAt` — never from a constant, because the two tiers differ by
 * more than an order of magnitude and finding D-3 exists precisely
 * because someone once used an optimistic figure instead of the real one.
 * Clamped at both ends: never sooner than ten seconds (a clock skew
 * making the grant look nearly dead must not become a request loop), and
 * never later than a minute before expiry (the request itself has to fit
 * in the remaining window).
 *
 * WHY THE GRANT IS NEVER CACHED. It is served `Cache-Control: private,
 * no-store` and it contains live credentials; `gcTime: 0` means the
 * moment the player unmounts, nothing anywhere in the app still holds a
 * copy that a second mount could be answered from.
 *
 * WHAT A FAILED REFRESH DOES. It depends entirely on WHY, and the split
 * is the point: a network blip must not interrupt a video that is already
 * buffered, while a revoked enrolment must stop playback immediately —
 * continuing to serve content after access ended is the thing §I exists
 * to prevent. `isAccessRevokedFailure` draws that line once.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApiQuery, useAuth } from '@hooks';
import { learnerKeys } from '@services/query';
import type { LessonContentGrant } from '@types';
import type { ApiError } from '@api';
import { lessonContentService } from '../services/LessonContentService';
import {
  classifyPlayerFailure,
  isAccessRevokedFailure,
  type PlayerFailure,
} from '../utils/player-failure.utils';

/** Refresh once this much of the credential's life has been used. */
const REFRESH_AT_FRACTION = 0.7;
/** Never schedule a refresh sooner than this — clock skew must not become a loop. */
const MIN_REFRESH_DELAY_MS = 10_000;
/** Always leave at least this much of the window for the request itself. */
const REFRESH_SAFETY_MARGIN_MS = 60_000;

/**
 * When to ask for the next grant, in milliseconds from now.
 *
 * Exported so the arithmetic can be asserted directly: every input here
 * is a clock, and a bug in it is invisible until a real forty-minute
 * lesson is played end to end by a real learner.
 */
export function grantRefreshDelayMs(
  expiresAt: string | undefined,
  now: number = Date.now()
): number | false {
  if (!expiresAt) return false;
  const expiry = Date.parse(expiresAt);
  if (!Number.isFinite(expiry)) return false;

  const remaining = expiry - now;
  // Already dead (or as good as): ask again immediately rather than
  // waiting out a negative interval, which React Query would reject.
  if (remaining <= MIN_REFRESH_DELAY_MS) return MIN_REFRESH_DELAY_MS;

  const atFraction = remaining * REFRESH_AT_FRACTION;
  const latest = remaining - REFRESH_SAFETY_MARGIN_MS;
  return Math.max(MIN_REFRESH_DELAY_MS, Math.min(atFraction, latest));
}

export interface UseLessonGrantOptions {
  readonly enabled?: boolean;
  /**
   * Whether the curriculum lists this item as reachable right now. Used
   * only to tell "still processing" apart from the server's deliberately
   * ambiguous 404 — see `player-failure.utils.ts`.
   */
  readonly sequenceSaysAvailable?: boolean;
}

export interface UseLessonGrantResult {
  /** The grant currently in force. Undefined until the first one lands. */
  readonly grant: LessonContentGrant | undefined;
  /** First load only. A silent refresh never sets this. */
  readonly isLoading: boolean;
  /** A refresh is in flight. Nothing on screen should change because of it. */
  readonly isRefreshing: boolean;
  /**
   * The state the player must render INSTEAD of content. Null while the
   * lesson is playable — including while a transient refresh failure is
   * being retried behind a perfectly good video.
   */
  readonly failure: PlayerFailure | null;
  /** True when a refresh failed transiently and the grant on screen is living on borrowed time. */
  readonly isRefreshFailing: boolean;
  /** Forces a new grant now — used when the media element reports an error. */
  readonly refresh: () => void;
}

export function useLessonGrant(
  courseId: string,
  lessonId: string,
  options?: UseLessonGrantOptions
): UseLessonGrantResult {
  const { enabled = true, sequenceSaysAvailable } = options ?? {};
  const { user } = useAuth();

  const query = useApiQuery<LessonContentGrant, ApiError>({
    queryKey: learnerKeys.lessonGrant(user?.id, courseId, lessonId),
    queryFn: () => lessonContentService.getGrant(courseId, lessonId),
    enabled: enabled && !!courseId && !!lessonId,
    // Never cached, never reused — see this file's doc comment.
    gcTime: 0,
    staleTime: 0,
    // The app-wide default keeps the PREVIOUS key's data on screen while a
    // new one loads, which is right for a paginated table and wrong here:
    // it would show lesson 2's video for a beat after the learner opened
    // lesson 3. Guarded again below, because a default that returns can
    // only be trusted once.
    placeholderData: undefined,
    refetchInterval: (currentQuery) =>
      grantRefreshDelayMs(currentQuery.state.data?.expiresAt),
    // A learner who switches tabs is still listening. Letting the interval
    // stop in a background tab is how the credential dies while the audio
    // is playing.
    refetchIntervalInBackground: true,
  });

  const { data, error, isFetching, isPending, refetch } = query;

  /*
   * Only ever a grant for THE lesson being asked about. React Query is
   * told not to carry placeholder data across keys, and this is the belt
   * to that braces: a grant is a credential, and rendering one lesson's
   * credential on another lesson's screen is not a cosmetic bug.
   */
  const grant = useMemo(
    () =>
      data && data.lessonId === lessonId && data.courseId === courseId
        ? data
        : undefined,
    [data, lessonId, courseId]
  );

  /*
   * Expiry is a deadline, not a state change, so nothing re-renders when
   * it passes unless something schedules that. One timer per grant, armed
   * for the exact moment the credential dies — cheaper and more accurate
   * than polling, and it disarms itself when a refresh replaces the grant.
   */
  const [hasExpired, setHasExpired] = useState(false);
  const expiresAt = grant?.expiresAt;

  useEffect(() => {
    setHasExpired(false);
    if (!expiresAt) return;

    const remaining = Date.parse(expiresAt) - Date.now();
    if (!Number.isFinite(remaining)) return;
    if (remaining <= 0) {
      setHasExpired(true);
      return;
    }

    const timer = window.setTimeout(() => setHasExpired(true), remaining);
    return () => window.clearTimeout(timer);
  }, [expiresAt]);

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const classified = useMemo(
    () => (error ? classifyPlayerFailure(error, { sequenceSaysAvailable }) : null),
    [error, sequenceSaysAvailable]
  );

  /*
   * The rule the whole hook exists to state once:
   *
   * - no grant at all → whatever went wrong is what the learner sees;
   * - a grant, and access has been REVOKED → stop, regardless of what is
   *   buffered, because the enrolment is gone;
   * - a grant, and the credential has expired with no replacement → stop,
   *   because every further byte would 403 anyway and "nothing happens
   *   when I press play" is the worst possible way to say so;
   * - a grant, and a transient failure → say nothing. The video is
   *   playing, the retry is already scheduled, and an error banner over a
   *   working lesson is noise that teaches learners to ignore banners.
   */
  const failure = useMemo<PlayerFailure | null>(() => {
    if (!grant) return classified;
    if (classified && isAccessRevokedFailure(classified.kind)) return classified;
    if (hasExpired && !isFetching) return { kind: 'expired' };
    return null;
  }, [grant, classified, hasExpired, isFetching]);

  return {
    grant,
    isLoading: isPending && !!enabled,
    isRefreshing: isFetching && !isPending,
    failure,
    isRefreshFailing: !!grant && !!classified && !failure,
    refresh,
  };
}
