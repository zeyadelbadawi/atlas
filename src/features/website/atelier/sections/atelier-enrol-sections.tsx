/**
 * Atelier — the CMS phase 3d (batch C) sections as pages of the studio
 * publication (plan §2):
 *
 * - `interestForm`: a letter — underlined fields with tracked labels above,
 *   beside the chapter's title (the contact page's form language).
 * - `announcementBar`: a slim colophon line across the page on the brand
 *   fill, the deep paper or the ink ground, with one quiet action.
 * - `comparison`: a ruled ledger — hairline rows, the display face for the
 *   criteria, the highlighted column set on the deep paper.
 *
 * Each is the shared body (`sections/bodies/*`) with Atelier's classes and
 * colours (`--atelier-*`, `--website-*`). An empty comparison is left out
 * publicly; previews say what to add.
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
  ATELIER_INK_LOOKS,
  ATELIER_LOOKS,
  AtelierAction,
  AtelierChapter,
  AtelierSectionHeader,
  type AtelierEnv,
} from '../atelier-parts';
import { AtelierPreviewNote } from './atelier-section-utils';
import '../atelier-pages.css';
import '../atelier-enrol.css';

/* ------------------------------------------------------------------ */
/* Interest form — the letter                                           */
/* ------------------------------------------------------------------ */

const AT_PHONE_EDGE =
  'h-12 rounded-none border-0 border-b border-[var(--website-input-border)] bg-transparent text-[1.0625rem] text-[var(--atelier-text)] shadow-none focus-visible:ring-[var(--atelier-brand)]';

export function AtelierInterestForm({
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
    <AtelierChapter
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.interestForm.label')}
      numbered
    >
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="min-w-0 lg:col-span-5">
          <AtelierSectionHeader
            id={headingId}
            title={title}
            description={resolveLocalizedText(config.description, locale)}
            className="!mb-0"
          />
        </div>
        <div className="atp-letter min-w-0 lg:col-span-7">
          <InterestForm
            config={config}
            academyId={academyId}
            sectionId={sectionId}
            isPublic={!!linkRenderer}
            labelledBy={title ? headingId : undefined}
            classes={{
              label: 'atp-field-label',
              optional: 'normal-case tracking-normal',
              control: 'atp-field min-h-12',
              error: 'atp-error',
              hint: 'text-[var(--atelier-text-muted)]',
              submit: 'at-btn at-btn-lg',
              alert: 'atp-error',
              note: 'text-[var(--atelier-text-muted)]',
              success: 'items-start text-start',
              successIcon: 'text-[var(--atelier-brand)]',
              successTitle: 'at-subtitle',
              successText: 'at-lead',
              phoneWrapper: 'shadow-none',
              phoneTrigger: `${AT_PHONE_EDGE} px-0 pe-3`,
              phoneInput: `${AT_PHONE_EDGE} px-3`,
            }}
          />
        </div>
      </div>
    </AtelierChapter>
  );
}

/* ------------------------------------------------------------------ */
/* Notice strip — the colophon line                                     */
/* ------------------------------------------------------------------ */

/** The strip's tone → Atelier's ground: the brand fill, the deep paper, the ink. */
const AT_ANNOUNCEMENT_ENVS: Record<AnnouncementTone, AtelierEnv> = {
  brand: 'brand',
  soft: 'deep',
  dark: 'ink',
};

export function AtelierAnnouncementBar({
  config,
  pages,
  linkRenderer,
}: SectionRenderProps<'announcementBar'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const text = resolveLocalizedText(config.text, locale);
  if (!text) return null;
  const env = AT_ANNOUNCEMENT_ENVS[config.tone] ?? 'brand';

  return (
    <AtelierChapter
      env={env}
      labelledBy={headingId}
      thread="none"
      className="atn-announce"
    >
      <h2 id={headingId} className="sr-only">
        {t('website:renderer.announcement.label')}
      </h2>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <p className="atn-announce-text min-w-0 break-words">{text}</p>
        <AtelierAction
          cta={config.cta}
          pages={pages}
          linkRenderer={linkRenderer}
          variant={env === 'ink' ? 'inkGhost' : 'link'}
          looks={env === 'ink' ? ATELIER_INK_LOOKS : ATELIER_LOOKS}
          className="atn-announce-action"
        />
      </div>
    </AtelierChapter>
  );
}

/* ------------------------------------------------------------------ */
/* Comparison — the ruled ledger                                        */
/* ------------------------------------------------------------------ */

export function AtelierComparison({
  config,
  linkRenderer,
}: SectionRenderProps<'comparison'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const comparison = resolveComparison(config, locale);
  if (!isDrawableComparison(comparison)) {
    return linkRenderer ? null : (
      <AtelierPreviewNote>
        {t('website:renderer.comparison.previewEmpty')}
      </AtelierPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <AtelierChapter
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.comparison.label')}
      numbered
    >
      <AtelierSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        layout="split"
      />
      <ComparisonTable
        comparison={comparison}
        caption={title}
        classes={{
          table: 'border-b border-[var(--atelier-hairline)]',
          columnHeader:
            'at-label border-b border-[var(--atelier-text)] !text-[var(--atelier-text)]',
          highlightHeader:
            'bg-[var(--atelier-paper-deep)] shadow-[inset_0_2px_0_var(--atelier-brand)]',
          rowHeader: 'at-serif text-lg font-normal text-[var(--atelier-text)]',
          cell: 'text-[var(--atelier-text)]',
          highlightCell: 'bg-[var(--atelier-paper-deep)]',
          row: '[&>*]:border-t [&>*]:border-[var(--atelier-hairline)]',
          yesMark:
            'text-[var(--atelier-brand)] shadow-[inset_0_0_0_1px_var(--atelier-brand)]',
          noMark: 'text-[var(--atelier-text-muted)]',
          emptyMark: 'text-[var(--atelier-text-muted)]',
          text: 'text-[0.9375rem]',
          card: 'border-b border-[var(--atelier-hairline)] !px-0',
          cardTitle: 'at-serif text-xl text-[var(--atelier-text)]',
          cardLine:
            'border-t border-[var(--atelier-hairline)] px-2 pt-2 text-[var(--atelier-text)]',
          cardLineHighlight:
            'border-transparent bg-[var(--atelier-paper-deep)] font-medium',
        }}
      />
    </AtelierChapter>
  );
}
