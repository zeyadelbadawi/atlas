/**
 * The protected video surface (§E.3).
 *
 * ONE `<video>` ELEMENT, THREE DELIVERY PATHS. Which one is used is
 * decided entirely by `grant.video.format` and by what the browser can
 * actually do — see `useVideoSource`, which owns that decision and the
 * silent credential swap. Nothing in this file branches on a tier name, a
 * provider name, or a user agent.
 *
 * THE DETERRENTS ARE DETERRENTS. `controlsList="nodownload"`, no
 * picture-in-picture and a suppressed context menu raise the effort of
 * casual copying and nothing more: the manifest and segment URLs are
 * visible in devtools by construction, and `ffmpeg` forges `Origin`,
 * `Referer` and `User-Agent` freely. They are applied because they are
 * cheap and they help against the realistic case (a learner right-clicking
 * "Save video as"), and they are described as such everywhere the product
 * mentions them — never as "download protection".
 *
 * WHY THEY ARE NOT READ FROM A SETTING HERE. The per-academy
 * content-protection flags (`disableDownload`, `disablePip`,
 * `disableContextMenu`) are an OWNER-only settings object — the learner
 * grant deliberately does not carry them, and the endpoint that does is
 * behind the management guard stack. So this player applies the platform
 * DEFAULTS, which the backend itself documents as "the stronger setting":
 * a missing or malformed settings blob resolves to full protection, never
 * to none, because the failure mode has to be "more protected than the
 * owner asked for". The one protection setting that IS learner-visible —
 * the watermark — arrives on the grant as `watermark.enabled`, and is
 * honoured exactly as sent.
 *
 * CAPTIONS come from the lesson's own resources, matched by file
 * extension, because the grant has no dedicated captions field: a
 * resource ending in `.vtt` is a caption track and is attached as one.
 * That is a real feature built from a real signal, not an invented API —
 * and when there is no such resource, no `<track>` is rendered rather
 * than an empty one that would make the browser show a useless
 * "subtitles off" control.
 *
 * KEYBOARD SHORTCUTS are attached to the media container, not to the
 * document: a learner typing a note elsewhere on the page must not seek
 * the video, and the container carries its own `tabIndex` and an
 * `aria-keyshortcuts` list so the bindings are discoverable rather than
 * folklore.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@utils';
import type { GrantedResource, GrantedVideo } from '@types';
import { useVideoSource } from '../hooks/useVideoSource';
import { WatermarkOverlay } from './WatermarkOverlay';

/** Seek step for the arrow keys, in seconds. The convention every video UI uses. */
const ARROW_SEEK_SECONDS = 5;
/** Seek step for J/L, in seconds. */
const JUMP_SEEK_SECONDS = 10;

/** The rates offered. Bounded deliberately: beyond 2× speech stops being intelligible. */
const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

/** A resource that is a caption track rather than a download. */
function findCaptionTrack(
  resources: readonly GrantedResource[]
): GrantedResource | undefined {
  return resources.find(
    (resource) =>
      !!resource.url && /\.vtt(\?|$)/i.test(resource.url.split('#')[0] ?? '')
  );
}

export interface ProtectedVideoPlayerProps {
  readonly video: GrantedVideo;
  /** The grant's own expiry — the credential clock, not a guess. */
  readonly expiresAt: string;
  readonly resumePositionSeconds: number;
  readonly lessonId: string;
  readonly title: string;
  /** Server-composed, per-viewer. Empty string means the academy turned it off. */
  readonly watermarkText: string;
  readonly resources: readonly GrantedResource[];
  /** Asks `useLessonGrant` for a new credential — the element reported one is dead. */
  readonly onCredentialFailure: () => void;
  /** Receives a getter for the current position, for the playback heartbeat. */
  readonly onPositionSource?: (getPosition: () => number) => void;
  /**
   * The media reached its end.
   *
   * Attached to the `<video>` itself rather than to a wrapper, because
   * `ended` does not bubble: a handler on an ancestor never fires, which
   * is a silent failure that looks exactly like auto-advance being off.
   */
  readonly onEnded?: () => void;
  /** Pauses playback from outside — the lease was lost, or access ended. */
  readonly paused?: boolean;
}

