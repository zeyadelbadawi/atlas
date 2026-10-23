/**
 * Video reviews (CMS phase 3d, batch D) — the base renderer: a grid of
 * click-to-play reviews (`bodies/VideoReviewGrid`), one playing at a time.
 * Starter reviews never reach the public site; the section is left out
 * there until it has a real review with a video.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useWebsiteCardClass,
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import { VideoReviewGrid } from './bodies/VideoReviewGrid';
import { resolveVideoReviews } from './bodies/journey-proof.logic';
import { PreviewEmptyNote } from './bodies/PreviewEmptyNote';
import type { VideoTestimonialsSectionConfig } from '@types';

export function VideoTestimonialsSection({
  config,
  isPublic = false,
}: {
  readonly config: VideoTestimonialsSectionConfig;
  readonly isPublic?: boolean;
}): JSX.Element | null {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const cardClass = useWebsiteCardClass();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const reviews = resolveVideoReviews(config, locale, isPublic);
  if (reviews.length === 0 && isPublic) return null;
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={`${container} ${section}`}
    >
      {title || description ? (
        <div className="mx-auto mb-10 max-w-2xl space-y-2 text-center">
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
      {reviews.length > 0 ? (
        <VideoReviewGrid
          reviews={reviews}
          interactive={isPublic}
          classes={{
            card: cardClass,
            frame: 'rounded-md bg-muted',
            play: 'size-14 rounded-full bg-[var(--website-primary-solid)] text-white shadow-lg',
            placeholder:
              'border border-dashed border-border text-muted-foreground',
            quote: 'text-foreground',
            name: 'font-semibold text-foreground',
            role: 'text-sm text-muted-foreground',
            sampleBadge:
              'rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground',
          }}
        />
      ) : (
        <PreviewEmptyNote className="border-border text-muted-foreground">
          {t('website:renderer.videoTestimonials.previewEmpty')}
        </PreviewEmptyNote>
      )}
    </section>
  );
}
