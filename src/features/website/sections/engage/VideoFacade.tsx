/**
 * The click-to-play YouTube facade every theme's video section draws
 * (CMS phase 3d). Theme-neutral: each theme passes its own classes for the
 * frame and the play mark, so the facade looks native in every theme.
 *
 * Nothing from YouTube loads until the visitor asks for it:
 *   - first, a poster — the Owner's uploaded image, or YouTube's own
 *     thumbnail (`i.ytimg.com`, lazy, decoded off the main thread) — inside
 *     a 16:9 frame that reserves its space, so nothing shifts;
 *   - pointing at or focusing the poster warms the connection to the player
 *     host (one `preconnect`, once per page);
 *   - pressing it swaps in the `youtube-nocookie.com` player, started at
 *     once, and moves focus into it so a keyboard user keeps their place.
 *
 * In dashboard previews (`interactive` false) the poster is a picture, not
 * a control: section previews never navigate or play, like their buttons.
 *
 * A grid of videos (the video reviews, CMS phase 3d batch D) controls it
 * with `playing`/`onPlay`, so starting one returns the others to their
 * posters — their players are removed, which stops them.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { cn } from '@utils';
import { ThemeImage } from '@/features/website/theme-assets';
import {
  youTubeAutoplayEmbedUrl,
  youTubePosterUrl,
} from '@/features/website/utils/section-media-values.utils';

const PLAYER_ORIGIN = 'https://www.youtube-nocookie.com';
let warmed = false;

/** One `preconnect` to the player host, the first time a visitor shows interest. */
function warmPlayerConnection(): void {
  if (warmed || typeof document === 'undefined') return;
  warmed = true;
  for (const origin of [PLAYER_ORIGIN, 'https://i.ytimg.com']) {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = '';
    document.head.appendChild(link);
  }
}

export interface VideoFacadeProps {
  readonly videoId: string;
  /** The video's title in the visitor's language (names the button and the player). */
  readonly title: string;
  /** An uploaded poster (any image value); absent → YouTube's thumbnail. */
  readonly poster?: string;
  /** The public site plays; previews show the poster only. */
  readonly interactive: boolean;
  /** The theme's frame: shape, border, radius (the 16:9 ratio is built in). */
  readonly frameClassName?: string;
  /** The theme's play mark (the circle or plate around the triangle). */
  readonly playClassName?: string;
  /** The poster's rendered width, for choosing an uploaded poster's file. */
  readonly sizes?: string;
  /** Controlled: whether this video's player is in place (a grid plays one at a time). */
  readonly playing?: boolean;
  /** Controlled: the visitor pressed play. */
  readonly onPlay?: () => void;
}

export function VideoFacade({
  videoId,
  title,
  poster,
  interactive,
  frameClassName,
  playClassName,
  sizes = '(min-width: 1024px) 60vw, 100vw',
  playing: controlledPlaying,
  onPlay,
}: VideoFacadeProps): JSX.Element {
  const { t } = useTranslation();
  const [ownPlaying, setOwnPlaying] = useState(false);
  const playing = controlledPlaying ?? ownPlaying;
  const playerRef = useRef<HTMLIFrameElement>(null);
  const embedUrl = youTubeAutoplayEmbedUrl(videoId);
  const play = () => {
    if (controlledPlaying === undefined) setOwnPlaying(true);
    onPlay?.();
  };

  useEffect(() => {
    if (playing) playerRef.current?.focus();
  }, [playing]);

  // A different video (the Owner editing) starts from its poster again.
  useEffect(() => setOwnPlaying(false), [videoId]);

  const playLabel = title
    ? t('website:renderer.video.play', { title })
    : t('website:renderer.video.playUntitled');

  const posterImage = poster ? (
    <ThemeImage
      value={poster}
      alt=""
      sizes={sizes}
      loading="lazy"
      className="absolute inset-0 size-full object-cover"
    />
  ) : (
    <img
      src={youTubePosterUrl(videoId)}
      alt=""
      width={480}
      height={360}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 size-full object-cover"
    />
  );

  // A media control: the triangle points right in both reading directions.
  const playMark = (
    <span
      aria-hidden
      className="absolute inset-0 flex items-center justify-center"
    >
      <span
        className={cn('inline-flex items-center justify-center', playClassName)}
        data-video-play-mark=""
      >
        <Play
          className="size-[42%] translate-x-[6%] fill-current"
          strokeWidth={0}
        />
      </span>
    </span>
  );

  return (
    <div
      className={cn('relative aspect-[16/9] overflow-hidden', frameClassName)}
      data-video-frame=""
    >
      {playing && embedUrl ? (
        <iframe
          ref={playerRef}
          src={embedUrl}
          title={
            title
              ? t('website:renderer.video.frameTitle', { title })
              : t('website:renderer.video.frameUntitled')
          }
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
        />
      ) : interactive && embedUrl ? (
        <button
          type="button"
          aria-label={playLabel}
          onClick={play}
          onPointerEnter={warmPlayerConnection}
          onFocus={warmPlayerConnection}
          className="group absolute inset-0 size-full cursor-pointer"
          data-video-play=""
        >
          {posterImage}
          {playMark}
        </button>
      ) : (
        <div className="absolute inset-0" aria-hidden>
          {posterImage}
          {playMark}
        </div>
      )}
    </div>
  );
}