export function ProtectedVideoPlayer({
  video,
  expiresAt,
  resumePositionSeconds,
  lessonId,
  title,
  watermarkText,
  resources,
  onCredentialFailure,
  onPositionSource,
  onEnded,
  paused,
}: ProtectedVideoPlayerProps): JSX.Element {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  const { isAttaching, hasMediaError } = useVideoSource({
    videoRef,
    video,
    credentialExpiresAt: expiresAt,
    resumePositionSeconds,
    lessonId,
    onCredentialFailure,
  });

  const captions = findCaptionTrack(resources);

  /*
   * The heartbeat reads position through this getter rather than through
   * a prop: `currentTime` changes several times a second and a prop would
   * re-render the whole player on every tick.
   */
  useEffect(() => {
    onPositionSource?.(() => videoRef.current?.currentTime ?? 0);
  }, [onPositionSource]);

  /* An external pause (lease lost, access ended) must actually stop the media. */
  useEffect(() => {
    if (paused) videoRef.current?.pause();
  }, [paused]);

  useEffect(() => {
    const element = videoRef.current;
    if (element) element.playbackRate = playbackRate;
  }, [playbackRate]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const element = videoRef.current;
      if (!element) return;

      /*
       * Never steal a key from a control the learner is actually using.
       * Space on a focused button is that button's activation, and the
       * rate `<select>` owns its own arrows.
       */
      const target = event.target as HTMLElement | null;
      if (target && target !== event.currentTarget && target.closest('button, select, a, input, [role="combobox"]')) {
        return;
      }

      const seekBy = (seconds: number) => {
        element.currentTime = Math.max(
          0,
          Math.min(element.duration || Number.MAX_SAFE_INTEGER, element.currentTime + seconds)
        );
      };

      switch (event.key) {
        case ' ':
        case 'k':
        case 'K':
          event.preventDefault();
          if (element.paused) void element.play().catch(() => undefined);
          else element.pause();
          return;
        case 'ArrowRight':
          event.preventDefault();
          seekBy(ARROW_SEEK_SECONDS);
          return;
        case 'ArrowLeft':
          event.preventDefault();
          seekBy(-ARROW_SEEK_SECONDS);
          return;
        case 'l':
        case 'L':
          event.preventDefault();
          seekBy(JUMP_SEEK_SECONDS);
          return;
        case 'j':
        case 'J':
          event.preventDefault();
          seekBy(-JUMP_SEEK_SECONDS);
          return;
        case 'm':
        case 'M':
          event.preventDefault();
          element.muted = !element.muted;
          return;
        case 'f':
        case 'F':
          event.preventDefault();
          if (document.fullscreenElement) void document.exitFullscreen();
          else void element.requestFullscreen?.().catch(() => undefined);
          return;
        default:
          return;
      }
    },
    []
  );

  return (
    <div className="space-y-3">
      <div
        // Focusable so the shortcuts have somewhere to live, and named so a
        // screen reader says what receiving focus here means.
        tabIndex={0}
        role="group"
        aria-label={t('learning:player.video.regionLabel', { title })}
        aria-keyshortcuts="Space K ArrowLeft ArrowRight J L M F"
        onKeyDown={handleKeyDown}
        // A deterrent, and named as one in this file's doc comment.
        onContextMenu={(event) => event.preventDefault()}
        className="relative overflow-hidden rounded-lg bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <AspectRatio ratio={16 / 9}>
          <video
            ref={videoRef}
            controls
            playsInline
            preload="metadata"
            poster={video.posterUrl}
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            onEnded={onEnded}
            className="size-full"
          >
            {captions?.url ? (
              <track
                kind="captions"
                src={captions.url}
                label={captions.title}
                default
              />
            ) : null}
            {t('learning:lesson.videoUnsupported')}
          </video>

          {watermarkText ? <WatermarkOverlay text={watermarkText} /> : null}

          {isAttaching ? (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/40"
              role="status"
              aria-live="polite"
            >
              <Loader2
                className="size-6 animate-spin text-white motion-reduce:animate-none"
                aria-hidden
              />
              <span className="sr-only">
                {t('learning:player.video.loading')}
              </span>
            </div>
          ) : null}
        </AspectRatio>
      </div>

      {hasMediaError ? (
        <p role="alert" className="text-sm text-destructive">
          {t('learning:player.video.decodeError')}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* The native rate control is suppressed by `controlsList` so this
            one is the only rate control on screen — two of them, one of
            which the keyboard shortcuts do not drive, is worse than none. */}
        <div className="flex items-center gap-2">
          <span
            id={`playback-rate-${lessonId}`}
            className="text-xs text-muted-foreground"
          >
            {t('learning:player.video.speed')}
          </span>
          <Select
            value={String(playbackRate)}
            onValueChange={(value) => setPlaybackRate(Number(value))}
          >
            <SelectTrigger
              className="h-8 w-24"
              aria-labelledby={`playback-rate-${lessonId}`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAYBACK_RATES.map((rate) => (
                <SelectItem key={rate} value={String(rate)}>
                  {t('learning:player.video.rate', { rate })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className={cn('text-xs text-muted-foreground')}>
          {t('learning:player.video.shortcutsHint')}
        </p>
      </div>
    </div>
  );
}
