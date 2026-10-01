/**
 * Theme 1 Home hero (plan §C.0, §C.1 #1): the promise and the first action.
 *
 * - **Desktop (≥ 1024px):** a 55/45 split. The text column has the
 *   eyebrow chip, the display headline with its highlighted phrase, the
 *   lead, the primary and secondary actions, the course search and up to
 *   four highlight chips. Beside it the photograph (4:5) sits on the brand
 *   shape, with the live course-count chip floating over its top corner at
 *   the logical end.
 * - **Tablets and phones:** stacked, text first. The headline is the LCP
 *   element and the promise; the photograph follows at 16:10 / 4:3.
 *
 * Motion (§G): one orchestrated entrance. The supporting elements rise in
 * with a 60ms stagger and the photograph fades in after the text; the
 * headline itself is never animated. Reduced motion renders it static.
 */
import { useId, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageOpeningHeading } from '../renderer/PageHeadingContext';
import { useInRouterContext } from 'react-router-dom';
import { BookOpen, CheckCircle2, Search } from 'lucide-react';
import { usePublicWebsiteStatistics } from '@hooks';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import { resolveCatalogHref } from '../utils/catalog-url.utils';
import type { SectionRenderProps } from '../theme-packs/theme-pack.types';
import type { WebsitePage } from '@types';
import {
  BrandShapeHero,
  T1Action,
  T1Heading,
  T1Media,
  formatT1Number,
} from './t1-parts';
import { useT1Navigate } from './t1-navigation';

/** The staggered entrance index for one supporting element. */
function enter(index: number): { className: string; style: CSSProperties } {
  return {
    className: 't1-enter',
    style: { '--t1-enter-index': index } as CSSProperties,
  };
}

function SearchForm({
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
      className={`flex w-full max-w-xl flex-col gap-2 sm:flex-row ${motion.className}`}
      style={motion.style}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(query.trim());
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        {t('website:theme1.hero.searchLabel')}
      </label>
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-[var(--website-foreground-muted)]"
          aria-hidden
        />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('website:theme1.hero.searchPlaceholder')}
          className="t1-input ps-12"
          maxLength={100}
        />
      </div>
      <button type="submit" className="t1-btn-secondary t1-btn-lg">
        {t('website:theme1.hero.searchSubmit')}
      </button>
    </form>
  );
}

/** On the public runtime the search opens the catalog filtered by the query. */
function RoutedSearch({
  pages,
  enterIndex,
}: {
  readonly pages: readonly WebsitePage[];
  readonly enterIndex: number;
}): JSX.Element {
  const navigate = useT1Navigate();
  return (
    <SearchForm
      enterIndex={enterIndex}
      onSearch={(query) => {
        const href = resolveCatalogHref(pages, { search: query });
        if (href) navigate(href);
      }}
    />
  );
}

function CourseCountChip({
  academyId,
}: {
  readonly academyId: string;
}): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const { data } = usePublicWebsiteStatistics(academyId);
  const count = data?.courses ?? 0;
  if (count <= 0) return null;
  return (
    <div
      data-course-count-chip=""
      className="t1-card absolute end-3 top-3 flex items-center gap-3 py-2.5 pe-4 ps-2.5 shadow-[var(--t1-shadow-lift)] sm:end-4 sm:top-4 lg:-end-6 lg:top-8"
    >
      <span className="t1-icon-tile size-10 rounded-xl">
        <BookOpen className="size-5" aria-hidden />
      </span>
      <p className="leading-tight">
        <span
          className="block text-base font-bold text-[var(--website-foreground)] sm:text-lg"
          data-atlas-numeric="true"
        >
          {t('website:theme1.hero.courseCount', {
            count,
            formatted: formatT1Number(count, locale),
          })}
        </span>
        <span className="text-xs text-[var(--website-foreground-muted)] sm:text-sm">
          {t('website:theme1.hero.courseCountNote')}
        </span>
      </p>
    </div>
  );
}

