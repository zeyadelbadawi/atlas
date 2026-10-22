/**
 * Video (CMS phase 3d) — the base renderer: a title, a lead and the
 * click-to-play YouTube facade (`VideoFacade`), with an optional caption.
 * The public site leaves the section out until it has a video.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import { isYouTubeVideoId } from '../utils/section-media-values.utils';
import type { VideoSectionConfig } from '@types';
import { VideoFacade } from './engage/VideoFacade';

export interface VideoSectionProps {
  readonly config: VideoSectionConfig;
  /** The public site plays; previews show the poster. */
  readonly interactive: boolean;
}

export function VideoSection({
  config,
  interactive,
}: VideoSectionProps): JSX.Element | null {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const hasVideo = isYouTubeVideoId(config.videoId);
  if (!hasVideo && interactive) return null;
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);
  const caption = resolveLocalizedText(config.caption, locale);

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={`${container} ${section}`}
    >
      {title || description ? (
        <div className="mx-auto mb-8 max-w-2xl space-y-2 text-center">
          {title ? (
            <h2
              id={headingId}
              className={`${heading} break-words text-3xl text-foreground`}
            >
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="break-words text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      <figure className="mx-auto max-w-4xl">
        {hasVideo ? (
          <VideoFacade
            videoId={config.videoId}
            title={title}
            poster={config.poster}
            interactive={interactive}
            frameClassName="bg-muted"
            playClassName="size-16 rounded-full bg-[var(--website-primary-solid)] text-white shadow-lg"
          />
        ) : (
          <div
            className="flex aspect-[16/9] items-center justify-center border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
            role="note"
          >
            {t('website:renderer.video.previewMissing')}
          </div>
        )}
        {caption ? (
          <figcaption className="mt-3 text-center text-sm text-muted-foreground">
            {caption}
          </figcaption>
        ) : null}
      </figure>
    </section>
  );
}
