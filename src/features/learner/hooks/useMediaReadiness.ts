/**
 * Whether a `<video>` is loading, buffering, ready or failed — read from
 * the element's own events, never guessed from a timer (Task D).
 *
 * THE SIGNALS, AND WHY EACH:
 *  - `loadstart` / `emptied`: a source is being (re)loaded → loading.
 *  - `loadeddata`, `canplay`, `canplaythrough`, `playing`: there is a
 *    frame to show / playback can proceed → ready.
 *  - `suspend` while nothing is buffered yet: the browser has DELIBERATELY
 *    stopped fetching until the learner presses play (`preload="metadata"`,
 *    and iOS Safari, which preloads nothing at all). There is nothing left
 *    to wait for, so the poster and controls are shown → ready. Without
 *    this an iPhone learner saw a spinner over the play button forever.
 *  - `waiting`: playback stalled for data → buffering, until `playing`.
 *  - `error` (and the source hook's own fatal hls.js errors) → error.
 *
 * The one timer here never decides readiness: it only notices that a load
 * or buffer has made no network `progress` for a while, so the learner is
 * told it is slow and offered Retry instead of an endless spinner.
 */
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

export type MediaPhase = 'loading' | 'buffering' | 'ready' | 'error';

export interface MediaReadiness {
  readonly phase: MediaPhase;
  /** Loading or buffering has made no network progress for `slowAfterMs`. */
  readonly slow: boolean;
}

/** `HTMLMediaElement.HAVE_CURRENT_DATA` — a frame is available. */
const HAVE_CURRENT_DATA = 2;

export interface UseMediaReadinessOptions {
  /** Changes whenever a different source is attached (resets to loading). */
  readonly sourceKey: string | undefined;
  /** A failure the element itself does not report (a fatal hls.js error). */
  readonly externalError?: boolean;
  /** How long without network progress counts as slow. */
  readonly slowAfterMs?: number;
}

export function useMediaReadiness(
  videoRef: RefObject<HTMLVideoElement>,
  {
    sourceKey,
    externalError = false,
    slowAfterMs = 15_000,
  }: UseMediaReadinessOptions
): MediaReadiness {
  const [phase, setPhase] = useState<MediaPhase>('loading');
  const [slow, setSlow] = useState(false);
  const phaseRef = useRef<MediaPhase>('loading');

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    let slowTimer: number | undefined;
    const armSlowTimer = () => {
      window.clearTimeout(slowTimer);
      setSlow(false);
      slowTimer = window.setTimeout(() => {
        if (phaseRef.current === 'loading' || phaseRef.current === 'buffering')
          setSlow(true);
      }, slowAfterMs);
    };
    const set = (next: MediaPhase) => {
      phaseRef.current = next;
      setPhase(next);
      if (next === 'loading' || next === 'buffering') armSlowTimer();
      else {
        window.clearTimeout(slowTimer);
        setSlow(false);
      }
    };

    // A source may already be attached and loaded by the time this runs.
    set(element.readyState >= HAVE_CURRENT_DATA ? 'ready' : 'loading');

    const onLoading = () => set('loading');
    const onReady = () => set('ready');
    const onWaiting = () => set('buffering');
    const onSuspend = () => {
      // Deliberately idle before anything is buffered: waiting for a tap.
      if (phaseRef.current === 'loading') set('ready');
    };
    const onPause = () => {
      // Paused while buffering: nothing is being waited for any more.
      if (phaseRef.current === 'buffering') set('ready');
    };
    const onProgress = () => {
      if (phaseRef.current === 'loading' || phaseRef.current === 'buffering')
        armSlowTimer();
    };
    const onError = () => set('error');

    const listeners: [string, () => void][] = [
      ['loadstart', onLoading],
      ['emptied', onLoading],
      ['loadeddata', onReady],
      ['canplay', onReady],
      ['canplaythrough', onReady],
      ['playing', onReady],
      ['suspend', onSuspend],
      ['waiting', onWaiting],
      ['pause', onPause],
      ['progress', onProgress],
      ['error', onError],
    ];
    for (const [type, handler] of listeners)
      element.addEventListener(type, handler);
    return () => {
      window.clearTimeout(slowTimer);
      for (const [type, handler] of listeners)
        element.removeEventListener(type, handler);
    };
  }, [videoRef, sourceKey, slowAfterMs]);

  return externalError ? { phase: 'error', slow: false } : { phase, slow };
}
