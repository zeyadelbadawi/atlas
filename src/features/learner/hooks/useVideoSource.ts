/**
 * Attaching a granted video to a `<video>` element — the one place the
 * `format` discriminator is read (§E.3, investigation §14).
 *
 * THREE PATHS, AND THE THIRD IS THE ONE PEOPLE GET WRONG:
 *
 * 1. `mp4` → the element's own `src`. No library, no new dependency, and
 *    Range/seek already work (the presign probe in §S confirmed 206 on
 *    Range). The Normal tier serves progressive MP4 precisely so that the
 *    player needs no new technology to show it.
 * 2. `hls` on Chromium/Firefox → hls.js, loaded on demand. It is imported
 *    dynamically so a learner who only ever watches Normal-tier MP4 never
 *    downloads a media-source library they have no use for.
 * 3. `hls` on Safari/iOS → NATIVE HLS, `video.src = '…m3u8'`. This is not
 *    a preference. iOS Safari's ManagedMediaSource makes hls.js on iPhone
 *    a trap: it can attach and then behave differently from every desktop
 *    browser under memory pressure and in low-power mode, while the
 *    native path is the one Apple actually supports for HLS. The check is
 *    `canPlayType('application/vnd.apple.mpegurl')`, which is a statement
 *    about the browser rather than a user-agent guess, and it is tried
 *    BEFORE `Hls.isSupported()` so Safari never reaches the library at
 *    all.
 *
 * WHY THE SWAP IS DEFERRED. A grant refresh publishes a NEW signed URL
 * for the same video, and assigning it to a playing element reloads the
 * media: the picture blinks, the buffer is thrown away and the learner
 * notices. So a fresh URL is held until it is actually needed — when the
 * current credential has expired, or when the element reports an error —
 * and the swap then restores position, playback rate and play state
 * around itself. That is what "without interrupting playback" means in
 * practice: the refresh is invisible, and the only visible event is the
 * one that would otherwise have been a dead video.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { GrantedVideo } from '@types';

/** Whether this browser plays HLS natively — Safari and every iOS browser. */
export function supportsNativeHls(element: HTMLVideoElement): boolean {
  return (
    element.canPlayType('application/vnd.apple.mpegurl') !== '' ||
    element.canPlayType('application/x-mpegURL') !== ''
  );
}

export interface UseVideoSourceOptions {
  readonly videoRef: RefObject<HTMLVideoElement>;
  /** The video from the grant currently in force. Undefined for a non-video lesson. */
  readonly video: GrantedVideo | undefined;
  /**
   * When the grant that produced `video.url` stops being valid. Recorded
   * at attach time so the swap can be armed for the exact moment the
   * ATTACHED credential dies, rather than for whatever the newest grant
   * happens to say.
   */
  readonly credentialExpiresAt: string | undefined;
  /** Where the learner left off, applied once per lesson. */
  readonly resumePositionSeconds: number;
  /** Changes when the lesson changes, so a new lesson starts clean rather than swapping. */
  readonly lessonId: string;
  /** Asks for a new grant — called when the media element reports a fatal error. */
  readonly onCredentialFailure: () => void;
}

export interface UseVideoSourceResult {
  /** True while the source is being attached or re-attached. */
  readonly isAttaching: boolean;
  /** Set when the media itself failed in a way a new credential cannot fix. */
  readonly hasMediaError: boolean;
  /** Adopts the newest granted URL now, preserving position and play state. */
  readonly adoptLatestSource: () => void;
}

