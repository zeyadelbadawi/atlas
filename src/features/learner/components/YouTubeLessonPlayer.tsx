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
 */
import { useTranslation } from 'react-i18next';
import { Youtube } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { buildYouTubeEmbedUrl } from '@utils';
import type { ExternalEmbed } from '@types';

export interface YouTubeLessonPlayerProps {
  readonly embed: ExternalEmbed;
  readonly title: string;
}

export function YouTubeLessonPlayer({
  embed,
  title,
}: YouTubeLessonPlayerProps): JSX.Element | null {
  const { t } = useTranslation();
  const src = buildYouTubeEmbedUrl(embed.videoId, {
    startSeconds: embed.startSeconds,
  });
  // The server never sends an id this rejects; if it ever did, render
  // nothing rather than a frame of something unvetted.
  if (!src) return null;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg bg-black">
        <AspectRatio ratio={16 / 9}>
          <iframe
            key={embed.videoId}
            src={src}
            title={t('learning:player.video.regionLabel', { title })}
            className="size-full border-0"
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
            data-testid="youtube-lesson-player"
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
