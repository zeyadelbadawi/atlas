/**
 * Course Catalog Section (P64 Phase 4 §E.1).
 *
 * The full, filterable, server-paginated course listing an Owner drops
 * onto the `/courses` core page. `FeaturedCoursesSection` remains the small
 * fixed-size teaser; this section is the real catalog. It deliberately
 * reuses that section's every convention rather than inventing parallel
 * ones:
 *
 *   - DATA: `usePublicCourses` — the public-safe, published-only transport
 *     (see that hook's own doc comment for why the tenant-scoped
 *     `useCourses` 403s for a real visitor). The controls here map 1:1 onto
 *     what the backend public catalog already accepts and
 *     `toCollectionParams` already sends: `search`, `sortBy`/`sortDirection`,
 *     `page`/`pageSize`, and the FLAT filters `level`/`pricingType`. No
 *     client-side filtering of a partial page — every control is a query.
 *   - STYLE: website design tokens only, through the shared
 *     `useWebsite*Class` helpers; the card is the featured card plus a
 *     level badge.
 *   - NAVIGATION: the injected `linkRenderer` (real `/courses/:id` links on
 *     the public runtime); absent it (dashboard preview) a card is the same
 *     inert `<article>` every other section renders.
 *
 * PAGE RESET RULE. Every filter/sort/search change returns to page 1 in the
 * SAME event handler that changes it (React 18 batches both state updates
 * into one render), so a request for "page 7 of the new filter" — which
 * would be empty and strand the visitor — is never issued.
 */
import { useCallback, useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, SearchX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination, SearchInput } from '@components/data-display';
import { EmptyState, ErrorState } from '@components/feedback';
import { apiErrorKind } from '@api';
import { formatCoursePricing } from '@features/course';
import { usePagination, usePublicCourses } from '@hooks';
import { clamp } from '@utils';
import { COURSE_CATALOG_SORT_VALUES, COURSE_LEVEL_VALUES } from '@types';
import {
  DEFAULT_COURSE_CATALOG_PAGE_SIZE,
  MAX_COURSE_CATALOG_PAGE_SIZE,
  MIN_COURSE_CATALOG_PAGE_SIZE,
} from '../constants/website.constants';
import {
  useWebsiteCardClass,
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import { usePublicWebsiteLocale } from '../renderer/PublicWebsiteLocaleContext';
import { resolveLocalizedText } from '../utils/localized-text.utils';
import type {
  CourseCatalogSectionConfig,
  CourseCatalogSort,
  CourseLevel,
  CoursePricingType,
  SortDescriptor,
} from '@types';
import type { WebsiteLinkRenderer } from '../renderer/website-link-renderer.types';

export interface CourseCatalogSectionProps {
  readonly config: CourseCatalogSectionConfig;
  readonly academyId: string;
  readonly linkRenderer?: WebsiteLinkRenderer;
}

/** The "any" option of a filter select. Radix `Select` rejects an empty-string item value, same sentinel convention as `CourseListPage`. */
const ALL = 'all';

/**
 * The closed sort list → the backend's `sortBy`/`sortDirection` pair.
 * `newest` sorts by `createdAt` rather than `publishedAt`: the public
 * catalog only ever returns published courses, and `createdAt` is set on
 * every row, so the order is total and deterministic.
 */
const COURSE_CATALOG_SORT_DESCRIPTORS: Record<
  CourseCatalogSort,
  SortDescriptor
> = {
  newest: { field: 'createdAt', direction: 'desc' },
  title: { field: 'title', direction: 'asc' },
  priceAsc: { field: 'price', direction: 'asc' },
  priceDesc: { field: 'price', direction: 'desc' },
};

const SORT_LABEL_KEYS: Record<CourseCatalogSort, string> = {
  newest: 'website:renderer.courseCatalog.sortNewest',
  title: 'website:renderer.courseCatalog.sortTitle',
  priceAsc: 'website:renderer.courseCatalog.sortPriceAsc',
  priceDesc: 'website:renderer.courseCatalog.sortPriceDesc',
};

/** Defends the render against a persisted config outside the schema's bounds (the Zod schema validates saves; this is the read side). */
function resolvePageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize)) return DEFAULT_COURSE_CATALOG_PAGE_SIZE;
  return clamp(
    Math.trunc(pageSize),
    MIN_COURSE_CATALOG_PAGE_SIZE,
    MAX_COURSE_CATALOG_PAGE_SIZE
  );
}