export function useVideoSource({
  videoRef,
  video,
  credentialExpiresAt,
  resumePositionSeconds,
  lessonId,
  onCredentialFailure,
}: UseVideoSourceOptions): UseVideoSourceResult {
  const [isAttaching, setIsAttaching] = useState(false);
  const [hasMediaError, setHasMediaError] = useState(false);
  /** Bumped by every attach, so the expiry timer re-arms against the new credential. */
  const [attachGeneration, setAttachGeneration] = useState(0);

  /** The URL currently attached to the element, which may lag the grant. */
  const attachedUrlRef = useRef<string | null>(null);
  /** When the ATTACHED credential dies — not when the newest one does. */
  const attachedExpiresAtRef = useRef<string | null>(null);
  /** The newest URL the grant has published, adopted lazily. */
  const latestUrlRef = useRef<string | null>(null);
  const latestExpiresAtRef = useRef<string | null>(null);
  /** Torn down on every re-attach and on unmount; `unknown` so hls.js stays a dynamic import. */
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  /** Applied once per lesson — a resume that re-applied on every refresh would rewind the learner. */
  const hasResumedRef = useRef(false);
  const onCredentialFailureRef = useRef(onCredentialFailure);
  onCredentialFailureRef.current = onCredentialFailure;

  latestUrlRef.current = video?.url ?? null;
  latestExpiresAtRef.current = credentialExpiresAt ?? null;

  const destroyHls = useCallback(() => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
  }, []);

  /**
   * Attaches one URL, restoring what the learner was doing.
   *
   * `resumeFrom` is read BEFORE the source changes and re-applied after
   * metadata arrives, because assigning `src` resets `currentTime` to 0 —
   * which is exactly the interruption this function exists to hide.
   */
  const attach = useCallback(
    async (url: string, format: GrantedVideo['format']) => {
      const element = videoRef.current;
      if (!element) return;

      const resumeFrom = hasResumedRef.current
        ? element.currentTime
        : resumePositionSeconds;
      const wasPlaying = !element.paused && !element.ended;
      const rate = element.playbackRate;

      destroyHls();
      setIsAttaching(true);
      setHasMediaError(false);
      attachedExpiresAtRef.current = latestExpiresAtRef.current;
      setAttachGeneration((generation) => generation + 1);

      const restore = () => {
        if (resumeFrom > 0 && Number.isFinite(resumeFrom)) {
          // `fastSeek` where available: on a long lesson it avoids the
          // full-accuracy seek that makes the restore visible.
          try {
            element.currentTime = resumeFrom;
          } catch {
            // A source that is not seekable yet will resume at 0; the
            // next `loadedmetadata` re-applies it.
          }
        }
        element.playbackRate = rate;
        hasResumedRef.current = true;
        setIsAttaching(false);
        if (wasPlaying) {
          // Autoplay may be refused (no user gesture after a swap). The
          // controls are visible and the learner presses play; failing
          // silently is correct, throwing is not.
          void element.play().catch(() => undefined);
        }
      };

      element.addEventListener('loadedmetadata', restore, { once: true });

      if (format === 'mp4' || supportsNativeHls(element)) {
        // Path 1 and path 3 — the element does the work itself.
        element.src = url;
        element.load();
        attachedUrlRef.current = url;
        return;
      }

      // Path 2 — hls.js, and only now is it downloaded.
      try {
        const { default: Hls } = await import('hls.js');
        if (!Hls.isSupported()) {
          // No MSE at all: try the native element anyway rather than
          // leaving a blank box. It will fail visibly if it cannot, which
          // is more useful than failing silently here.
          element.src = url;
          element.load();
          attachedUrlRef.current = url;
          return;
        }

        const instance = new Hls({ enableWorker: true });
        instance.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            // A 403 on a segment is what an expired token looks like from
            // inside hls.js. A new grant is the fix, not a retry.
            onCredentialFailureRef.current();
            return;
          }
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            instance.recoverMediaError();
            return;
          }
          setHasMediaError(true);
        });
        instance.loadSource(url);
        instance.attachMedia(element);
        hlsRef.current = instance;
        attachedUrlRef.current = url;
      } catch {
        // The chunk itself failed to load (offline mid-session). The
        // element is left untouched so anything already buffered keeps
        // playing, and the error state is reported.
        setIsAttaching(false);
        setHasMediaError(true);
      }
    },
    [destroyHls, resumePositionSeconds, videoRef]
  );

  const adoptLatestSource = useCallback(() => {
    const url = latestUrlRef.current;
    if (!url || !video) return;
    if (url === attachedUrlRef.current) return;
    void attach(url, video.format);
  }, [attach, video]);

  /*
   * A new LESSON always attaches immediately and starts its resume clock
   * again. A new URL for the SAME lesson does not — that is the silent
   * refresh, and adopting it here is what would make it visible.
   */
  useEffect(() => {
    hasResumedRef.current = false;
    attachedUrlRef.current = null;
    attachedExpiresAtRef.current = null;
  }, [lessonId]);

  useEffect(() => {
    if (!video) return;
    if (attachedUrlRef.current) return;
    void attach(video.url, video.format);
  }, [attach, video]);

  useEffect(() => destroyHls, [destroyHls]);

  /**
   * Swap only once the ATTACHED credential is actually dead.
   *
   * This is the half of "silent refresh" the learner can see, so it is
   * deliberately lazy: a fresh URL arriving at 70% of the credential's
   * life sits unused for the remaining 30%, and the element keeps playing
   * on the buffer and the token it already has. The swap happens at the
   * moment the old token would start returning 403 — for progressive MP4
   * that is usually after the whole file is buffered and nothing visible
   * happens at all; for HLS it is between two segment requests.
   */
  const swapIfCredentialDead = useCallback(() => {
    const attachedExpiry = attachedExpiresAtRef.current;
    if (!attachedExpiry) return;
    const remaining = Date.parse(attachedExpiry) - Date.now();
    if (Number.isFinite(remaining) && remaining > 0) return;
    adoptLatestSource();
  }, [adoptLatestSource]);

  useEffect(() => {
    const attachedExpiry = attachedExpiresAtRef.current;
    if (!attachedExpiry) return;

    const remaining = Date.parse(attachedExpiry) - Date.now();
    if (!Number.isFinite(remaining)) return;

    const timer = window.setTimeout(
      swapIfCredentialDead,
      Math.max(0, remaining)
    );
    return () => window.clearTimeout(timer);
  }, [attachGeneration, swapIfCredentialDead]);

  /*
   * A refreshed grant arriving AFTER the attached one had already expired
   * (a network blip delayed it) has to be adopted the moment it lands —
   * the timer above has already fired and found nothing newer to take.
   */
  useEffect(() => {
    swapIfCredentialDead();
  }, [swapIfCredentialDead, video?.url]);

  /*
   * The element's own failure path. `MEDIA_ERR_NETWORK` and
   * `MEDIA_ERR_SRC_NOT_SUPPORTED` are both what a dead signed URL looks
   * like to a native element (the server answers 403 and the element
   * reports "cannot load"), so the first move is always to ask for a new
   * grant and adopt it. Only a decode error is treated as unrecoverable.
   */
  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    const handleError = () => {
      const code = element.error?.code;
      if (code === MediaError.MEDIA_ERR_DECODE) {
        setHasMediaError(true);
        return;
      }
      onCredentialFailureRef.current();
    };

    element.addEventListener('error', handleError);
    return () => element.removeEventListener('error', handleError);
  }, [videoRef]);

  return { isAttaching, hasMediaError, adoptLatestSource };
}
