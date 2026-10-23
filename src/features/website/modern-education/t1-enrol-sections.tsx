/**
 * Theme 1 renderers for the CMS phase 3d (batch C) sections: the "register
 * your interest" form, the notice strip and the comparison table. What each
 * draws is the shared body (`sections/bodies/*`); this file gives it Theme
 * 1's frame, heading, card, inputs, actions and brand-mapped colours
 * (`--website-*`). Nothing here reads a raw brand colour.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Megaphone } from 'lucide-react';
import type { AnnouncementTone } from '@types';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { SectionRenderProps } from '../theme-packs/theme-pack.types';
import { InterestForm } from '../sections/bodies/InterestForm';
import { ComparisonTable } from '../sections/bodies/ComparisonTable';
import {
  isDrawableComparison,
  resolveComparison,
} from '../sections/bodies/comparison.logic';
import { PreviewEmptyNote } from '../sections/bodies/PreviewEmptyNote';
import {
  T1Action,
  T1Section,
  T1SectionHeader,
  T1_INK_LOOKS,
  T1_LOOKS,
  type T1Tone,
} from './t1-parts';

/* ------------------------------------------------------------------ */
/* Interest form                                                        */
/* ------------------------------------------------------------------ */

const T1_PHONE_EDGE =
  'h-[3.25rem] border-[var(--website-input-border)] bg-[var(--website-background)] text-[var(--website-foreground)]';

export function T1InterestForm({
  config,
  academyId,
  sectionId,
  linkRenderer,
}: SectionRenderProps<'interestForm'>): JSX.Element {
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const title = resolveLocalizedText(config.title, locale);

  return (
    <T1Section labelledBy={title ? headingId : undefined}>
      <div className="mx-auto max-w-3xl">
        <T1SectionHeader
          id={headingId}
          title={title}
          description={resolveLocalizedText(config.description, locale)}
          align="center"
        />
        <InterestForm
          config={config}
          academyId={academyId}
          sectionId={sectionId}
          isPublic={!!linkRenderer}
          labelledBy={title ? headingId : undefined}
          classes={{
            form: 't1-card p-6 md:p-9',
            label: 'text-sm font-semibold text-[var(--website-foreground)]',
            optional: 'text-[var(--website-foreground-muted)]',
            control: 't1-input min-h-[3.25rem]',
            error: 'font-medium text-[var(--website-error)]',
            hint: 'text-[var(--website-foreground-muted)]',
            submit: 't1-cta t1-btn-lg',
            alert: 'font-medium text-[var(--website-error)]',
            note: 'text-[var(--website-foreground-muted)]',
            successIcon: 'text-[var(--website-link)]',
            successTitle:
              'font-display text-2xl font-bold text-[var(--website-foreground)]',
            successText: 'text-[var(--website-foreground-muted)]',
            phoneWrapper: 'shadow-none',
            phoneTrigger: `${T1_PHONE_EDGE} rounded-l-[var(--t1-radius-control)] focus-visible:ring-[var(--website-focus)]`,
            phoneInput: `${T1_PHONE_EDGE} rounded-r-[var(--t1-radius-control)] px-4 text-base md:text-base focus-visible:ring-[var(--website-focus)]`,
          }}
        />
      </div>
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* Notice strip                                                         */
/* ------------------------------------------------------------------ */

/** The strip's tone → Theme 1's ground: the brand fill, the soft band, the ink band. */
const T1_ANNOUNCEMENT_TONES: Record<AnnouncementTone, T1Tone> = {
  brand: 'brand',
  soft: 'soft',
  dark: 'ink',
};

export function T1AnnouncementBar({
  config,
  pages,
  linkRenderer,
}: SectionRenderProps<'announcementBar'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const text = resolveLocalizedText(config.text, locale);
  if (!text) return null;
  const tone = T1_ANNOUNCEMENT_TONES[config.tone] ?? 'brand';
  const ink = tone === 'ink';

  return (
    <T1Section tone={tone} labelledBy={headingId} className="t1-announce">
      <h2 id={headingId} className="sr-only">
        {t('website:renderer.announcement.label')}
      </h2>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <p className="flex min-w-0 items-start gap-2.5 text-[0.9375rem] font-semibold leading-6 md:text-base">
          <Megaphone
            aria-hidden
            className="mt-0.5 size-5 shrink-0"
            strokeWidth={1.75}
          />
          <span className="min-w-0 break-words">{text}</span>
        </p>
        <T1Action
          cta={config.cta}
          pages={pages}
          linkRenderer={linkRenderer}
          variant={ink ? 'ink' : 'primary'}
          looks={ink ? T1_INK_LOOKS : T1_LOOKS}
          className="t1-announce-action"
        />
      </div>
    </T1Section>
  );
}

/* ------------------------------------------------------------------ */
/* Comparison                                                           */
/* ------------------------------------------------------------------ */

export function T1Comparison({
  config,
  linkRenderer,
}: SectionRenderProps<'comparison'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const comparison = resolveComparison(config, locale);
  const drawable = isDrawableComparison(comparison);
  if (!drawable && linkRenderer) return null;
  const title = resolveLocalizedText(config.title, locale);

  return (
    <T1Section labelledBy={title ? headingId : undefined}>
      <T1SectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
      />
      {drawable ? (
        <ComparisonTable
          comparison={comparison}
          caption={title}
          classes={{
            table:
              't1-card overflow-hidden [border-collapse:separate] [border-spacing:0]',
            columnHeader:
              'bg-[var(--website-surface)] font-display text-base font-bold text-[var(--website-foreground)]',
            highlightHeader:
              'bg-[var(--website-chip-bg)] text-[var(--website-chip-fg)] shadow-[inset_0_3px_0_var(--website-cta)]',
            rowHeader: 'font-semibold text-[var(--website-foreground)]',
            cell: 'text-[var(--website-foreground)]',
            highlightCell: 'bg-[var(--website-chip-bg)]',
            row: '[&>*]:border-t [&>*]:border-[var(--website-border)]',
            yesMark:
              'bg-[var(--website-icon-tile)] text-[var(--website-icon-fg)]',
            noMark:
              'bg-[var(--website-surface-muted)] text-[var(--website-foreground-muted)]',
            emptyMark: 'text-[var(--website-foreground-muted)]',
            text: 'text-[0.9375rem] font-semibold',
            card: 't1-card',
            cardTitle:
              'font-display text-base font-bold text-[var(--website-foreground)]',
            cardLine:
              'border-t border-[var(--website-border)] px-2 pt-2 text-[0.9375rem] text-[var(--website-foreground)]',
            cardLineHighlight:
              'rounded-[var(--t1-radius-control)] border-transparent bg-[var(--website-chip-bg)] font-semibold',
          }}
        />
      ) : (
        <PreviewEmptyNote className="rounded-[var(--t1-radius-card)] border-[var(--website-input-border)] text-[var(--website-foreground-muted)]">
          {t('website:renderer.comparison.previewEmpty')}
        </PreviewEmptyNote>
      )}
    </T1Section>
  );
}