export function T1Hero({
  config,
  academyId,
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
  const eyebrowMotion = next();
  const subtitleMotion = subtitle ? next() : undefined;
  const leadMotion = description ? next() : undefined;
  const actionsMotion = hasActions ? next() : undefined;
  const searchIndex = showSearch ? index++ : 0;
  const chipsMotion = highlights.length > 0 ? next() : undefined;

  return (
    <section
      aria-labelledby={headingId}
      data-tone="default"
      data-t1-hero=""
      className="relative overflow-hidden text-[var(--website-foreground)]"
    >
      <div
        className={`mx-auto grid w-full max-w-[var(--website-container-width)] gap-12 px-4 pb-16 pt-8 sm:px-6 md:gap-14 md:pb-20 md:pt-12 lg:px-8 lg:pb-24 lg:pt-14 ${hasImage ? 'lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)] lg:items-center lg:gap-16' : ''}`}
      >
        <div
          className={`min-w-0 space-y-6 md:space-y-7 ${hasImage ? '' : 'mx-auto max-w-3xl text-center [&_.t1-lead]:mx-auto [&>*]:mx-auto'}`}
        >
          {eyebrow ? (
            <p
              className={`inline-flex min-h-8 items-center rounded-full bg-[var(--website-chip-bg)] px-3.5 text-sm font-semibold text-[var(--website-chip-fg)] ${eyebrowMotion.className}`}
              style={eyebrowMotion.style}
            >
              {eyebrow}
            </p>
          ) : null}
          <T1Heading
            as={headingLevel}
            id={headingId}
            size="display"
            highlight={resolveLocalizedText(config.highlight, locale)}
          >
            {resolveLocalizedText(config.title, locale)}
          </T1Heading>
          {subtitle && subtitleMotion ? (
            <p
              className={`text-lg font-semibold text-[var(--website-foreground)] ${subtitleMotion.className}`}
              style={subtitleMotion.style}
            >
              {subtitle}
            </p>
          ) : null}
          {description && leadMotion ? (
            <p
              className={`t1-lead max-w-xl ${leadMotion.className}`}
              style={leadMotion.style}
            >
              {description}
            </p>
          ) : null}
          {actionsMotion ? (
            <div
              className={`flex flex-wrap items-center gap-3 ${hasImage ? '' : 'justify-center'} ${actionsMotion.className}`}
              style={actionsMotion.style}
            >
              <T1Action
                cta={config.cta}
                pages={pages}
                linkRenderer={linkRenderer}
                large
                arrow
              />
              <T1Action
                cta={config.secondaryCta}
                pages={pages}
                linkRenderer={linkRenderer}
                variant="secondary"
                large
              />
            </div>
          ) : null}
          {showSearch ? (
            linkRenderer && inRouter ? (
              <RoutedSearch pages={pages} enterIndex={searchIndex} />
            ) : (
              // Previews show the search without navigating anywhere.
              <SearchForm enterIndex={searchIndex} onSearch={() => undefined} />
            )
          ) : null}
          {chipsMotion ? (
            <ul
              className={`flex flex-wrap gap-x-6 gap-y-3 ${hasImage ? '' : 'justify-center'} ${chipsMotion.className}`}
              style={chipsMotion.style}
            >
              {highlights.map((item) => (
                <li
                  key={item.id}
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--website-foreground)]"
                >
                  <CheckCircle2
                    className="size-5 shrink-0 text-[var(--website-link)]"
                    aria-hidden
                  />
                  {item.label}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {hasImage ? (
          <div className="t1-enter-media relative mx-auto w-full max-w-2xl lg:max-w-[35rem]">
            <BrandShapeHero className="-top-8 start-10 hidden h-[calc(100%+4rem)] w-[calc(100%-1rem)] sm:block" />
            <T1Media
              priority
              value={config.image}
              alt={resolveLocalizedText(config.imageAlt, locale)}
              sizes="(min-width: 1024px) 560px, (min-width: 672px) 672px, 100vw"
              className="aspect-[4/3] rounded-[24px] shadow-[var(--t1-shadow-lift)] md:aspect-[16/10] lg:aspect-[4/5]"
            />
            <CourseCountChip academyId={academyId} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
