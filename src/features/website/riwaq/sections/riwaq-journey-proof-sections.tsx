/**
 * Riwaq — CMS phase 3d (batch D) sections on the colonnade's ruled grid
 * (plan §2): hairline cells, the marker square, square corners and the page
 * rail.
 *
 * - `timeline`: a ledger down a hairline — square markers, each milestone a
 *   ruled cell, its period opened by the marker square; set in the reading
 *   columns beside the page rail on desktop.
 * - `videoTestimonials`: video windows in ruled cells.
 * - `downloads`: ruled file cells with a squared icon.
 * - `certificates`: certificates mounted in ruled cells, captioned below.
 *
 * Each is the shared body (`sections/bodies/*`) with Riwaq's classes and
 * ground colours (`--rw-env-*`). Empty sections are left out publicly;
 * previews say what to add.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import {
  resolveCertificates,
  resolveDownloads,
  resolveTimeline,
  resolveVideoReviews,
} from '@/features/website/sections/bodies/journey-proof.logic';
import { TimelineList } from '@/features/website/sections/bodies/TimelineList';
import { VideoReviewGrid } from '@/features/website/sections/bodies/VideoReviewGrid';
import { DownloadList } from '@/features/website/sections/bodies/DownloadList';
import { CertificateGrid } from '@/features/website/sections/bodies/CertificateGrid';
import { RiwaqBand, RiwaqSectionHead, formatRiwaqIndex } from '../riwaq-parts';
import { RiwaqPreviewNote } from './riwaq-section-utils';
import '../riwaq-sections.css';

/** The marker square that opens a label (`.rw-label[data-mark]`), for a class list. */
const MARKED_LABEL =
  "rw-label before:size-2 before:flex-none before:bg-[var(--rw-env-marker)] before:content-['']";

/* ------------------------------------------------------------------ */
/* Timeline — the ledger                                                */
/* ------------------------------------------------------------------ */

export function RiwaqTimeline({
  config,
  linkRenderer,
}: SectionRenderProps<'timeline'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const milestones = resolveTimeline(config, locale);
  if (milestones.length === 0) {
    return linkRenderer ? null : (
      <RiwaqPreviewNote>
        {t('website:renderer.timeline.previewEmpty')}
      </RiwaqPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <RiwaqBand
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.timeline.label')}
    >
      <RiwaqSectionHead
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
      />
      <TimelineList
        milestones={milestones}
        locale={locale}
        renderNumber={(value) => formatRiwaqIndex(value - 1, locale)}
        classes={{
          // Beside the page rail on desktop, like the head's title.
          list: 'max-w-4xl lg:ms-[calc(25%_+_var(--rw-gap)/4)]',
          line: '!w-px bg-[var(--rw-env-rule-strong)]',
          marker:
            'rw-num border border-[var(--rw-env-rule-strong)] bg-[var(--rw-env-bg)] text-sm font-medium text-[var(--rw-env-heading)]',
          content: 'rw-cell',
          period: `${MARKED_LABEL} mb-3`,
          title: 'rw-subtitle !text-[clamp(1.125rem,1rem+0.5vw,1.375rem)]',
          description: 'leading-relaxed text-[var(--rw-env-muted)]',
        }}
      />
    </RiwaqBand>
  );
}

/* ------------------------------------------------------------------ */
/* Video reviews                                                        */
/* ------------------------------------------------------------------ */

export function RiwaqVideoTestimonials({
  config,
  linkRenderer,
}: SectionRenderProps<'videoTestimonials'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const reviews = resolveVideoReviews(config, locale, !!linkRenderer);
  if (reviews.length === 0) {
    return linkRenderer ? null : (
      <RiwaqPreviewNote>
        {t('website:renderer.videoTestimonials.previewEmpty')}
      </RiwaqPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <RiwaqBand
      ground="stone"
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.videoTestimonials.label')}
    >
      <RiwaqSectionHead
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
      />
      <VideoReviewGrid
        reviews={reviews}
        interactive={!!linkRenderer}
        classes={{
          list: '!gap-[var(--rw-gap)]',
          card: 'rw-cell !p-3 !pb-5 sm:!p-4 sm:!pb-6',
          frame: 'rw-window rwx-video-frame',
          play: 'rwx-video-play ![block-size:3.5rem] ![inline-size:3.5rem]',
          placeholder:
            'border border-dashed border-[var(--rw-env-rule-strong)] !bg-transparent text-[var(--rw-env-muted)]',
          quote: 'rw-subtitle !text-lg',
          name: 'font-medium text-[var(--rw-env-heading)]',
          role: 'text-sm text-[var(--rw-env-muted)]',
          sampleBadge: 'rw-chip',
        }}
      />
    </RiwaqBand>
  );
}

/* ------------------------------------------------------------------ */
/* Downloads                                                            */
/* ------------------------------------------------------------------ */

export function RiwaqDownloads({
  config,
  linkRenderer,
}: SectionRenderProps<'downloads'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const downloads = resolveDownloads(config, locale, !!linkRenderer);
  if (downloads.length === 0) {
    return linkRenderer ? null : (
      <RiwaqPreviewNote>
        {t('website:renderer.downloads.previewEmpty')}
      </RiwaqPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <RiwaqBand
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.downloads.label')}
    >
      <RiwaqSectionHead
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
      />
      <DownloadList
        downloads={downloads}
        interactive={!!linkRenderer}
        classes={{
          list: '!gap-[var(--rw-gap)]',
          row: 'rw-cell !p-4 transition-colors duration-200 hover:border-[var(--rw-env-rule-strong)] motion-reduce:transition-none',
          icon: 'border border-[var(--rw-env-rule-strong)] text-[var(--rw-env-heading)]',
          title: 'font-medium text-[var(--rw-env-heading)]',
          description: 'text-sm text-[var(--rw-env-muted)]',
          meta: 'rw-label',
          action: 'text-[var(--rw-env-link)]',
          missing: 'text-xs text-[var(--rw-env-muted)]',
        }}
      />
    </RiwaqBand>
  );
}

/* ------------------------------------------------------------------ */
/* Certificates                                                         */
/* ------------------------------------------------------------------ */

export function RiwaqCertificates({
  config,
  linkRenderer,
}: SectionRenderProps<'certificates'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const certificates = resolveCertificates(config, locale);
  if (certificates.length === 0) {
    return linkRenderer ? null : (
      <RiwaqPreviewNote>
        {t('website:renderer.certificates.previewEmpty')}
      </RiwaqPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <RiwaqBand
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.certificates.label')}
    >
      <RiwaqSectionHead
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
      />
      <CertificateGrid
        certificates={certificates}
        interactive={!!linkRenderer}
        classes={{
          list: '!gap-[var(--rw-gap)]',
          // Not `.rw-window`: that crops its image; a certificate is shown whole.
          frame: 'rw-cell !p-4 sm:!p-5',
          link: 'block',
          title: 'font-medium text-[var(--rw-env-heading)]',
          meta: 'rw-label',
        }}
      />
    </RiwaqBand>
  );
}
