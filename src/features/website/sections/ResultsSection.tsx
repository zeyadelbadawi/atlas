/**
 * Results Section (CMS phase 3d) — the theme-neutral renderer: student
 * results as cards, the result set large (`bodies/ResultsGrid`).
 */
import { useTranslation } from 'react-i18next';
import {
  useWebsiteCardClass,
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import { ResultsGrid } from './bodies/ResultsGrid';
import { resolveResults } from './bodies/section-bodies.logic';
import { PreviewEmptyNote } from './bodies/PreviewEmptyNote';
import { initialsOf } from './bodies/initials';
import type { ResultsSectionConfig } from '@types';

export function ResultsSection({
  config,
  isPublic = false,
}: {
  readonly config: ResultsSectionConfig;
  readonly isPublic?: boolean;
}): JSX.Element | null {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const cardClass = useWebsiteCardClass();
  const { locale } = usePublicWebsiteLocale();
  const results = resolveResults(config, locale, isPublic);
  if (results.length === 0 && isPublic) return null;
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);

  return (
    <section className={`${container} ${section}`}>
      {title || description ? (
        <div className="mb-10 space-y-2 text-center">
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
      {results.length > 0 ? (
        <ResultsGrid
          results={results}
          renderInitials={(name) => (
            <span
              aria-hidden
              className="flex size-full items-center justify-center bg-muted text-lg font-semibold text-foreground"
            >
              {initialsOf(name)}
            </span>
          )}
          classes={{
            card: cardClass,
            media: 'rounded-full',
            result: 'text-2xl font-bold text-foreground sm:text-3xl',
            name: 'text-base font-semibold text-foreground',
            detail: 'text-sm text-muted-foreground',
            topBadge:
              'rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground',
            sampleBadge:
              'rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground',
          }}
        />
      ) : (
        <PreviewEmptyNote className="border-border text-muted-foreground">
          {t('website:renderer.results.previewEmpty')}
        </PreviewEmptyNote>
      )}
    </section>
  );
}
