/**
 * Theme 1 page heroes (plan §C.0, §C.2–§C.6). Every inner page opens with a
 * composed hero, never a bare title:
 *
 *   - **With a photograph (About):** the premium editorial hero. An eyebrow,
 *     a large display title and the lead sit on the soft band (title and
 *     lead side by side on desktop), then a wide photograph straddles the
 *     band's lower edge, so the page flows into its Story section instead
 *     of stopping at a heading.
 *   - **`search: 'courses'` (Courses):** title, lead, the catalog search
 *     and a live summary of the catalog, with the page's photograph at the
 *     logical end.
 *   - **`search: 'faq'` (FAQs):** a centred title with the question filter.
 *   - **Otherwise (Contact, custom pages):** title and lead with the page's
 *     photograph at the logical end.
 *
 * `T1PageIntro` gives an existing page with no hero section one drawn from
 * its navigation label (Decision 3: presentation only, no data written).
 */
import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInRouterContext } from 'react-router-dom';
import { Layers, Search } from 'lucide-react';
import { cn } from '@utils';
import {
  usePublicCourseCategories,
  usePublicWebsiteStatistics,
  useRequestLocation,
} from '@hooks';
import { useWebsiteContainerClass } from '../renderer/renderer-style.utils';
import { usePageOpeningHeading } from '../renderer/PageHeadingContext';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import {
  fromCatalogSearch,
  resolveCatalogHref,
  sendSearchToCatalog,
} from '../utils/catalog-url.utils';
import type { SectionRenderProps } from '../theme-packs/theme-pack.types';
import type { WebsiteNavigationItem, WebsitePage } from '@types';
import { ThemeImage } from '../theme-assets';
import { BrandShapePage, T1Heading, T1Media, formatT1Number } from './t1-parts';
import { setFaqFilter } from './t1-faq-filter';
import { useT1Navigate } from './t1-navigation';

/**
 * B10 V23 — each inner page's art is one of the theme's own photographs
 * (`theme-assets/manifests/modern-education.manifest.ts`), chosen by the
 * core page it opens; a custom page takes a neutral study detail.
 */
const PAGE_ART: Partial<Record<string, string>> = {
  about: 'theme-asset:modern-education/about-story',
  courses: 'theme-asset:modern-education/courses-launching',
  faqs: 'theme-asset:modern-education/gallery-4',
  contact: 'theme-asset:modern-education/gallery-2',
};
const DEFAULT_PAGE_ART = 'theme-asset:modern-education/gallery-3';

/**
 * The decorative photograph at a hero's logical end, on the brand shape
 * (`brand-shape-page`). The title and lead say everything, so the picture
 * is skipped by assistive technology (`alt=""`). It loads lazily, framed
 * from the manifest's focal point, in the box the art always had (the
 * hero's height never depends on it); a photograph that is not released or
 * fails to load leaves the brand shape on its own.
 */
