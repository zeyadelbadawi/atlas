/**
 * Manara banner block (Reports/THEME_3_MANARA_PLAN.md §3.11, `pageHeader`):
 * a brand block with a slanted bottom seam and the beam at the end, the
 * trail, a giant display title, the lead, the page's search when
 * configured, and — when the section has one — a wide slanted image tile
 * under the banner (21:9 → 16:9 → 4:3 as the viewport narrows).
 *
 * - `search: 'courses'`: an underlined course search that hands the query
 *   to the catalogue on the same page (or opens the catalogue), with a
 *   live summary of the catalogue — the same behaviour as Theme 1.
 * - `search: 'faq'`: the question filter the FAQ list below applies (the
 *   shared filter store; cleared when the banner leaves the page).
 *
 * The opening heading level comes from `usePageOpeningHeading()`: the
 * page's one `<h1>` when this banner owns it, else an `<h2>`.
 * `ManaraPageIntro` draws the same banner for an existing page with no
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
import { useT1Navigate } from '@/features/website/modern-education/t1-navigation';
import type {
  SectionRenderProps,
  ThemePageIntroProps,
} from '@/features/website/theme-packs/theme-pack.types';
import type { WebsitePage } from '@types';
import type { WebsiteLinkRenderer } from '@/features/website/renderer/website-link-renderer.types';
import {
  ManaraBlock,
  ManaraHeading,
  ManaraLink,
  ManaraMedia,
  formatManaraNumber,
  manaraEnter,
} from '../manara-parts';
import '../manara-pages.css';

/* ------------------------------------------------------------------ */
/* Trail                                                                */
/* ------------------------------------------------------------------ */

/**
 * Home / the current page. Home is a link only while it is a visible page
 * other than this one; with nothing to lead back to, the current label
 * stands alone as the eyebrow.
 */
export function ManaraTrail({
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
    return current ? <p className="mn-label mn-muted">{current}</p> : null;
  }
  return (
    <nav aria-label={t('website:manara.pages.trail.label')}>
      <ol className="mnp-trail">
        <li>
          <ManaraLink
            href={linkRenderer ? resolvePagePath(home) : undefined}
            linkRenderer={linkRenderer}
            className="mnp-nav-link"
          >
            {t('website:manara.pages.trail.home')}
          </ManaraLink>
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
      className="mnp-banner-search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(query.trim());
      }}
    >
      <div className="min-w-0 flex-1">
        <label htmlFor={inputId} className="mn-field-label">
          {t('website:renderer.courseCatalog.searchLabel')}
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('website:manara.pages.search.placeholder')}
          className="mnp-underline-input"
          maxLength={100}
        />
      </div>
      <button type="submit" className="mn-btn">
        {t('website:manara.pages.search.submit')}
      </button>
    </form>
  );
}

/** On the public runtime: hand the search to the catalogue below, else open it. */
function RoutedCatalogSearch({
  pages,
}: {
  readonly pages: readonly WebsitePage[];
}): JSX.Element {
  const navigate = useT1Navigate();
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

/** "12 courses across 4 tracks" — only real, non-zero counts. */
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
    <p className="mn-label" data-atlas-numeric="true">
      {categoryCount >= 2
        ? t('website:manara.pages.summary.catalog', {
            count: courses,
            courses: formatManaraNumber(courses, locale),
            categories: formatManaraNumber(categoryCount, locale),
          })
        : t('website:manara.pages.summary.courses', {
            count: courses,
            formatted: formatManaraNumber(courses, locale),
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
    <div role="search" className="mnp-banner-search">
      <div className="min-w-0 flex-1">
        <label htmlFor={inputId} className="mn-field-label">
          {t('website:manara.pages.search.faqLabel')}
        </label>
        <input
          id={inputId}
          type="search"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setFaqFilter(event.target.value);
          }}
          placeholder={t('website:manara.pages.search.faqPlaceholder')}
          className="mnp-underline-input"
          maxLength={100}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The banner                                                           */
/* ------------------------------------------------------------------ */

function Banner({
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
    <>
      <ManaraBlock
        as={landmark ? 'section' : 'div'}
        labelledBy={landmark ? headingId : undefined}
        env="block"
        seamBottom
        beam="end"
        className="mnp-banner"
      >
        <div data-manara-banner="" className="grid max-w-5xl gap-6">
          {trail}
          <ManaraHeading as={headingLevel} id={headingId} size="display">
            {title}
          </ManaraHeading>
          {description ? (
            <p
              className={cn('mn-lead mn-muted', manaraEnter(0).className)}
              style={manaraEnter(0).style}
            >
              {description}
            </p>
          ) : null}
          {children ? <div {...manaraEnter(1)}>{children}</div> : null}
        </div>
      </ManaraBlock>
      {image ? (
        <div className="mn-container mnp-banner-image">
          <ManaraMedia
            value={image.value}
            alt={image.alt}
            shape="slant"
            priority
            sizes="100vw"
            className="aspect-[4/3] w-full md:aspect-[16/9] lg:aspect-[21/9]"
          />
        </div>
      ) : null}
    </>
  );
}

export function ManaraPageHeader({
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
  // The page this banner opens (the section's config object is shared
  // with the page it belongs to).
  const owner = pages.find((page) =>
    page.sections.some((section) => section.config === config)
  );

  return (
    <Banner
      headingId={headingId}
      headingLevel={headingLevel}
      trail={
        <ManaraTrail
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
        <div className={cn('grid gap-4 pt-2')}>
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
    </Banner>
  );
}

/**
 * The banner an existing page without a page header gets. Its title is
 * the page's navigation label in the visitor's language, else the page's
 * own title; core pages get a neutral lead.
 */
export function ManaraPageIntro({
  page,
  navigation,
}: ThemePageIntroProps): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const item = navigation.find((candidate) => candidate.pageId === page.id);
  const lead = page.coreType
    ? t(`website:manara.pages.intro.${page.coreType}`, { defaultValue: '' })
    : '';
  const title =
    (item ? resolveLocalizedText(item.label, locale) : '') || page.title;
  return (
    <Banner
      headingId={headingId}
      headingLevel="h1"
      title={title}
      description={lead || undefined}
      landmark={false}
    />
  );
}
