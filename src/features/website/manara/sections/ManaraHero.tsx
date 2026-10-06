/**
 * Manara hero — the Stage (plan §3.10 #1): a night block with the beam
 * sweeping once across it at load.
 *
 * - The eyebrow with its rule, then the display headline with the
 *   highlighted phrase under the beam's marker stroke; the subtitle and
 *   the lead under it.
 * - The actions (Join = accent, Courses = outline), then the highlights as
 *   proof pills, then the underlined course search.
 * - The poster photograph on the end side, cut on opposite corners; on
 *   phones it closes the stage as a 3:2 banner.
 *
 * Phone order: headline → actions → pills → poster. The headline never
 * animates (it is the LCP text); the supporting lines rise once after load
 * (`mn-enter`). Everything renders complete on the server.
 */
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInRouterContext } from 'react-router-dom';
import { cn } from '@utils';
import { usePageOpeningHeading } from '@/features/website/renderer/PageHeadingContext';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import { resolveCatalogHref } from '@/features/website/utils/catalog-url.utils';
import { useT1Navigate } from '@/features/website/modern-education/t1-navigation';
import { MAX_HERO_HIGHLIGHTS } from '@/features/website/constants/website.constants';
import type { SectionRenderProps } from '@/features/website/theme-packs/theme-pack.types';
import type { WebsitePage } from '@types';
import {
  ManaraAction,
  ManaraArrow,
  ManaraBlock,
  ManaraHeading,
  ManaraMedia,
  ManaraPill,
  manaraEnter,
} from '../manara-parts';
import '../manara-sections.css';

/** The poster's rendered width: the end column on desktop, the viewport on phones. */
const POSTER_SIZES = '(min-width: 1024px) 36vw, 100vw';

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
  const motion = manaraEnter(enterIndex);
  return (
    <form
      role="search"
      className={cn('mnh-search', motion.className)}
      style={motion.style}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(query.trim());
      }}
    >
      <label htmlFor={inputId} className="mn-label mnh-search-label">
        {t('website:manara.home.hero.searchLabel')}
      </label>
      <div className="mnh-search-row">
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('website:manara.home.hero.searchPlaceholder')}
          className="mnh-search-input"
          maxLength={100}
        />
        <button type="submit" className="mnh-search-submit">
          {t('website:manara.home.hero.searchSubmit')}
          <ManaraArrow />
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

export function ManaraHero({
  config,
  pages,
  linkRenderer,
}: SectionRenderProps<'hero'>): JSX.Element {
  const { locale } = usePublicWebsiteLocale();
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

  let index = 0;
  const next = () => manaraEnter(index++);
  const eyebrowMotion = eyebrow ? next() : undefined;
  const subtitleMotion = subtitle ? next() : undefined;
  const descriptionMotion = description ? next() : undefined;
  const actionsMotion = hasActions ? next() : undefined;
  const pillsMotion = highlights.length > 0 ? next() : undefined;
  const searchIndex = showSearch ? index++ : 0;

  return (
    <ManaraBlock
      env="night"
      labelledBy={headingId}
      beam="end"
      sweep
      className="mnh-hero"
    >
      <div
        className={cn(
          'grid gap-10 lg:grid-cols-12 lg:gap-x-10',
          hasImage && 'lg:items-center'
        )}
      >
        <div
          className={cn(
            'mnh-hero-copy min-w-0',
            hasImage ? 'lg:col-span-7' : 'lg:col-span-10'
          )}
        >
          {eyebrowMotion ? (
            <div
              className={cn('mnh-eyebrow', eyebrowMotion.className)}
              style={eyebrowMotion.style}
            >
              <span aria-hidden className="mn-rule" />
              <p className="mn-label">{eyebrow}</p>
            </div>
          ) : null}
          <ManaraHeading
            as={headingLevel}
            id={headingId}
            size="display"
            highlight={resolveLocalizedText(config.highlight, locale)}
            className="mnh-hero-title"
          >
            {title}
          </ManaraHeading>
          {subtitleMotion ? (
            <p
              className={cn(
                'mn-subtitle mnh-hero-subtitle',
                subtitleMotion.className
              )}
              style={subtitleMotion.style}
            >
              {subtitle}
            </p>
          ) : null}
          {descriptionMotion ? (
            <p
              className={cn(
                'mn-lead mn-muted mnh-hero-lead',
                descriptionMotion.className
              )}
              style={descriptionMotion.style}
            >
              {description}
            </p>
          ) : null}
          {actionsMotion ? (
            <div
              className={cn('mnh-hero-actions', actionsMotion.className)}
              style={actionsMotion.style}
            >
              <ManaraAction
                cta={config.cta}
                pages={pages}
                linkRenderer={linkRenderer}
                large
              />
              <ManaraAction
                cta={config.secondaryCta}
                pages={pages}
                linkRenderer={linkRenderer}
                variant="outline"
                large
                arrow={false}
              />
            </div>
          ) : null}
          {pillsMotion ? (
            <ul
              className={cn('mnh-hero-pills', pillsMotion.className)}
              style={pillsMotion.style}
            >
              {highlights.map((item) => (
                <li key={item.id}>
                  <ManaraPill className="mnh-hero-pill">
                    {item.label}
                  </ManaraPill>
                </li>
              ))}
            </ul>
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
          <ManaraMedia
            priority
            shape="poster"
            value={config.image}
            alt={resolveLocalizedText(config.imageAlt, locale)}
            sizes={POSTER_SIZES}
            className="mnh-hero-poster aspect-[3/2] lg:col-span-5 lg:aspect-[4/5]"
          />
        ) : null}
      </div>
    </ManaraBlock>
  );
}
