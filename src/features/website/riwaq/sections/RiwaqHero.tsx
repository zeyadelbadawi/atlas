/**
 * Riwaq hero — the Portico (plan §4 #1).
 *
 * - The label line (the academy's name · the eyebrow) in the start rail,
 *   the display headline with its marked phrase, the subtitle and lead.
 * - The actions, then the highlights as a spec row of ruled cells, then
 *   the optional course search.
 * - The photograph in a window between two column lines on the reading
 *   end, with the academy's crest overlapping its start corner.
 * - Behind it the colonnade's columns rise once at load (CSS; final state
 *   on the server, under reduced motion and without JavaScript).
 *
 * Phone order: headline → actions → spec row → photograph (5:4). The
 * headline never animates (it is the LCP text); supporting lines enter once.
 */
import { useId, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useInRouterContext } from 'react-router-dom';
import { cn } from '@utils';
import { usePageOpeningHeading } from '@/features/website/renderer/PageHeadingContext';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { useWebsiteIdentity } from '@/features/website/renderer/WebsiteIdentityContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import { resolveCatalogHref } from '@/features/website/utils/catalog-url.utils';
import { useT1Navigate } from '@/features/website/modern-education/t1-navigation';
import { MAX_HERO_HIGHLIGHTS } from '@/features/website/constants/website.constants';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import type { WebsitePage } from '@types';
import {
  RiwaqAction,
  RiwaqArrow,
  RiwaqCrest,
  RiwaqHeading,
  RiwaqWindow,
  riwaqEnter,
} from '../riwaq-parts';
import '../riwaq-sections.css';

/** The window's rendered width: five columns on desktop, the viewport on phones. */
const WINDOW_SIZES = '(min-width: 1024px) 38vw, (min-width: 768px) 44vw, 100vw';
const COLUMN_COUNT = 12;

/** The hero's column rules: real elements so each can rise in turn. */
function RisingColumns(): JSX.Element {
  return (
    <span aria-hidden className="rw-columns">
      {Array.from({ length: COLUMN_COUNT }, (_, index) => (
        <span key={index} style={{ '--rw-i': index } as CSSProperties} />
      ))}
    </span>
  );
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
  const motion = riwaqEnter(enterIndex);
  return (
    <form
      role="search"
      className={cn('rwh-search', motion.className)}
      style={motion.style}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(query.trim());
      }}
    >
      <label htmlFor={inputId} className="rw-label">
        {t('website:riwaq.home.hero.searchLabel')}
      </label>
      <div className="rwh-search-row">
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('website:riwaq.home.hero.searchPlaceholder')}
          className="rw-input"
          maxLength={100}
        />
        <button type="submit" className="rw-btn">
          {t('website:riwaq.home.hero.searchSubmit')}
          <RiwaqArrow />
        </button>
      </div>
    </form>
  );
}

/** On the public runtime the search opens the catalogue filtered by the query. */
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