function PageArt({ asset }: { readonly asset: string }): JSX.Element {
  return (
    <div
      aria-hidden
      data-t1-page-art=""
      className="relative hidden h-64 w-80 shrink-0 lg:block xl:h-72 xl:w-[22rem]"
    >
      <BrandShapePage className="-end-6 -top-6 h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)]" />
      <ThemeImage
        value={asset}
        alt=""
        decorative
        sizes="(min-width: 1280px) 352px, 320px"
        className="relative block size-full rounded-[var(--t1-radius-card)] object-cover shadow-[var(--t1-shadow-lift)]"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Courses: search + live summary                                       */
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
      className="flex w-full max-w-xl flex-col gap-2 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(query.trim());
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        {t('website:renderer.courseCatalog.searchLabel')}
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
      <button type="submit" className="t1-cta t1-btn-lg">
        {t('website:theme1.hero.searchSubmit')}
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
    <p
      className="inline-flex items-center gap-2 text-sm font-medium text-[var(--website-foreground-muted)]"
      data-atlas-numeric="true"
    >
      <Layers className="size-4 text-[var(--website-link)]" aria-hidden />
      {categoryCount >= 2
        ? t('website:theme1.pageHeader.catalogSummary', {
            count: courses,
            courses: formatT1Number(courses, locale),
            categories: formatT1Number(categoryCount, locale),
          })
        : t('website:theme1.hero.courseCount', {
            count: courses,
            formatted: formatT1Number(courses, locale),
          })}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* FAQs: the question filter                                            */
/* ------------------------------------------------------------------ */

function FaqFilter(): JSX.Element {
  const { t } = useTranslation();
  const inputId = useId();
  const [value, setValue] = useState('');
  useEffect(() => () => setFaqFilter(''), []);
  return (
    <div role="search" className="relative mx-auto w-full max-w-xl">
      <label htmlFor={inputId} className="sr-only">
        {t('website:theme1.faq.filterLabel')}
      </label>
      <Search
        className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-[var(--website-foreground-muted)]"
        aria-hidden
      />
      <input
        id={inputId}
        type="search"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setFaqFilter(event.target.value);
        }}
        placeholder={t('website:theme1.faq.filterPlaceholder')}
        className="t1-input ps-12"
        maxLength={100}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The standard hero (text + brand composition)                         */
/* ------------------------------------------------------------------ */

function StandardHero({
  headingId,
  eyebrow,
  title,
  description,
  art,
  children,
  landmark = true,
  headingLevel = 'h1',
}: {
  readonly headingId: string;
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  /** The page's photograph (`PAGE_ART`). */
  readonly art: string;
  readonly children?: React.ReactNode;
  /**
   * A named region (default). The fallback intro isn't one: on an existing
   * page its title can repeat the first section's, and two regions with
   * one name aren't distinguishable.
   */
  readonly landmark?: boolean;
  /** `h2` when another section already carries the page's `h1`. */
  readonly headingLevel?: 'h1' | 'h2';
}): JSX.Element {
  const container = useWebsiteContainerClass();
  const Root = landmark ? 'section' : 'div';
  return (
    <Root
      aria-labelledby={landmark ? headingId : undefined}
      data-tone="soft"
      data-t1-page-hero=""
      className="relative overflow-hidden bg-[var(--website-surface)] text-[var(--website-foreground)]"
    >
      <div
        className={cn(
          container,
          'flex items-center justify-between gap-12 py-14 md:py-20 lg:py-20'
        )}
      >
        <div className="min-w-0 max-w-2xl space-y-5">
          {eyebrow ? <p className="t1-eyebrow">{eyebrow}</p> : null}
          <T1Heading as={headingLevel} id={headingId} size="display">
            {title}
          </T1Heading>
          {description ? <p className="t1-lead">{description}</p> : null}
          {children}
        </div>
        <PageArt asset={art} />
      </div>
    </Root>
  );
}

/* ------------------------------------------------------------------ */
/* The renderer                                                       */
/* ------------------------------------------------------------------ */

export function T1PageHeader({
  config,
  academyId,
  pages,
  linkRenderer,
}: SectionRenderProps<'pageHeader'>): JSX.Element {
  const { locale } = usePublicWebsiteLocale();
  const container = useWebsiteContainerClass();
  const inRouter = useInRouterContext();
  const headingId = useId();
  const headingLevel = usePageOpeningHeading();
  const eyebrow = resolveLocalizedText(config.eyebrow, locale);
  const title = resolveLocalizedText(config.title, locale);
  const description = resolveLocalizedText(config.description, locale);
  const search = config.search ?? 'none';
  // The core page this hero opens, for its photograph (the section's own
  // config object is shared with the page it belongs to).
  const owner = pages.find((page) =>
    page.sections.some((section) => section.config === config)
  );

  /* About: the premium editorial hero. */
  if (config.image) {
    return (
      <section
        aria-labelledby={headingId}
        data-tone="soft"
        data-t1-page-hero="editorial"
        className="t1-hero-editorial relative overflow-hidden text-[var(--website-foreground)]"
      >
        <BrandShapePage className="-end-28 -top-28 hidden h-96 w-[34rem] opacity-80 md:block" />
        <div className={cn(container, 'relative pt-12 md:pt-16 lg:pt-24')}>
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-12">
            <div className="min-w-0 space-y-5 lg:col-span-7">
              {eyebrow ? <p className="t1-eyebrow">{eyebrow}</p> : null}
              <T1Heading
                as={headingLevel}
                id={headingId}
                size="display"
                className="t1-display-xl"
              >
                {title}
              </T1Heading>
            </div>
            {description ? (
              <p className="t1-lead lg:col-span-5 lg:pb-3">{description}</p>
            ) : null}
          </div>
          <T1Media
            priority
            value={config.image}
            alt={resolveLocalizedText(config.imageAlt, locale)}
            sizes="(min-width: 1280px) 1216px, 100vw"
            className="mt-10 aspect-[4/3] rounded-[var(--t1-radius-card)] shadow-[var(--t1-shadow-lift)] md:mt-14 md:aspect-[16/9] lg:mt-16 lg:aspect-[21/9]"
          />
        </div>
      </section>
    );
  }

  /* FAQs: centred, with the question filter. */
  if (search === 'faq') {
    return (
      <section
        aria-labelledby={headingId}
        data-tone="soft"
        data-t1-page-hero="faq"
        className="relative overflow-hidden bg-[var(--website-surface)] py-14 text-[var(--website-foreground)] md:py-20"
      >
        <BrandShapePage className="-start-40 -top-24 hidden h-72 w-96 opacity-70 md:block" />
        <BrandShapePage className="-bottom-28 -end-32 hidden h-72 w-96 opacity-70 md:block" />
        <div className={cn(container, 'relative space-y-5 text-center')}>
          {eyebrow ? (
            <p className="t1-eyebrow justify-center">{eyebrow}</p>
          ) : null}
          <T1Heading
            as={headingLevel}
            id={headingId}
            size="display"
            className="mx-auto max-w-3xl"
          >
            {title}
          </T1Heading>
          {description ? (
            <p className="t1-lead mx-auto">{description}</p>
          ) : null}
          <div className="pt-3">
            <FaqFilter />
          </div>
        </div>
      </section>
    );
  }

  /* Courses, Contact and custom pages. */
  const art =
    (search === 'courses' ? PAGE_ART.courses : undefined) ??
    (owner?.coreType ? PAGE_ART[owner.coreType] : undefined) ??
    DEFAULT_PAGE_ART;
  return (
    <StandardHero
      headingLevel={headingLevel}
      headingId={headingId}
      eyebrow={eyebrow}
      title={title}
      description={description}
      art={art}
    >
      {search === 'courses' && resolveCatalogHref(pages) ? (
        <div className="space-y-4 pt-2">
          {linkRenderer && inRouter ? (
            <RoutedCatalogSearch pages={pages} />
          ) : (
            <CatalogSearchForm initial="" onSearch={() => undefined} />
          )}
          <CatalogSummary academyId={academyId} />
        </div>
      ) : null}
    </StandardHero>
  );
}

/**
 * The hero an existing page without one gets (Decision 3: presentation
 * only). Its title is the page's navigation label in the visitor's
 * language, else the page's own title.
 */
export function T1PageIntro({
  page,
  navigation,
}: {
  readonly page: WebsitePage;
  readonly navigation: readonly WebsiteNavigationItem[];
}): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const headingId = useId();
  const item = navigation.find((candidate) => candidate.pageId === page.id);
  // A neutral line per core page, so the fallback still reads as a hero.
  const lead = page.coreType
    ? t(`website:theme1.pageIntro.${page.coreType}.lead`, { defaultValue: '' })
    : '';
  const title =
    (item ? resolveLocalizedText(item.label, locale) : '') || page.title;
  return (
    <StandardHero
      headingId={headingId}
      title={title}
      description={lead || undefined}
      art={(page.coreType && PAGE_ART[page.coreType]) || DEFAULT_PAGE_ART}
      landmark={false}
    />
  );
}
