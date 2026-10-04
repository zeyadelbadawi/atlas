/**
 * Atelier hero (plan §5a): a type-led spread, never a split card.
 *
 * - The academy eyebrow, then the oversized display headline across eight
 *   columns with its highlighted phrase in the brand italic; under it the
 *   highlights as a numbered hairline list.
 * - A narrow end column carries the subtitle and description; beside them
 *   (desktop) a tall arch photograph settles into its frame.
 * - The actions (primary + ghost) and the underlined course search close
 *   the spread; the thread starts under them and runs on into Chapter I.
 *
 * Motion: the supporting lines rise once after load (`at-enter`); the
 * headline — the LCP element — is never animated.
 */
import { useId, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useInRouterContext } from 'react-router-dom';
import { cn } from '@utils';
import { usePageOpeningHeading } from '@/features/website/renderer/PageHeadingContext';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import { resolveCatalogHref } from '@/features/website/utils/catalog-url.utils';
import { useT1Navigate } from '@/features/website/modern-education/t1-navigation';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import type { WebsitePage } from '@types';
import {
  AtelierAction,
  AtelierArrow,
  AtelierChapter,
  AtelierHeading,
  AtelierMedia,
  formatAtelierIndex,
} from '../atelier-parts';
import '../atelier-sections.css';

/** The staggered entrance for one supporting element. */
function enter(index: number): { className: string; style: CSSProperties } {
  return {
    className: 'at-enter',
    style: { '--at-enter-index': index } as CSSProperties,
  };
}

function SearchField({
  onSearch,
  enterIndex,
}: {
  readonly onSearch: (query: string) => void;
  readonly enterIndex: number;
}): JSX.Element {
  const { t } = useTranslation();
  const inputId = useId();
  const [query, setQuery] = useState('');
  const motion = enter(enterIndex);
  return (
    <form
      role="search"
      className={cn('ath-hero-search', motion.className)}
      style={motion.style}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(query.trim());
      }}
    >
      <label htmlFor={inputId} className="at-label">
        {t('website:atelier.home.hero.searchLabel')}
      </label>
      <div className="ath-hero-search-row">
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('website:atelier.home.hero.searchPlaceholder')}
          className="ath-underline-input"
          maxLength={100}
        />
        <button type="submit" className="ath-search-submit">
          {t('website:atelier.home.hero.searchSubmit')}
          <AtelierArrow />
        </button>
      </div>
    </form>
  );
}

/** On the public runtime the search opens the catalog filtered by the query. */
function RoutedSearchField({
  pages,
  enterIndex,
}: {
  readonly pages: readonly WebsitePage[];
  readonly enterIndex: number;
}): JSX.Element {
  const navigate = useT1Navigate();
  return (
    <SearchField
      enterIndex={enterIndex}
      onSearch={(query) => {
        const href = resolveCatalogHref(pages, { search: query });
        if (href) navigate(href);
      }}
    />
  );
}

export function AtelierHero({
  config,
  pages,
  linkRenderer,
}: SectionRenderProps<'hero'>): JSX.Element {
  const { locale } = usePublicWebsiteLocale();
  const inRouter = useInRouterContext();
  const headingId = useId();
  const headingLevel = usePageOpeningHeading();
  const eyebrow = resolveLocalizedText(config.eyebrow, locale);
  const subtitle = resolveLocalizedText(config.subtitle, locale);
  const description = resolveLocalizedText(config.description, locale);
  const highlights = (config.highlights ?? [])
    .map((item) => ({
      id: item.id,
      label: resolveLocalizedText(item.label, locale),
    }))
    .filter((item) => item.label)
    .slice(0, 4);
  const hasActions = !!config.cta || !!config.secondaryCta;
  const showSearch = !!config.showSearch && !!resolveCatalogHref(pages);
  const hasImage = !!config.image;

  let index = 0;
  const next = () => enter(index++);
  const eyebrowMotion = eyebrow ? next() : undefined;
  const asideMotion = subtitle || description ? next() : undefined;
  const highlightsMotion = highlights.length > 0 ? next() : undefined;
  const actionsMotion = hasActions ? next() : undefined;
  const searchIndex = showSearch ? index++ : 0;

  return (
    <AtelierChapter labelledBy={headingId} thread="start" className="ath-hero">
      <div
        className={cn(
          'grid gap-12 lg:grid-cols-12 lg:gap-x-10',
          hasImage && 'lg:items-end'
        )}
      >
        <div
          className={cn(
            'min-w-0 space-y-10',
            hasImage ? 'lg:col-span-8' : 'lg:col-span-12'
          )}
        >
          <div className="space-y-6">
            {eyebrowMotion ? (
              <p
                className={cn(
                  'at-label at-label-brand',
                  eyebrowMotion.className
                )}
                style={eyebrowMotion.style}
              >
                {eyebrow}
              </p>
            ) : null}
            <AtelierHeading
              as={headingLevel}
              id={headingId}
              size="display"
              highlight={resolveLocalizedText(config.highlight, locale)}
              className={hasImage ? undefined : 'max-w-[14ch]'}
            >
              {resolveLocalizedText(config.title, locale)}
            </AtelierHeading>
          </div>
          {asideMotion || highlightsMotion ? (
            // Under the headline: the highlights on the start half, the
            // subtitle and description in the narrow end column. On phones
            // the description comes first.
            <div className="grid gap-8 md:grid-cols-2 md:gap-10">
              {asideMotion ? (
                <div
                  className={cn(
                    'space-y-4 md:col-start-2 md:row-start-1',
                    asideMotion.className
                  )}
                  style={asideMotion.style}
                >
                  {subtitle ? (
                    <p className="at-serif ath-hero-subtitle">{subtitle}</p>
                  ) : null}
                  {description ? (
                    <p className="at-lead">{description}</p>
                  ) : null}
                </div>
              ) : null}
              {highlightsMotion ? (
                <ol
                  className={cn(
                    'ath-hero-highlights md:col-start-1 md:row-start-1',
                    highlightsMotion.className
                  )}
                  style={highlightsMotion.style}
                >
                  {highlights.map((item, position) => (
                    <li key={item.id}>
                      <span aria-hidden className="at-numeral">
                        {formatAtelierIndex(position, locale)}
                      </span>
                      <span className="min-w-0">{item.label}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          ) : null}
          {actionsMotion ? (
            <div
              className={cn(
                'flex flex-wrap items-center gap-3',
                actionsMotion.className
              )}
              style={actionsMotion.style}
            >
              <AtelierAction
                cta={config.cta}
                pages={pages}
                linkRenderer={linkRenderer}
                large
              />
              <AtelierAction
                cta={config.secondaryCta}
                pages={pages}
                linkRenderer={linkRenderer}
                variant="ghost"
                large
                arrow={false}
              />
            </div>
          ) : null}
          {showSearch ? (
            linkRenderer && inRouter ? (
              <RoutedSearchField pages={pages} enterIndex={searchIndex} />
            ) : (
              // Previews show the search without navigating anywhere.
              <SearchField
                enterIndex={searchIndex}
                onSearch={() => undefined}
              />
            )
          ) : null}
        </div>

        {hasImage ? (
          <AtelierMedia
            priority
            settle
            shape="arch"
            value={config.image}
            alt={resolveLocalizedText(config.imageAlt, locale)}
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 28rem, 100vw"
            className="ath-hero-media aspect-[4/5] lg:col-span-4"
          />
        ) : null}
      </div>
    </AtelierChapter>
  );
}