export function RiwaqHero({
  config,
  pages,
  linkRenderer,
}: SectionRenderProps<'hero'>): JSX.Element {
  const { locale } = usePublicWebsiteLocale();
  const { name: academyName } = useWebsiteIdentity();
  const inRouter = useInRouterContext();
  const headingId = useId();
  const headingLevel = usePageOpeningHeading();
  const eyebrow = resolveLocalizedText(config.eyebrow, locale);
  const title = resolveLocalizedText(config.title, locale);
  const subtitle = resolveLocalizedText(config.subtitle, locale);
  const description = resolveLocalizedText(config.description, locale);
  const highlights = (config.highlights ?? [])
    .map((item) => ({
      id: item.id,
      label: resolveLocalizedText(item.label, locale),
    }))
    .filter((item) => item.label)
    .slice(0, MAX_HERO_HIGHLIGHTS);
  const hasActions = !!config.cta || !!config.secondaryCta;
  const showSearch = !!config.showSearch && !!resolveCatalogHref(pages);
  const hasImage = !!config.image;
  // The label line: the academy, then the eyebrow — whichever exist (the
  // name once: an eyebrow that already carries it stands alone).
  const labelParts =
    academyName && eyebrow.includes(academyName)
      ? [eyebrow]
      : [academyName, eyebrow].filter(Boolean);

  let index = 0;
  const next = () => riwaqEnter(index++);
  const labelMotion = labelParts.length > 0 ? next() : undefined;
  const subtitleMotion = subtitle ? next() : undefined;
  const descriptionMotion = description ? next() : undefined;
  const actionsMotion = hasActions ? next() : undefined;
  const specsMotion = highlights.length > 0 ? next() : undefined;
  const searchIndex = showSearch ? index++ : 0;

  return (
    <section
      aria-labelledby={headingId}
      data-ground="porcelain"
      data-colonnade="off"
      className="rw-band rwh-hero"
    >
      <div className="rw-container">
        <RisingColumns />
        <div className="rw-grid rwh-hero-grid" data-image={hasImage ? '' : undefined}>
          <div className="rwh-hero-copy">
            {labelMotion ? (
              <p
                className={cn('rw-label rwh-hero-label', labelMotion.className)}
                style={labelMotion.style}
                data-mark=""
              >
                {labelParts.map((part, partIndex) => (
                  <span key={partIndex} dir="auto">
                    {partIndex > 0 ? (
                      <span aria-hidden className="rwh-hero-label-sep">
                        /
                      </span>
                    ) : null}
                    {part}
                  </span>
                ))}
              </p>
            ) : null}
            <RiwaqHeading
              as={headingLevel}
              id={headingId}
              size="display"
              highlight={resolveLocalizedText(config.highlight, locale)}
              className="rwh-hero-title"
            >
              {title}
            </RiwaqHeading>
            {subtitleMotion ? (
              <p
                className={cn('rw-subtitle rwh-hero-subtitle', subtitleMotion.className)}
                style={subtitleMotion.style}
              >
                {subtitle}
              </p>
            ) : null}
            {descriptionMotion ? (
              <p
                className={cn('rw-lead', descriptionMotion.className)}
                style={descriptionMotion.style}
              >
                {description}
              </p>
            ) : null}
            {actionsMotion ? (
              <div
                className={cn('rwh-hero-actions', actionsMotion.className)}
                style={actionsMotion.style}
              >
                <RiwaqAction
                  cta={config.cta}
                  pages={pages}
                  linkRenderer={linkRenderer}
                  large
                />
                <RiwaqAction
                  cta={config.secondaryCta}
                  pages={pages}
                  linkRenderer={linkRenderer}
                  variant="line"
                  large
                  arrow={false}
                />
              </div>
            ) : null}
            {specsMotion ? (
              <ul
                className={cn('rw-specs rwh-hero-specs', specsMotion.className)}
                style={specsMotion.style}
              >
                {highlights.map((item) => (
                  <li key={item.id} className="rw-tick">
                    {item.label}
                  </li>
                ))}
              </ul>
            ) : null}
            {showSearch ? (
              linkRenderer && inRouter ? (
                <RoutedSearchField pages={pages} enterIndex={searchIndex} />
              ) : (
                // Previews show the search without navigating anywhere.
                <SearchField enterIndex={searchIndex} onSearch={() => undefined} />
              )
            ) : null}
          </div>

          {hasImage ? (
            <div className="rwh-hero-media">
              <RiwaqWindow
                priority
                develop
                value={config.image}
                alt={resolveLocalizedText(config.imageAlt, locale)}
                sizes={WINDOW_SIZES}
                className="rwh-hero-window aspect-[5/4] md:aspect-[4/5]"
              />
              {academyName ? (
                <RiwaqCrest name={academyName} className="rwh-hero-crest" />
              ) : null}
            </div>
          ) : academyName ? (
            <div className="rwh-hero-media" data-crest-only="">
              <RiwaqCrest name={academyName} size="min(16rem, 60vw)" turn />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
