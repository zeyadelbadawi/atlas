/**
 * Theme 1 — CMS phase 3d (batch D) sections: the learning path (journey),
 * video reviews and certificates (proof), and downloads. Each is the shared
 * body (`sections/bodies/*`) in Theme 1's own frame, heading, cards and
 * brand-mapped colours (`--website-*`); nothing here reads a raw colour.
 *
 * - `timeline`: cards hung on a spine of brand-filled markers, alternating
 *   sides from `lg` (a rail on phones).
 * - `videoTestimonials`: Theme 1's video frame and play mark, in cards.
 * - `downloads`: file rows as cards with a tinted icon plate.
 * - `certificates`: framed images on cards with a caption.
 *
 * On the public site an empty section is left out; a preview says what to
 * add instead of leaving an unexplained gap.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { SectionRenderProps } from '../theme-packs/theme-pack.types';
import {
  resolveCertificates,
  resolveDownloads,
  resolveTimeline,
  resolveVideoReviews,
} from '../sections/bodies/journey-proof.logic';
import { TimelineList } from '../sections/bodies/TimelineList';
import { VideoReviewGrid } from '../sections/bodies/VideoReviewGrid';
import { DownloadList } from '../sections/bodies/DownloadList';
import { CertificateGrid } from '../sections/bodies/CertificateGrid';
import { PreviewEmptyNote } from '../sections/bodies/PreviewEmptyNote';
import { T1Section, T1SectionHeader, formatT1Number } from './t1-parts';

const SAMPLE_BADGE =
  'rounded-full border border-dashed border-[var(--website-input-border)] px-2.5 py-0.5 text-xs font-semibold text-[var(--website-foreground-muted)]';

function T1EmptyNote({ children }: { readonly children: string }) {
  return (
    <PreviewEmptyNote className="rounded-[var(--t1-radius-card)] border-[var(--website-input-border)] text-[var(--website-foreground-muted)]">
      {children}
    </PreviewEmptyNote>
  );
}

/* ------------------------------------------------------------------ */
/* Timeline — the learning path                                         */
/* ------------------------------------------------------------------ */

