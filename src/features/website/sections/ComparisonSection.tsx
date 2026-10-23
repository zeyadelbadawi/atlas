/**
 * Comparison (CMS phase 3d, batch C) — the theme-neutral renderer the
 * retired themes use: a real table on desktop, a card per row on phones
 * (`bodies/ComparisonTable`).
 */
import { useTranslation } from 'react-i18next';
import {
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type { ComparisonSectionConfig } from '@types';
import { ComparisonTable } from './bodies/ComparisonTable';
import {
  isDrawableComparison,
  resolveComparison,
} from './bodies/comparison.logic';
import { PreviewEmptyNote } from './bodies/PreviewEmptyNote';

export function ComparisonSection({
  config,
  isPublic,
}: {
  readonly config: ComparisonSectionConfig;
  readonly isPublic: boolean;
}): JSX.Element | null {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const { locale } = usePublicWebsiteLocale();
  const comparison = resolveComparison(config, locale);
  const drawable = isDrawableComparison(comparison);
  if (!drawable && isPublic) return null;
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);

  return (
    <section className={`${container} ${section}`}>
      {title || description ? (
        <div className="mb-8 space-y-2 text-center">
          {title ? (
            <h2 className={`${heading} text-3xl text-foreground`}>{title}</h2>
          ) : null}
          {description ? (
            <p className="mx-auto max-w-2xl text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {drawable ? (
        <ComparisonTable
          comparison={comparison}
          caption={title}
          classes={{
            table: 'overflow-hidden rounded-lg border border-border',
            columnHeader:
              'border-b border-border bg-muted text-sm font-semibold text-foreground',
            highlightHeader: 'bg-[var(--website-primary-solid)] text-white',
            rowHeader: 'font-medium text-foreground',
            cell: 'text-sm text-foreground',
            highlightCell: 'bg-muted/60',
            row: 'border-t border-border',
            yesMark: 'bg-[var(--website-primary-solid)] text-white',
            noMark: 'bg-muted text-muted-foreground',
            emptyMark: 'text-muted-foreground',
            card: 'rounded-lg border border-border bg-card',
            cardTitle: 'font-semibold text-foreground',
            cardLine: 'border-t border-border pt-2 text-sm',
            cardLineHighlight: 'font-semibold',
            cardTerm: 'text-muted-foreground',
          }}
        />
      ) : (
        <PreviewEmptyNote className="border-border text-muted-foreground">
          {t('website:renderer.comparison.previewEmpty')}
        </PreviewEmptyNote>
      )}
    </section>
  );
}
