/**
 * Manara — CMS phase 3d (batch D) sections in the beacon's language (plan
 * §3): bold blocks, rounded cards, pills and the display face.
 *
 * - `timeline`: the path as a beam — dyed square markers on a thick track,
 *   cards alternating sides from `lg`, each period a pill.
 * - `videoTestimonials`: Manara's video frame and accent play plate in cards.
 * - `downloads`: bold file cards with a dyed icon plate.
 * - `certificates`: certificates on rounded cards, captioned in the display
 *   face.
 *
 * Each is the shared body (`sections/bodies/*`) with Manara's classes and
 * ground colours (`--mn-env-*`). Empty sections are left out publicly;
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
import {
  ManaraBlock,
  ManaraSectionHeader,
  formatManaraIndex,
} from '../manara-parts';
import { ManaraPreviewNote } from './manara-section-utils';
import '../manara-sections.css';

const SAMPLE_BADGE =
  'rounded-full border border-dashed border-[var(--mn-env-line)] px-2.5 py-0.5 text-xs font-bold text-[var(--mn-env-text-muted)]';

/* ------------------------------------------------------------------ */
/* Timeline — the beam                                                  */
/* ------------------------------------------------------------------ */

export function ManaraTimeline({
  config,
  linkRenderer,
}: SectionRenderProps<'timeline'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const milestones = resolveTimeline(config, locale);
  if (milestones.length === 0) {
    return linkRenderer ? null : (
      <ManaraPreviewNote>
        {t('website:renderer.timeline.previewEmpty')}
      </ManaraPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <ManaraBlock
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.timeline.label')}
    >
      <ManaraSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        align="center"
      />
      <TimelineList
        milestones={milestones}
        locale={locale}
        layout="alternate"
        renderNumber={(value) => formatManaraIndex(value - 1, locale)}
        classes={{
          list: 'mx-auto max-w-5xl [--tl-marker:3rem]',
          line: '!w-1 rounded-full bg-[var(--mn-beam-soft)] ![inset-inline-start:calc(var(--tl-marker)/2_-_2px)] lg:![inset-inline-start:calc(50%_-_2px)]',
          marker:
            'mn-font-display rounded-[var(--mn-radius)] bg-[var(--mn-block)] text-base font-extrabold text-[var(--mn-block-text)]',
          content: 'mn-card p-5 hover:!transform-none md:p-6',
          period: 'mn-pill mb-3',
          title:
            'mn-font-display text-lg font-extrabold leading-snug md:text-xl',
          description: 'mn-muted leading-relaxed',
        }}
      />
    </ManaraBlock>
  );
}

/* ------------------------------------------------------------------ */
/* Video reviews                                                        */
/* ------------------------------------------------------------------ */

export function ManaraVideoTestimonials({
  config,
  linkRenderer,
}: SectionRenderProps<'videoTestimonials'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const reviews = resolveVideoReviews(config, locale, !!linkRenderer);
  if (reviews.length === 0) {
    return linkRenderer ? null : (
      <ManaraPreviewNote>
        {t('website:renderer.videoTestimonials.previewEmpty')}
      </ManaraPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <ManaraBlock
      env="soft"
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.videoTestimonials.label')}
    >
      <ManaraSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        layout="split"
      />
      <VideoReviewGrid
        reviews={reviews}
        interactive={!!linkRenderer}
        classes={{
          card: 'mn-card p-3 pb-5 hover:!transform-none sm:p-4 sm:pb-6',
          frame: 'mn-frame mnx-video-frame !rounded-[var(--mn-radius)]',
          play: 'mnx-video-play ![block-size:3.5rem] ![inline-size:3.5rem]',
          placeholder:
            'border-2 border-dashed border-[var(--mn-env-line)] !bg-transparent text-[var(--mn-env-text-muted)] !shadow-none',
          quote: 'mn-font-display px-1 text-lg font-bold leading-snug',
          name: 'mn-font-display px-1 text-base font-extrabold',
          role: 'mn-muted px-1 text-sm',
          sampleBadge: `${SAMPLE_BADGE} ms-1`,
        }}
      />
    </ManaraBlock>
  );
}

/* ------------------------------------------------------------------ */
/* Downloads                                                            */
/* ------------------------------------------------------------------ */

export function ManaraDownloads({
  config,
  linkRenderer,
}: SectionRenderProps<'downloads'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const downloads = resolveDownloads(config, locale, !!linkRenderer);
  if (downloads.length === 0) {
    return linkRenderer ? null : (
      <ManaraPreviewNote>
        {t('website:renderer.downloads.previewEmpty')}
      </ManaraPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <ManaraBlock
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.downloads.label')}
    >
      <ManaraSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        layout="split"
      />
      <DownloadList
        downloads={downloads}
        interactive={!!linkRenderer}
        classes={{
          list: '!gap-4',
          row: 'mn-card !flex-row motion-reduce:transition-none',
          icon: 'rounded-[var(--mn-radius)] bg-[var(--mn-block)] text-[var(--mn-block-text)]',
          title: 'mn-font-display text-base font-extrabold leading-snug',
          description: 'mn-muted text-sm',
          meta: 'mn-label text-[var(--mn-env-text-muted)]',
          action: 'text-[var(--mn-env-link)]',
          missing: 'mn-muted text-xs',
        }}
      />
    </ManaraBlock>
  );
}

/* ------------------------------------------------------------------ */
/* Certificates                                                         */
/* ------------------------------------------------------------------ */

export function ManaraCertificates({
  config,
  linkRenderer,
}: SectionRenderProps<'certificates'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const certificates = resolveCertificates(config, locale);
  if (certificates.length === 0) {
    return linkRenderer ? null : (
      <ManaraPreviewNote>
        {t('website:renderer.certificates.previewEmpty')}
      </ManaraPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <ManaraBlock
      env="soft"
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.certificates.label')}
    >
      <ManaraSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        align="center"
      />
      <CertificateGrid
        certificates={certificates}
        interactive={!!linkRenderer}
        classes={{
          card: 'mn-card p-3 pb-5 hover:!transform-none sm:p-4 sm:pb-6',
          // Not `.mn-frame`: that crops its image; a certificate is shown whole.
          frame:
            'rounded-[var(--mn-radius)] border border-[var(--mn-env-line)] bg-[var(--mn-day-soft)]',
          link: 'block rounded-[var(--mn-radius)]',
          title: 'mn-font-display px-1 text-base font-extrabold leading-snug',
          meta: 'mn-muted px-1 text-sm',
        }}
      />
    </ManaraBlock>
  );
}