export function T1Timeline({
  config,
  linkRenderer,
}: SectionRenderProps<'timeline'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const milestones = resolveTimeline(config, locale);
  if (milestones.length === 0 && linkRenderer) return null;
  const title = resolveLocalizedText(config.title, locale);

  return (
    <T1Section labelledBy={title ? headingId : undefined}>
      <T1SectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        align="center"
      />
      {milestones.length > 0 ? (
        <TimelineList
          milestones={milestones}
          locale={locale}
          layout="alternate"
          renderNumber={(value) => formatT1Number(value, locale)}
          classes={{
            list: 'mx-auto max-w-5xl',
            line: 'bg-[var(--website-border)]',
            marker:
              'rounded-full bg-[var(--website-cta)] text-base font-bold text-[var(--website-cta-foreground)] shadow-[var(--t1-shadow-rest)] ring-4 ring-[var(--website-background)]',
            content: 't1-card p-5 md:p-6',
            period:
              'mb-3 inline-flex rounded-full bg-[var(--website-chip-bg)] px-3 py-0.5 text-sm font-semibold text-[var(--website-chip-fg)]',
            title:
              'font-display text-lg font-bold text-[var(--website-foreground)] md:text-xl',
            description:
              'leading-relaxed text-[var(--website-foreground-muted)]',
          }}
        />
      ) : (
        <T1EmptyNote>{t('website:renderer.timeline.previewEmpty')}</T1EmptyNote>
      )}
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* Video reviews                                                        */
/* ------------------------------------------------------------------ */

export function T1VideoTestimonials({
  config,
  linkRenderer,
}: SectionRenderProps<'videoTestimonials'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const reviews = resolveVideoReviews(config, locale, !!linkRenderer);
  if (reviews.length === 0 && linkRenderer) return null;
  const title = resolveLocalizedText(config.title, locale);

  return (
    <T1Section tone="soft" labelledBy={title ? headingId : undefined}>
      <T1SectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        align="center"
      />
      {reviews.length > 0 ? (
        <VideoReviewGrid
          reviews={reviews}
          interactive={!!linkRenderer}
          classes={{
            card: 't1-card overflow-hidden p-3 pb-5 sm:p-4 sm:pb-6',
            frame:
              'rounded-[calc(var(--t1-radius-card)-0.375rem)] bg-[var(--website-surface)] t1-video-frame',
            play: 't1-video-play !size-14',
            placeholder:
              'border border-dashed border-[var(--website-input-border)] text-[var(--website-foreground-muted)] !shadow-none',
            quote: 'px-1 text-[var(--website-foreground)]',
            name: 'px-1 font-semibold text-[var(--website-foreground)]',
            role: 'px-1 text-sm text-[var(--website-foreground-muted)]',
            sampleBadge: `${SAMPLE_BADGE} ms-1`,
          }}
        />
      ) : (
        <T1EmptyNote>
          {t('website:renderer.videoTestimonials.previewEmpty')}
        </T1EmptyNote>
      )}
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* Downloads                                                            */
/* ------------------------------------------------------------------ */

export function T1Downloads({
  config,
  linkRenderer,
}: SectionRenderProps<'downloads'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const downloads = resolveDownloads(config, locale, !!linkRenderer);
  if (downloads.length === 0 && linkRenderer) return null;
  const title = resolveLocalizedText(config.title, locale);

  return (
    <T1Section labelledBy={title ? headingId : undefined}>
      <T1SectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
      />
      {downloads.length > 0 ? (
        <DownloadList
          downloads={downloads}
          interactive={!!linkRenderer}
          classes={{
            row: 't1-card t1-focus transition-colors duration-200 hover:border-[var(--website-link)] motion-reduce:transition-none',
            icon: 'rounded-xl bg-[var(--website-chip-bg)] text-[var(--website-chip-fg)]',
            title: 'font-semibold text-[var(--website-foreground)]',
            description: 'text-sm text-[var(--website-foreground-muted)]',
            meta: 'text-xs font-semibold uppercase tracking-wide text-[var(--website-foreground-muted)]',
            action: 'text-[var(--website-link)]',
            missing: 'text-xs text-[var(--website-foreground-muted)]',
          }}
        />
      ) : (
        <T1EmptyNote>
          {t('website:renderer.downloads.previewEmpty')}
        </T1EmptyNote>
      )}
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* Certificates                                                         */
/* ------------------------------------------------------------------ */

export function T1Certificates({
  config,
  linkRenderer,
}: SectionRenderProps<'certificates'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const certificates = resolveCertificates(config, locale);
  if (certificates.length === 0 && linkRenderer) return null;
  const title = resolveLocalizedText(config.title, locale);

  return (
    <T1Section tone="soft" labelledBy={title ? headingId : undefined}>
      <T1SectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        align="center"
      />
      {certificates.length > 0 ? (
        <CertificateGrid
          certificates={certificates}
          interactive={!!linkRenderer}
          classes={{
            card: 't1-card p-3 pb-5 sm:p-4 sm:pb-6',
            frame:
              'rounded-[calc(var(--t1-radius-card)-0.375rem)] border border-[var(--website-border)] bg-[var(--website-surface)]',
            link: 't1-focus block rounded-[calc(var(--t1-radius-card)-0.375rem)]',
            title:
              'px-1 font-display text-base font-bold text-[var(--website-foreground)]',
            meta: 'px-1 text-sm text-[var(--website-foreground-muted)]',
          }}
        />
      ) : (
        <T1EmptyNote>
          {t('website:renderer.certificates.previewEmpty')}
        </T1EmptyNote>
      )}
    </T1Section>
  );
}
