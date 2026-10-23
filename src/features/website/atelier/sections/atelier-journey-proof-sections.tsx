/**
 * Atelier — CMS phase 3d (batch D) sections, set as pages of the studio
 * publication (plan §2): numbered chapters, hairlines and the display face
 * rather than cards.
 *
 * - `timeline`: a chronology — the period in tracked small caps in its own
 *   column, the milestone in the display face, knots on a hairline.
 * - `videoTestimonials`: video plates with the quote set in the display face.
 * - `downloads`: a ruled list of files, each row a hairline-topped link.
 * - `certificates`: certificates mounted on paper plates, captioned below.
 *
 * Each is the shared body (`sections/bodies/*`) with Atelier's classes and
 * colours (`--atelier-*`). Empty sections are left out publicly; previews
 * say what to add.
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
  AtelierChapter,
  AtelierSectionHeader,
  formatAtelierIndex,
} from '../atelier-parts';
import { AtelierPreviewNote } from './atelier-section-utils';
import '../atelier-sections.css';

const SAMPLE_BADGE =
  'border border-dashed border-[var(--atelier-hairline)] px-2 py-0.5 text-xs text-[var(--atelier-text-muted)]';

/* ------------------------------------------------------------------ */
/* Timeline — the chronology                                            */
/* ------------------------------------------------------------------ */

export function AtelierTimeline({
  config,
  linkRenderer,
}: SectionRenderProps<'timeline'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const milestones = resolveTimeline(config, locale);
  if (milestones.length === 0) {
    return linkRenderer ? null : (
      <AtelierPreviewNote>
        {t('website:renderer.timeline.previewEmpty')}
      </AtelierPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <AtelierChapter
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.timeline.label')}
      numbered
    >
      <AtelierSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        layout="split"
      />
      <TimelineList
        milestones={milestones}
        locale={locale}
        renderNumber={(value) => formatAtelierIndex(value - 1, locale)}
        classes={{
          list: 'max-w-5xl',
          line: '!w-px bg-[var(--atelier-hairline)]',
          marker:
            'at-serif rounded-full border border-[var(--atelier-hairline)] bg-[var(--atelier-paper)] text-base text-[var(--atelier-brand)]',
          // From tablets: the period in its own column beside the milestone.
          content:
            'border-t border-[var(--atelier-hairline)] pt-4 md:grid md:grid-cols-[9rem_minmax(0,1fr)] md:items-baseline md:gap-x-8',
          period: 'at-label at-label-brand mb-2 md:row-span-2 md:mb-0',
          title:
            'at-serif text-[length:var(--at-subtitle)] leading-tight text-[var(--atelier-text)] md:col-start-2',
          description:
            'max-w-[var(--at-measure)] leading-relaxed text-[var(--atelier-text-muted)] md:col-start-2',
        }}
      />
    </AtelierChapter>
  );
}

/* ------------------------------------------------------------------ */
/* Video reviews — plates and quotes                                    */
/* ------------------------------------------------------------------ */

export function AtelierVideoTestimonials({
  config,
  linkRenderer,
}: SectionRenderProps<'videoTestimonials'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const reviews = resolveVideoReviews(config, locale, !!linkRenderer);
  if (reviews.length === 0) {
    return linkRenderer ? null : (
      <AtelierPreviewNote>
        {t('website:renderer.videoTestimonials.previewEmpty')}
      </AtelierPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <AtelierChapter
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.videoTestimonials.label')}
      numbered
    >
      <AtelierSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        layout="split"
      />
      <VideoReviewGrid
        reviews={reviews}
        interactive={!!linkRenderer}
        classes={{
          list: 'lg:!gap-10',
          frame: 'at-frame atx-video-frame',
          play: 'atx-video-play ![block-size:3.75rem] ![inline-size:3.75rem]',
          placeholder:
            'border border-dashed border-[var(--atelier-hairline)] text-[var(--atelier-text-muted)]',
          quote: 'at-serif text-xl leading-snug text-[var(--atelier-text)]',
          name: 'text-base font-medium text-[var(--atelier-text)]',
          role: 'at-label !normal-case !tracking-normal',
          sampleBadge: SAMPLE_BADGE,
        }}
      />
    </AtelierChapter>
  );
}

/* ------------------------------------------------------------------ */
/* Downloads — the ruled list                                           */
/* ------------------------------------------------------------------ */

export function AtelierDownloads({
  config,
  linkRenderer,
}: SectionRenderProps<'downloads'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const downloads = resolveDownloads(config, locale, !!linkRenderer);
  if (downloads.length === 0) {
    return linkRenderer ? null : (
      <AtelierPreviewNote>
        {t('website:renderer.downloads.previewEmpty')}
      </AtelierPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <AtelierChapter
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.downloads.label')}
      numbered
    >
      <AtelierSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        layout="split"
      />
      <DownloadList
        downloads={downloads}
        interactive={!!linkRenderer}
        classes={{
          list: '!gap-x-10 !gap-y-0 border-b border-[var(--atelier-hairline)]',
          row: '!px-0 py-5 border-t border-[var(--atelier-hairline)] text-[var(--atelier-text)] transition-colors duration-200 hover:text-[var(--atelier-brand)] motion-reduce:transition-none',
          icon: 'border border-[var(--atelier-hairline)] text-[var(--atelier-brand)]',
          title: 'at-serif text-xl leading-snug',
          description: 'text-sm text-[var(--atelier-text-muted)]',
          meta: 'at-label',
          action: 'text-[var(--atelier-brand)]',
          missing: 'text-xs text-[var(--atelier-text-muted)]',
        }}
      />
    </AtelierChapter>
  );
}

/* ------------------------------------------------------------------ */
/* Certificates — mounted plates                                        */
/* ------------------------------------------------------------------ */

export function AtelierCertificates({
  config,
  linkRenderer,
}: SectionRenderProps<'certificates'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const certificates = resolveCertificates(config, locale);
  if (certificates.length === 0) {
    return linkRenderer ? null : (
      <AtelierPreviewNote>
        {t('website:renderer.certificates.previewEmpty')}
      </AtelierPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <AtelierChapter
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.certificates.label')}
      numbered
    >
      <AtelierSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        layout="split"
      />
      <CertificateGrid
        certificates={certificates}
        interactive={!!linkRenderer}
        classes={{
          list: 'lg:!gap-10',
          // Not `.at-frame`: that crops its image; a certificate is shown whole.
          frame:
            '!p-5 border border-[var(--atelier-hairline)] bg-[var(--atelier-paper-deep)] sm:!p-6',
          title: 'at-serif text-xl leading-snug text-[var(--atelier-text)]',
          meta: 'at-label !normal-case !tracking-normal',
        }}
      />
    </AtelierChapter>
  );
}
