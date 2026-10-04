/**
 * Atelier inner-page masthead (Reports/THEME_2_ATELIER_PLAN.md §5a,
 * `pageHeader`): a small-caps trail, the display title, the lead, the
 * page's search when configured, a hairline beneath, and — when the
 * section has one — a tall arch photograph on the end side.
 *
 * - `search: 'courses'`: an underlined course search that hands the query
 *   to the catalog on the same page (or opens the catalog), with a live
 *   summary of the catalog — the same behaviour as Theme 1.
 * - `search: 'faq'`: the question filter the FAQ list below applies (the
 *   shared filter store; cleared when the masthead leaves the page).
 *
 * The opening heading level comes from `usePageOpeningHeading()`: the
 * page's one `<h1>` when this masthead owns it, else an `<h2>`.
 * `AtelierPageIntro` draws the same masthead for an existing page with no
 * page header (presentation only, nothing written).
 */
import { useEffect, useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useInRouterContext } from 'react-router-dom';
import { cn } from '@utils';
import {
  usePublicCourseCategories,
  usePublicWebsiteStatistics,
  useRequestLocation,
} from '@hooks';
import { usePageOpeningHeading } from '@/features/website/renderer/PageHeadingContext';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';
import { resolvePagePath } from '@/features/website/utils/link-resolution.utils';
import {
  fromCatalogSearch,
  resolveCatalogHref,
  sendSearchToCatalog,
} from '@/features/website/utils/catalog-url.utils';
import { setFaqFilter } from '@/features/website/modern-education/t1-faq-filter';
import type {
  SectionRenderProps,
  ThemePageIntroProps,
} from '@/features/website/theme-packs/theme-pack.types';
import type { WebsitePage } from '@types';
import type { WebsiteLinkRenderer } from '@/features/website/renderer/website-link-renderer.types';
import {
  AtelierChapter,
  AtelierHeading,
  AtelierLink,
  AtelierMedia,
  formatAtelierNumber,
} from '../atelier-parts';
import { useAtelierNavigate } from './atelier-navigation';
import '../atelier-pages.css';

/* ------------------------------------------------------------------ */
/* Trail                                                                */
/* ------------------------------------------------------------------ */

/**
 * Home / the current page, in small caps. Home is a link only while it is a
 * visible page other than this one; with nothing to lead back to, the
 * current label stands alone.
 */
function Trail({
  pages,
  owner,
  current,
  linkRenderer,
}: {
  readonly pages: readonly WebsitePage[];
  readonly owner: WebsitePage | undefined;
  readonly current: string;
  readonly linkRenderer?: WebsiteLinkRenderer;
}): JSX.Element | null {
  const { t } = useTranslation();
  const home = pages.find((page) => page.coreType === 'home');
  const showHome = !!home && !!owner && owner.id !== home.id;
  if (!showHome) {
    return current ? <p className="at-label">{current}</p> : null;
  }
  return (
    <nav aria-label={t('website:atelier.pages.trail.label')}>
      <ol className="atp-trail at-label">
        <li>
          <AtelierLink
            href={linkRenderer ? resolvePagePath(home) : undefined}
            linkRenderer={linkRenderer}
            className="atp-text-btn min-h-0"
          >
            {t('website:atelier.pages.trail.home')}
          </AtelierLink>
        </li>
        {current ? (
          <li>
            <span aria-current="page">{current}</span>
          </li>
        ) : null}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Searches                                                             */
/* ------------------------------------------------------------------ */

function CatalogSearchForm({
  initial,
  onSearch,
}: {
  readonly initial: string;
  readonly onSearch: (query: string) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const inputId = useId();
  const [query, setQuery] = useState(initial);
  return (
    <form
      role="search"
      className="atp-search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(query.trim());
      }}
    >
      <div className="min-w-0 flex-1">
        <label htmlFor={inputId} className="atp-field-label">
          {t('website:renderer.courseCatalog.searchLabel')}
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('website:atelier.pages.search.placeholder')}
          className="atp-field"
          maxLength={100}
        />
      </div>
      <button type="submit" className="at-btn">
        {t('website:atelier.pages.search.submit')}
      </button>
    </form>
  );
}

/** On the public runtime: hand the search to the catalog below, else open it. */
function RoutedCatalogSearch({
  pages,
}: {
  readonly pages: readonly WebsitePage[];
}): JSX.Element {
  const navigate = useAtelierNavigate();
  const requestSearch = useRequestLocation().search;
  const [initial] = useState(
    () => fromCatalogSearch(requestSearch).search ?? ''
  );
  return (
    <CatalogSearchForm
      initial={initial}
      onSearch={(query) => {
        if (sendSearchToCatalog(query)) return;
        const href = resolveCatalogHref(pages, { search: query });
        if (href) navigate(href);
      }}
    />
  );
}

