/**
 * Manara — the CMS phase 3d (batch C) sections in the beacon's language
 * (plan §3): bold blocks, rounded cards, pills and the display face.
 *
 * - `interestForm`: a raised card of bold-edged inputs under the block's
 *   heading, the accent button full width on phones.
 * - `announcementBar`: a slim block on the brand block, the soft day or the
 *   night ground — every colour follows the ground (`data-env`), as in any
 *   Manara block.
 * - `comparison`: one card — the highlighted column dyed in the brand block,
 *   ✓ as a pill, ✗ as an outline.
 *
 * Each is the shared body (`sections/bodies/*`) with Manara's classes and
 * ground colours (`--mn-env-*`). An empty comparison is left out publicly;
 * previews say what to add.
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
  ManaraAction,
  ManaraBlock,
  ManaraSectionHeader,
  type ManaraEnv,
} from '../manara-parts';
import { ManaraPreviewNote } from './manara-section-utils';
import '../manara-pages.css';
import '../manara-enrol.css';

/* ------------------------------------------------------------------ */
/* Interest form                                                        */
/* ------------------------------------------------------------------ */

const MN_PHONE_EDGE =
  'h-12 border-2 border-[var(--mn-input-border)] bg-[var(--mn-day)] text-[var(--mn-text)] focus-visible:ring-[var(--mn-env-focus)]';

export function ManaraInterestForm({
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
    <ManaraBlock
      env="soft"
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.interestForm.label')}
    >
      <div className="mx-auto max-w-3xl">
        <ManaraSectionHeader
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
            form: 'mn-card p-6 hover:!transform-none hover:!shadow-none md:p-9',
            label: 'mn-label text-[var(--mn-env-text)]',
            optional: 'mn-muted font-semibold',
            control: 'mn-input min-h-12',
            error: 'mnp-error',
            hint: 'mn-muted',
            submit: 'mn-btn mn-btn-lg',
            alert: 'mnp-error',
            note: 'mn-muted',
            successIcon: 'text-[var(--mn-env-link)]',
            successTitle:
              'mn-font-display text-2xl font-extrabold text-[var(--mn-env-text)]',
            successText: 'mn-muted',
            phoneWrapper: 'shadow-none',
            phoneTrigger: `${MN_PHONE_EDGE} rounded-l-[var(--mn-radius)] border-r-0`,
            phoneInput: `${MN_PHONE_EDGE} rounded-r-[var(--mn-radius)] px-3.5 text-base md:text-base`,
          }}
        />
      </div>
    </ManaraBlock>
  );
}

/* ------------------------------------------------------------------ */
/* Notice strip                                                         */
/* ------------------------------------------------------------------ */

/** The strip's tone → Manara's ground: the brand block, the soft day, the night. */
const MN_ANNOUNCEMENT_ENVS: Record<AnnouncementTone, ManaraEnv> = {
  brand: 'block',
  soft: 'soft',
  dark: 'night',
};

export function ManaraAnnouncementBar({
  config,
  pages,
  linkRenderer,
}: SectionRenderProps<'announcementBar'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const text = resolveLocalizedText(config.text, locale);
  if (!text) return null;
  const env = MN_ANNOUNCEMENT_ENVS[config.tone] ?? 'block';

  return (
    <ManaraBlock env={env} labelledBy={headingId} className="mnn-announce">
      <h2 id={headingId} className="sr-only">
        {t('website:renderer.announcement.label')}
      </h2>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <p className="mn-font-display min-w-0 break-words text-base font-extrabold md:text-lg">
          {text}
        </p>
        <ManaraAction
          cta={config.cta}
          pages={pages}
          linkRenderer={linkRenderer}
          // On the brand block an accent fill can match the block itself
          // (a one-colour brand); the outline always stands out. An Owner's
          // own look still wins.
          variant={env === 'block' ? 'outline' : 'accent'}
          className="mnn-announce-action"
        />
      </div>
    </ManaraBlock>
  );
}

/* ------------------------------------------------------------------ */
/* Comparison                                                           */
/* ------------------------------------------------------------------ */

export function ManaraComparison({
  config,
  linkRenderer,
}: SectionRenderProps<'comparison'>): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const comparison = resolveComparison(config, locale);
  if (!isDrawableComparison(comparison)) {
    return linkRenderer ? null : (
      <ManaraPreviewNote>
        {t('website:renderer.comparison.previewEmpty')}
      </ManaraPreviewNote>
    );
  }
  const title = resolveLocalizedText(config.title, locale);

  return (
    <ManaraBlock
      labelledBy={title ? headingId : undefined}
      label={title ? undefined : t('website:sections.comparison.label')}
    >
      <ManaraSectionHeader
        id={headingId}
        title={title}
        description={resolveLocalizedText(config.description, locale)}
        layout="split"
      />
      <ComparisonTable
        comparison={comparison}
        caption={title}
        classes={{
          table:
            'mn-card !table overflow-hidden [border-collapse:separate] [border-spacing:0] hover:!transform-none hover:!shadow-none max-md:!hidden',
          columnHeader:
            'mn-font-display bg-[var(--mn-env-card-raised)] text-base font-extrabold text-[var(--mn-env-text)]',
          highlightHeader: 'mnn-compare-highlight',
          rowHeader: 'mn-font-display font-bold text-[var(--mn-env-text)]',
          cell: 'text-[var(--mn-env-text)]',
          highlightCell: 'bg-[var(--mn-env-card-raised)]',
          row: '[&>*]:border-t [&>*]:border-[var(--mn-env-line)]',
          yesMark: 'bg-[var(--mn-env-pill)] text-[var(--mn-env-pill-text)]',
          noMark:
            'text-[var(--mn-env-text-muted)] shadow-[inset_0_0_0_1.5px_currentColor]',
          emptyMark: 'text-[var(--mn-env-text-muted)]',
          text: 'font-semibold',
          card: 'mn-card !block hover:!transform-none hover:!shadow-none',
          cardTitle:
            'mn-font-display text-lg font-extrabold text-[var(--mn-env-text)]',
          cardLine:
            'border-t border-[var(--mn-env-line)] px-2 pt-2 text-[var(--mn-env-text)]',
          cardLineHighlight:
            'rounded-[var(--mn-radius)] border-transparent bg-[var(--mn-env-card-raised)] font-bold',
        }}
      />
    </ManaraBlock>
  );
}