export function CourseCatalogSection({
  config,
  academyId,
  linkRenderer,
}: CourseCatalogSectionProps): JSX.Element {
  const { t } = useTranslation();
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const cardClass = useWebsiteCardClass();
  const { locale } = usePublicWebsiteLocale();
  const controlId = useId();

  const pageSize = resolvePageSize(config.pageSize);

  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<CourseLevel | typeof ALL>(ALL);
  const [pricing, setPricing] = useState<CoursePricingType | typeof ALL>(ALL);
  const [sort, setSort] = useState<CourseCatalogSort>(config.defaultSort);

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({ totalItems, initialPageSize: pageSize });
  const { goToFirstPage, setPageSize } = pagination;

  // Editor live preview: an Owner changing `pageSize`/`defaultSort` in the
  // Section Editor must show without a remount. Both are no-ops on the
  // public runtime, where a mounted section's config never changes.
  useEffect(() => {
    if (pagination.pageSize !== pageSize) setPageSize(pageSize);
  }, [pageSize, pagination.pageSize, setPageSize]);
  useEffect(() => {
    setSort(config.defaultSort);
  }, [config.defaultSort]);

  // See the doc comment's "PAGE RESET RULE" for why each handler also
  // returns to page 1 itself rather than an effect doing it afterwards.
  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value);
      goToFirstPage();
    },
    [goToFirstPage]
  );
  const handleLevel = (value: string) => {
    setLevel(value as CourseLevel | typeof ALL);
    goToFirstPage();
  };
  const handlePricing = (value: string) => {
    setPricing(value as CoursePricingType | typeof ALL);
    goToFirstPage();
  };
  const handleSort = (value: string) => {
    setSort(value as CourseCatalogSort);
    goToFirstPage();
  };

  const trimmedSearch = search.trim();
  const { data, isLoading, error, refetch } = usePublicCourses(academyId, {
    query: {
      pagination: { page: pagination.page, pageSize: pagination.pageSize },
      sort: COURSE_CATALOG_SORT_DESCRIPTORS[sort],
      search: trimmedSearch || undefined,
      filters: {
        level: level === ALL ? undefined : level,
        pricingType: pricing === ALL ? undefined : pricing,
      },
    },
  });

  useEffect(() => {
    if (data) setTotalItems(data.pagination.totalItems);
  }, [data]);

  const courses = data?.items ?? [];
  const hasActiveFilters =
    trimmedSearch.length > 0 || level !== ALL || pricing !== ALL;
  const hasControls =
    config.showSearch ||
    config.showLevelFilter ||
    config.showPricingFilter ||
    config.showSort;

  const levelId = `${controlId}-level`;
  const pricingId = `${controlId}-pricing`;
  const sortId = `${controlId}-sort`;

  return (
    <section className={`${container} ${section}`}>
      <div className="mb-10 space-y-2 text-center">
        <h2 className={`${heading} text-3xl text-foreground`}>
          {resolveLocalizedText(config.title, locale)}
        </h2>
        {config.description ? (
          <p className="mx-auto max-w-2xl text-muted-foreground">
            {resolveLocalizedText(config.description, locale)}
          </p>
        ) : null}
      </div>

      {hasControls ? (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          {config.showSearch ? (
            <SearchInput
              value={search}
              onValueChange={handleSearch}
              labelKey="website:renderer.courseCatalog.searchLabel"
              className="flex-1 sm:min-w-[16rem]"
            />
          ) : null}

          {config.showLevelFilter ? (
            <div className="space-y-1.5">
              <Label htmlFor={levelId}>
                {t('website:renderer.courseCatalog.levelLabel')}
              </Label>
              <Select value={level} onValueChange={handleLevel}>
                <SelectTrigger id={levelId} className="w-full sm:w-[11rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>
                    {t('website:renderer.courseCatalog.allLevels')}
                  </SelectItem>
                  {COURSE_LEVEL_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`website:renderer.courseDetails.level.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {config.showPricingFilter ? (
            <div className="space-y-1.5">
              <Label htmlFor={pricingId}>
                {t('website:renderer.courseCatalog.pricingLabel')}
              </Label>
              <Select value={pricing} onValueChange={handlePricing}>
                <SelectTrigger id={pricingId} className="w-full sm:w-[10rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>
                    {t('website:renderer.courseCatalog.allPricing')}
                  </SelectItem>
                  <SelectItem value="free">
                    {t('website:renderer.courseCatalog.free')}
                  </SelectItem>
                  <SelectItem value="paid">
                    {t('website:renderer.courseCatalog.paid')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {config.showSort ? (
            <div className="space-y-1.5 sm:ms-auto">
              <Label htmlFor={sortId}>
                {t('website:renderer.courseCatalog.sortLabel')}
              </Label>
              <Select value={sort} onValueChange={handleSort}>
                <SelectTrigger id={sortId} className="w-full sm:w-[13rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COURSE_CATALOG_SORT_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(SORT_LABEL_KEYS[value])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Always mounted so the live region exists BEFORE its text changes —
          a region that appears already populated is not announced. Empty
          while loading rather than unmounted, for the same reason. */}
      <p
        role="status"
        aria-live="polite"
        className="mb-4 text-start text-sm text-muted-foreground"
        data-atlas-numeric="true"
      >
        {!isLoading && !error && data
          ? t('website:renderer.courseCatalog.resultCount', {
              count: data.pagination.totalItems,
            })
          : null}
      </p>

      {error ? (
        <ErrorState kind={apiErrorKind(error)} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(17rem,1fr))]">
          {Array.from({ length: Math.min(pageSize, 6) }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          titleKey={
            hasActiveFilters
              ? 'website:renderer.courseCatalog.noResults'
              : 'website:renderer.noCourses'
          }
          descriptionKey={
            hasActiveFilters
              ? 'website:renderer.courseCatalog.noResultsDescription'
              : undefined
          }
          icon={hasActiveFilters ? SearchX : BookOpen}
        />
      ) : (
        <>
          {/* `auto-fill` (not `FeaturedCoursesSection`'s `auto-fit`): a
              paginated grid should keep the same card width on a full page
              and on a short final page, instead of stretching three
              leftover cards to fill the row. */}
          <div className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(17rem,1fr))]">
            {courses.map((course) => {
              const cardBody = (
                <>
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt=""
                      className="mb-4 aspect-video w-full object-cover"
                      style={{ borderRadius: 'var(--website-radius)' }}
                    />
                  ) : (
                    <div
                      className="mb-4 flex aspect-video w-full items-center justify-center bg-[var(--website-primary-surface)]"
                      style={{ borderRadius: 'var(--website-radius)' }}
                    >
                      <BookOpen
                        className="size-8 text-[var(--website-primary-solid)]"
                        aria-hidden
                      />
                    </div>
                  )}
                  {/* `dir="auto"`: single-language, Owner-typed strings —
                      see `FeaturedCoursesSection`'s identical comment. */}
                  <h3
                    className="line-clamp-2 font-medium text-foreground"
                    dir="auto"
                  >
                    {course.title}
                  </h3>
                  {course.shortDescription ? (
                    <p
                      className="mt-1 line-clamp-2 text-sm text-muted-foreground"
                      dir="auto"
                    >
                      {course.shortDescription}
                    </p>
                  ) : null}
                  <div className="mt-4 flex items-center justify-between gap-2 text-sm">
                    {course.level ? (
                      <Badge variant="secondary" className="shrink-0">
                        {t(
                          `website:renderer.courseDetails.level.${course.level}`
                        )}
                      </Badge>
                    ) : (
                      <span />
                    )}
                    <span className="shrink-0 font-medium text-foreground">
                      {formatCoursePricing(course.pricing, t)}
                    </span>
                  </div>
                </>
              );

              return linkRenderer ? (
                <div key={course.id} className="contents">
                  {linkRenderer({
                    href: `/courses/${course.id}`,
                    external: false,
                    className: `block w-full text-start hover:shadow-[var(--website-shadow)] ${cardClass}`,
                    children: cardBody,
                  })}
                </div>
              ) : (
                <article key={course.id} className={cardClass}>
                  {cardBody}
                </article>
              );
            })}
          </div>

          {pagination.totalPages > 1 ? (
            <Pagination
              pagination={pagination}
              hidePageSize
              className="mt-8 border-t-0 px-0 sm:px-0"
            />
          ) : null}
        </>
      )}
    </section>
  );
}
