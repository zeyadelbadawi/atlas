/**
 * Riwaq page header — the Plate (plan §4, inner pages): the trail in the
 * start rail, the display title, the lead, an optional search (courses or
 * FAQ) and the page's photograph as a wide window under it, between the
 * column lines. Also the intro an existing page without a header gets.
 *
 * The opening heading level comes from `usePageOpeningHeading()`; the
 * photograph is the inner page's lead image (eager, high priority).
 */
import { useEffect, useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useInRouterContext } from 'react-router-dom';
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
  RiwaqHeading,
  RiwaqLink,
  RiwaqWindow,
  formatRiwaqNumber,
  riwaqEnter,
} from '../riwaq-parts';
import '../riwaq-pages.css';

/* ------------------------------------------------------------------ */
/* Trail                                                                */
/* ------------------------------------------------------------------ */

/**
 * Home / the current page. Home is a link only while it is a visible page
 * other than this one; with nothing to lead back to, the label stands alone.
 */
export function RiwaqTrail({
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
    return current ? (
      <p className="rw-label" data-mark="">
        {current}
      </p>
    ) : null;
  }
  return (
    <nav aria-label={t('website:riwaq.pages.trail.label')}>
      <ol className="rwp-trail">
        <li>
          <RiwaqLink
            href={linkRenderer ? resolvePagePath(home) : undefined}
            linkRenderer={linkRenderer}
            className="rwp-trail-link"
          >
            {t('website:riwaq.pages.trail.home')}
          </RiwaqLink>
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
      className="rwp-search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(query.trim());
      }}
    >
      <label htmlFor={inputId} className="rw-label">
        {t('website:renderer.courseCatalog.searchLabel')}
      </label>
      <div className="rwp-search-row">
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('website:riwaq.pages.search.placeholder')}
          className="rw-input"
          maxLength={100}
        />
        <button type="submit" className="rw-btn">
          {t('website:riwaq.pages.search.submit')}
        </button>
      </div>
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
  const [initial] = useState(() => fromCatalogSearch(requestSearch).search ?? '');
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

/** "12 programmes in 4 departments" — only real, non-zero counts. */
function CatalogSummary({ academyId }: { readonly academyId: string }): JSX.Element | null {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const { data: statistics } = usePublicWebsiteStatistics(academyId);
  const { data: categories } = usePublicCourseCategories(academyId);
  const courses = statistics?.courses ?? 0;
  if (courses <= 0) return null;
  const categoryCount = categories?.length ?? 0;
  return (
    <p className="rw-label rw-num">
      {categoryCount >= 2
        ? t('website:riwaq.pages.summary.catalog', {
            count: courses,
            courses: formatRiwaqNumber(courses, locale),
            categories: formatRiwaqNumber(categoryCount, locale),
          })
        : t('website:riwaq.pages.summary.courses', {
            count: courses,
            formatted: formatRiwaqNumber(courses, locale),
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
    <div role="search" className="rwp-search">
      <label htmlFor={inputId} className="rw-label">
        {t('website:riwaq.pages.search.faqLabel')}
      </label>
      <input
        id={inputId}
        type="search"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setFaqFilter(event.target.value);
        }}
        placeholder={t('website:riwaq.pages.search.faqPlaceholder')}
        className="rw-input"
        maxLength={100}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The plate                                                            */
/* ------------------------------------------------------------------ */

function Plate({
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
  /** A named region (default); the fallback intro isn't one. */
  readonly landmark?: boolean;
  readonly children?: ReactNode;
}): JSX.Element {
  const Tag = landmark ? 'section' : 'div';
  return (
    <Tag
      aria-labelledby={landmark ? headingId : undefined}
      data-ground="porcelain"
      className="rw-band rwp-plate"
      data-image={image ? '' : undefined}
    >
      <div className="rw-container">
        <div className="rw-grid" data-riwaq-plate="">
          <div className="rw-head-rail rwp-plate-rail">{trail}</div>
          <div className="rwp-plate-body">
            <RiwaqHeading as={headingLevel} id={headingId} size="display">
              {title}
            </RiwaqHeading>
            {description ? (
              <p className={`rw-lead ${riwaqEnter(0).className}`} style={riwaqEnter(0).style}>
                {description}
              </p>
            ) : null}
            {children ? <div {...riwaqEnter(1)}>{children}</div> : null}
          </div>
          {image ? (
            <RiwaqWindow
              priority
              value={image.value}
              alt={image.alt}
              sizes="100vw"
              className="rwp-plate-window aspect-[4/3] md:aspect-[16/9] lg:aspect-[21/9]"
            />
          ) : null}
        </div>
      </div>
    </Tag>
  );
}

export function RiwaqPageHeader({
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
  const search = config.search ?? 'none';
  // The page this header opens (the config object is shared with it).
  const owner = pages.find((page) =>
    page.sections.some((section) => section.config === config)
  );
  return (
    <Plate
      headingId={headingId}
      headingLevel={headingLevel}
      trail={<RiwaqTrail pages={pages} owner={owner} current={eyebrow} linkRenderer={linkRenderer} />}
      title={resolveLocalizedText(config.title, locale)}
      description={resolveLocalizedText(config.description, locale)}
      image={
        config.image
          ? { value: config.image, alt: resolveLocalizedText(config.imageAlt, locale) }
          : undefined
      }
    >
      {search === 'courses' && resolveCatalogHref(pages) ? (
        <div className="grid gap-4">
          {linkRenderer && inRouter ? (
            <RoutedCatalogSearch pages={pages} />
          ) : (
            <CatalogSearchForm initial="" onSearch={() => undefined} />
          )}
          <CatalogSummary academyId={academyId} />
        </div>
      ) : null}
      {search === 'faq' ? <FaqFilter /> : null}
    </Plate>
  );
}

/**
 * The plate an existing page without a page header gets: its navigation
 * label in the visitor's language, else its own title; core pages get a
 * neutral lead.
 */
export function RiwaqPageIntro({ page, navigation }: ThemePageIntroProps): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const item = navigation.find((candidate) => candidate.pageId === page.id);
  const lead = page.coreType
    ? t(`website:riwaq.pages.intro.${page.coreType}`, { defaultValue: '' })
    : '';
  const title = (item ? resolveLocalizedText(item.label, locale) : '') || page.title;
  return (
    <Plate
      headingId={headingId}
      headingLevel="h1"
      title={title}
      description={lead || undefined}
      landmark={false}
    />
  );
}
