/**
 * Riwaq — the CMS phase 3d (batch C) sections on the colonnade's ruled
 * grid (plan §2): hairline cells, the marker square, square corners.
 *
 * - `interestForm`: a ruled form beside the section head, square inputs on
 *   the page's rules (the contact page's form language).
 * - `announcementBar`: a slim band on the brand action fill, the stone or
 *   the deep ground; every colour follows the band's ground (`--rw-env-*`).
 * - `comparison`: a ruled ledger; the highlighted column carries the marker
 *   on its header and a stone wash down its cells.
 *
 * Each is the shared body (`sections/bodies/*`) with Riwaq's classes and
 * ground colours. An empty comparison is left out publicly; previews say
 * what to add.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { AnnouncementTone } from '@types';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import { InterestForm } from '@/features/website/sections/bodies/InterestForm';
import { ComparisonTable } from '@/features/website/sections/bodies/ComparisonTable';
import {
  isDrawableComparison,
  resolveComparison,
} from '@/features/website/sections/bodies/comparison.logic';
import {
  RiwaqAction,
  RiwaqBand,
  RiwaqSectionHead,
  type RiwaqGround,
} from '../riwaq-parts';
import { RiwaqPreviewNote } from './riwaq-section-utils';
import '../riwaq-pages.css';
import '../riwaq-enrol.css';

/* ------------------------------------------------------------------ */
/* Interest form                                                        */
/* ------------------------------------------------------------------ */

const RW_PHONE_EDGE =
  'h-12 rounded-none border-[var(--rw-env-rule-strong)] bg-[var(--rw-env-bg)] text-[var(--rw-env-text)] shadow-none focus-visible:ring-[var(--rw-env-focus)]';

export function RiwaqInterestForm({
  config,
  academyId,
  sectionId,
  linkRenderer,
}: SectionRenderProps<'interestForm'>): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const title = resolveLocalizedText(config.title, locale);

  return (
    <RiwaqBand
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.interestForm.label')}
      colonnade={false}
    >
      <RiwaqSectionHead
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
      />
      <div className="rwn-form-grid">
        <div className="border-t border-[var(--rw-env-rule-strong)] pt-8">
          <InterestForm
            config={config}
            academyId={academyId}
            sectionId={sectionId}
            isPublic={!!linkRenderer}
            labelledBy={title ? headingId : undefined}
            classes={{
              label: 'rw-label !flex !text-[var(--rw-env-text)]',
              optional: 'text-[var(--rw-env-muted)]',
              control: 'rw-input min-h-12',
              error: 'rwp-error',
              hint: 'text-[var(--rw-env-muted)]',
              submit: 'rw-btn rw-btn-lg',
              alert: 'rwp-error',
              note: 'text-[var(--rw-env-muted)]',
              success: 'items-start text-start',
              successIcon: 'text-[var(--rw-env-heading)]',
              successTitle:
                'rw-display text-2xl font-medium text-[var(--rw-env-heading)]',
              successText: 'text-[var(--rw-env-muted)]',
              phoneWrapper: 'shadow-none',
              phoneTrigger: RW_PHONE_EDGE,
              phoneInput: `${RW_PHONE_EDGE} px-3.5 text-base md:text-base`,
            }}
          />
        </div>
      </div>
    </RiwaqBand>
  );
}

/* ------------------------------------------------------------------ */
/* Notice strip                                                         */
/* ------------------------------------------------------------------ */

/** The strip's tone → Riwaq's ground: the brand action fill, the stone, the deep. */
const RW_ANNOUNCEMENT_GROUNDS: Record<AnnouncementTone, RiwaqGround> = {
  brand: 'brand',
  soft: 'stone',
  dark: 'deep',
};

export function RiwaqAnnouncementBar({
  config,
  pages,
  linkRenderer,
}: SectionRenderProps<'announcementBar'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const text = resolveLocalizedText(config.text, locale);
  if (!text) return null;

  return (
    <RiwaqBand
      ground={RW_ANNOUNCEMENT_GROUNDS[config.tone] ?? 'brand'}
      labelledBy={headingId}
      colonnade={false}
      className="rwn-announce"
    >
      <h2 id={headingId} className="sr-only">
        {t('website:renderer.announcement.label')}
      </h2>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <p className="flex min-w-0 items-center gap-3 font-medium">
          <span
            aria-hidden
            className="size-2 shrink-0 bg-[var(--rw-env-marker)]"
          />
          <span className="min-w-0 break-words">{text}</span>
        </p>
        <RiwaqAction
          cta={config.cta}
          pages={pages}
          linkRenderer={linkRenderer}
          variant="line"
        />
      </div>
    </RiwaqBand>
  );
}

/* ------------------------------------------------------------------ */
/* Comparison                                                           */
/* ------------------------------------------------------------------ */

export function RiwaqComparison({
  config,
  linkRenderer,
}: SectionRenderProps<'comparison'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const comparison = resolveComparison(config, locale);
  if (!isDrawableComparison(comparison)) {
    return linkRenderer ? null : (
      <RiwaqPreviewNote>
        {t('website:renderer.comparison.previewEmpty')}
      </RiwaqPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <RiwaqBand
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.comparison.label')}
      colonnade={false}
    >
      <RiwaqSectionHead
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
      />
      <ComparisonTable
        comparison={comparison}
        caption={title}
        classes={{
          table: 'border-y border-[var(--rw-env-rule-strong)]',
          columnHeader:
            'border-b border-[var(--rw-env-rule)] text-[0.875rem] font-medium tracking-[0.04em] text-[var(--rw-env-heading)]',
          highlightHeader: 'rwn-compare-highlight',
          rowHeader: 'font-medium text-[var(--rw-env-heading)]',
          cell: 'text-[var(--rw-env-text)]',
          highlightCell: 'bg-[var(--rw-stone)]',
          row: '[&>*]:border-t [&>*]:border-[var(--rw-env-rule)]',
          yesMark:
            'rounded-none text-[var(--rw-env-heading)] shadow-[inset_0_0_0_1px_var(--rw-env-rule-strong)]',
          noMark: 'rounded-none text-[var(--rw-env-muted)]',
          emptyMark: 'rounded-none text-[var(--rw-env-muted)]',
          text: 'text-[0.9375rem]',
          card: 'rw-cell',
          cardTitle: 'font-medium text-[var(--rw-env-heading)]',
          cardLine:
            'border-t border-[var(--rw-env-rule)] px-2 pt-2 text-[var(--rw-env-text)]',
          cardLineHighlight:
            'border-transparent bg-[var(--rw-stone)] font-medium',
        }}
      />
    </RiwaqBand>
  );
}
