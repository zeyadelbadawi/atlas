/**
 * The YouTube source of the unified player (P64 pre-Phase-3 baseline).
 *
 * One player, three sources: R2/Worker MP4 and Cloudflare Stream HLS go
 * through `ProtectedVideoPlayer`; a supported YouTube link goes through
 * here. It is NOT a second player and it is not a generic iframe: the
 * `src` is built from the server-vetted 11-character `videoId` — never
 * from the lesson's URL — on the privacy-enhanced `youtube-nocookie.com`
 * host, sandboxed to what YouTube's own embed needs.
 *
 * HONESTY, TWICE. The academy's protections do not apply to YouTube (the
 * protection report already says so); and Atlas cannot observe YouTube
 * playback, so nothing here reports watched time. Completion stays with
 * the lesson's existing rule — a manual "Mark complete" is the learner's
 * own word, and a watched-ratio rule cannot be satisfied at all, which the
 * action bar states rather than pretends otherwise.
 *
 * LOADING (Task D). The frame used to be a black box until YouTube drew
 * into it, and a video that could not play here (removed, private,
 * embedding disabled) looked identical to a slow one. Readiness now comes
 * from real signals: the frame's own `load` and the embed's `onReady` /
 * `onError` events (its postMessage API, accepted only from YouTube's
 * origins and from this frame). A frame that has not loaded after a while
 * says so and offers Retry, which reloads it.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Youtube } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { buildYouTubeEmbedUrl } from '@utils';
import type { ExternalEmbed } from '@types';
import type { MediaPhase } from '../hooks/useMediaReadiness';
import { VideoStatusOverlay } from './VideoStatusOverlay';

const YOUTUBE_ORIGINS = new Set([
  'https://www.youtube-nocookie.com',
  'https://www.youtube.com',
]);
/** No `load` by then: tell the learner and offer Retry (not a readiness decision). */
const SLOW_AFTER_MS = 15_000;
/** The embed's error codes meaning "this video cannot be played here". */
const UNPLAYABLE_ERRORS = new Set([100, 101, 150]);

export interface YouTubeLessonPlayerProps {
  readonly embed: ExternalEmbed;
  readonly title: string;
}

export function YouTubeLessonPlayer({
  embed,
  title,
}: YouTubeLessonPlayerProps): JSX.Element | null {
  const { t } = useTranslation();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<MediaPhase>('loading');
  const [slow, setSlow] = useState(false);
  const [unplayable, setUnplayable] = useState(false);

  const src = buildYouTubeEmbedUrl(embed.videoId, {
    startSeconds: embed.startSeconds,
    jsApiOrigin:
      typeof window === 'undefined' ? undefined : window.location.origin,
  });

  // A new video or a retry starts loading again.
  useEffect(() => {
    setPhase('loading');
    setSlow(false);
    setUnplayable(false);
    const timer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [embed.videoId, attempt]);

  // The embed's own events: ready, and the errors a slow load never shows.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!YOUTUBE_ORIGINS.has(event.origin)) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      let data: { event?: string; info?: unknown } | null = null;
      try {
        data =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (data?.event === 'onReady') {
        setPhase('ready');
      } else if (data?.event === 'onError') {
        setUnplayable(UNPLAYABLE_ERRORS.has(Number(data.info)));
        setPhase('error');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // The server never sends an id this rejects; if it ever did, render
  // nothing rather than a frame of something unvetted.
  if (!src) return null;

  const onFrameLoad = () => {
    // The frame's document is there: YouTube's own player UI takes over.
    setPhase((current) => (current === 'error' ? current : 'ready'));
    setSlow(false);
    // Ask the embed for its events (the IFrame API handshake).
    frameRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        event: 'listening',
        id: embed.videoId,
        channel: 'widget',
      }),
      'https://www.youtube-nocookie.com'
    );
  };

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-lg bg-black">
        <AspectRatio ratio={16 / 9}>
          <iframe
            ref={frameRef}
            key={`${embed.videoId}:${attempt}`}
            src={src}
            title={t('learning:player.video.regionLabel', { title })}
            className="size-full border-0"
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
            data-testid="youtube-lesson-player"
            onLoad={onFrameLoad}
          />
          <VideoStatusOverlay
            phase={phase}
            slow={slow}
            onRetry={() => setAttempt((value) => value + 1)}
            errorMessage={
              unplayable
                ? t('learning:player.video.youtubeUnavailable')
                : undefined
            }
          />
        </AspectRatio>
      </div>
      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Youtube className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>{t('learning:player.external.youtubeNotice')}</span>
      </p>
    </div>
  );
}