/** "12 courses in 4 categories" — only real, non-zero counts. */
function CatalogSummary({
  academyId,
}: {
  readonly academyId: string;
}): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const { data: statistics } = usePublicWebsiteStatistics(academyId);
  const { data: categories } = usePublicCourseCategories(academyId);
  const courses = statistics?.courses ?? 0;
  if (courses <= 0) return null;
  const categoryCount = categories?.length ?? 0;
  return (
    <p className="at-label" data-atlas-numeric="true">
      {categoryCount >= 2
        ? t('website:atelier.pages.summary.catalog', {
            count: courses,
            courses: formatAtelierNumber(courses, locale),
            categories: formatAtelierNumber(categoryCount, locale),
          })
        : t('website:atelier.pages.summary.courses', {
            count: courses,
            formatted: formatAtelierNumber(courses, locale),
          })}
    </p>
  );
}

function FaqFilter(): JSX.Element {
  const { t } = useTranslation();
  const inputId = useId();
  const [value, setValue] = useState('');
  useEffect(() => () => setFaqFilter(''), []);
  return (
    <div role="search" className="atp-search">
      <div className="min-w-0 flex-1">
        <label htmlFor={inputId} className="atp-field-label">
          {t('website:atelier.pages.search.faqLabel')}
        </label>
        <input
          id={inputId}
          type="search"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setFaqFilter(event.target.value);
          }}
          placeholder={t('website:atelier.pages.search.faqPlaceholder')}
          className="atp-field"
          maxLength={100}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The masthead                                                         */
/* ------------------------------------------------------------------ */

function Masthead({
  headingId,
  headingLevel,
  trail,
  title,
  description,
  image,
  landmark = true,
  children,
}: {
  readonly headingId: string;
  readonly headingLevel: 'h1' | 'h2';
  readonly trail?: ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly image?: { readonly value: string; readonly alt: string };
  /**
   * A named region (default). The fallback intro isn't one: its title can
   * repeat the first section's, and two regions with one name aren't
   * distinguishable.
   */
  readonly landmark?: boolean;
  readonly children?: ReactNode;
}): JSX.Element {
  return (
    <AtelierChapter
      as={landmark ? 'section' : 'div'}
      labelledBy={landmark ? headingId : undefined}
      thread="start"
      className="atp-masthead"
    >
      <div
        data-atelier-masthead=""
        className={cn('grid gap-10', image && 'lg:grid-cols-12 lg:items-end')}
      >
        <div className={cn('min-w-0 space-y-7', image && 'lg:col-span-7')}>
          {trail}
          <AtelierHeading
            as={headingLevel}
            id={headingId}
            size="display"
            className="max-w-5xl"
          >
            {title}
          </AtelierHeading>
          {description ? <p className="at-lead">{description}</p> : null}
          {children}
        </div>
        {image ? (
          <div className="lg:col-span-4 lg:col-start-9">
            <AtelierMedia
              value={image.value}
              alt={image.alt}
              shape="arch"
              settle
              priority
              sizes="(min-width: 1024px) 30vw, 100vw"
              className="mx-auto aspect-[4/5] w-full max-w-sm lg:max-w-none"
            />
          </div>
        ) : null}
      </div>
    </AtelierChapter>
  );
}

export function AtelierPageHeader({
  config,
  academyId,
  pages,
  linkRenderer,
}: SectionRenderProps<'pageHeader'>): JSX.Element {
  const { locale } = usePublicWebsiteLocale();
  const inRouter = useInRouterContext();
  const headingId = useId();
  const headingLevel = usePageOpeningHeading();
  const eyebrow = resolveLocalizedText(config.eyebrow, locale);
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);
  const search = config.search ?? 'none';
  // The page this masthead opens (the section's config object is shared
  // with the page it belongs to).
  const owner = pages.find((page) =>
    page.sections.some((section) => section.config === config)
  );

  return (
    <Masthead
      headingId={headingId}
      headingLevel={headingLevel}
      trail={
        <Trail
          pages={pages}
          owner={owner}
          current={eyebrow}
          linkRenderer={linkRenderer}
        />
      }
      title={title}
      description={description}
      image={
        config.image
          ? {
              value: config.image,
              alt: resolveLocalizedText(config.imageAlt, locale),
            }
          : undefined
      }
    >
      {search === 'courses' && resolveCatalogHref(pages) ? (
        <div className="space-y-5 pt-2">
          {linkRenderer && inRouter ? (
            <RoutedCatalogSearch pages={pages} />
          ) : (
            <CatalogSearchForm initial="" onSearch={() => undefined} />
          )}
          <CatalogSummary academyId={academyId} />
        </div>
      ) : null}
      {search === 'faq' ? (
        <div className="pt-2">
          <FaqFilter />
        </div>
      ) : null}
    </Masthead>
  );
}

/**
 * The masthead an existing page without a page header gets. Its title is
 * the page's navigation label in the visitor's language, else the page's
 * own title; core pages get a neutral lead.
 */
export function AtelierPageIntro({
  page,
  navigation,
}: ThemePageIntroProps): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const item = navigation.find((candidate) => candidate.pageId === page.id);
  const lead = page.coreType
    ? t(`website:atelier.pages.intro.${page.coreType}`, { defaultValue: '' })
    : '';
  const title =
    (item ? resolveLocalizedText(item.label, locale) : '') || page.title;
  return (
    <Masthead
      headingId={headingId}
      headingLevel="h1"
      title={title}
      description={lead || undefined}
      landmark={false}
    />
  );
}
