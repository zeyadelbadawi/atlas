/**
 * The public course catalog's state (P64 Phase 4 §E.1, Theme 1 plan §D.2):
 * search, category, level, pricing, sort and page, the query they drive,
 * and the URL state on the public runtime. Every theme's catalog renderer
 * shares it, so only the presentation differs. See `CourseCatalogSection`
 * for the URL-state and page-reset rules.
 *
 * A search submitted by another section of the same page (Theme 1's
 * Courses hero) arrives as `CATALOG_SEARCH_EVENT`, so the list follows it
 * without a navigation or a remount.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  usePagination,
  usePublicCourseCategories,
  usePublicCourses,
  useRequestLocation,
} from '@hooks';
import { clamp } from '@utils';
import { COURSE_CATALOG_SORT_VALUES, COURSE_LEVEL_VALUES } from '@types';
import {
  CATALOG_SEARCH_EVENT,
  fromCatalogSearch,
  mergeCatalogSearch,
  type CatalogSearchEventDetail,
  type CatalogUrlState,
} from '../utils/catalog-url.utils';
import {
  DEFAULT_COURSE_CATALOG_PAGE_SIZE,
  MAX_COURSE_CATALOG_PAGE_SIZE,
  MIN_COURSE_CATALOG_PAGE_SIZE,
} from '../constants/website.constants';
import type {
  CourseCatalogSectionConfig,
  CourseCatalogSort,
  CourseLevel,
  CoursePricingType,
  SortDescriptor,
} from '@types';

/** The "any" option of a filter select. Radix `Select` rejects an empty-string item value, same sentinel convention as `CourseListPage`. */
export const ALL = 'all';

export const PRICING_VALUES: readonly CoursePricingType[] = ['free', 'paid'];

function oneOf<T extends string>(
  values: readonly T[],
  value: string | undefined
): T | undefined {
  return values.find((candidate) => candidate === value);
}

/** The catalog state a visitor arrived with — anything unrecognised is ignored, never trusted. */
function readInitialUrlState(
  enabled: boolean,
  /** The request's query string (`useRequestLocation`), so the server renders the same state. */
  search: string
): {
  readonly search: string;
  readonly category?: string;
  readonly level?: CourseLevel;
  readonly pricing?: CoursePricingType;
  readonly sort?: CourseCatalogSort;
  readonly page: number;
} {
  if (!enabled) return { search: '', page: 1 };
  const state: CatalogUrlState = fromCatalogSearch(search);
  const page = Number(state.page);
  return {
    search: state.search?.slice(0, 100) ?? '',
    category: state.category?.slice(0, 64),
    level: oneOf(COURSE_LEVEL_VALUES, state.level),
    pricing: oneOf(PRICING_VALUES, state.pricing),
    sort: oneOf(COURSE_CATALOG_SORT_VALUES, state.sort),
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

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

/** Defends the render against a persisted config outside the schema's bounds (the Zod schema validates saves; this is the read side). */
function resolvePageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize)) return DEFAULT_COURSE_CATALOG_PAGE_SIZE;
  return clamp(
    Math.trunc(pageSize),
    MIN_COURSE_CATALOG_PAGE_SIZE,
    MAX_COURSE_CATALOG_PAGE_SIZE
  );
}

export interface UseCourseCatalogOptions {
  readonly config: CourseCatalogSectionConfig;
  readonly academyId: string;
  /** The public runtime: read and write the URL (never in previews). */
  readonly syncUrl: boolean;
}

export function useCourseCatalog({
  config,
  academyId,
  syncUrl,
}: UseCourseCatalogOptions) {
  const pageSize = resolvePageSize(config.pageSize);
  const requestSearch = useRequestLocation().search;
  const [initial] = useState(() => readInitialUrlState(syncUrl, requestSearch));

  const [search, setSearch] = useState(initial.search);
  const [category, setCategory] = useState(initial.category);
  const [level, setLevel] = useState<CourseLevel | typeof ALL>(
    initial.level ?? ALL
  );
  const [pricing, setPricing] = useState<CoursePricingType | typeof ALL>(
    initial.pricing ?? ALL
  );
  const [sort, setSort] = useState<CourseCatalogSort>(
    initial.sort ?? config.defaultSort
  );

  const [totalItems, setTotalItems] = useState(0);
  const pagination = usePagination({
    totalItems,
    initialPage: initial.page,
    initialPageSize: pageSize,
  });
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
  const handleClearCategory = () => {
    setCategory(undefined);
    goToFirstPage();
  };

  const trimmedSearch = search.trim();
  // Until the first response says how many pages exist, `pagination.page`
  // is clamped to 1 — so a shared "page 3" link asks for page 3 directly.
  const [hasTotals, setHasTotals] = useState(false);
  const queryPage = hasTotals ? pagination.page : initial.page;
  const { data, isLoading, error, refetch } = usePublicCourses(academyId, {
    query: {
      pagination: { page: queryPage, pageSize: pagination.pageSize },
      sort: COURSE_CATALOG_SORT_DESCRIPTORS[sort],
      search: trimmedSearch || undefined,
      filters: {
        categoryId: category,
        level: level === ALL ? undefined : level,
        pricingType: pricing === ALL ? undefined : pricing,
      },
    },
  });

  useEffect(() => {
    if (!data) return;
    setTotalItems(data.pagination.totalItems);
    setHasTotals(true);
  }, [data]);

  // The category's name, for the removable filter chip (same cached query
  // the category tiles use).
  const { data: categories } = usePublicCourseCategories(
    category ? academyId : undefined
  );
  const categoryName = categories?.find(
    (candidate) => candidate.id === category
  )?.name;

  // URL STATE — see the doc comment. Written only once totals are known,
  // so the first render's clamp to page 1 never erases a shared page.
  const requestedPage = pagination.page;
  useEffect(() => {
    if (!syncUrl || !hasTotals) return;
    const next = mergeCatalogSearch(window.location.search, {
      search: trimmedSearch,
      category,
      level: level === ALL ? undefined : level,
      pricing: pricing === ALL ? undefined : pricing,
      sort: sort === config.defaultSort ? undefined : sort,
      page: requestedPage > 1 ? String(requestedPage) : undefined,
    });
    if (next === window.location.search) return;
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${next}${window.location.hash}`
    );
  }, [
    syncUrl,
    hasTotals,
    trimmedSearch,
    category,
    level,
    pricing,
    sort,
    config.defaultSort,
    requestedPage,
  ]);

  const courses = data?.items ?? [];
  const hasActiveFilters =
    trimmedSearch.length > 0 ||
    level !== ALL ||
    pricing !== ALL ||
    category !== undefined;
  const hasControls =
    config.showSearch ||
    config.showLevelFilter ||
    config.showPricingFilter ||
    config.showSort;

  const handleCategory = (value: string | undefined) => {
    setCategory(value);
    goToFirstPage();
  };
  const clearFilters = () => {
    setSearch('');
    setCategory(undefined);
    setLevel(ALL);
    setPricing(ALL);
    goToFirstPage();
  };

  useEffect(() => {
    if (!syncUrl) return undefined;
    const onSearch = (event: Event) => {
      const { search: next } = (event as CustomEvent<CatalogSearchEventDetail>)
        .detail;
      event.preventDefault();
      setSearch(next.slice(0, 100));
      goToFirstPage();
    };
    window.addEventListener(CATALOG_SEARCH_EVENT, onSearch);
    return () => window.removeEventListener(CATALOG_SEARCH_EVENT, onSearch);
  }, [syncUrl, goToFirstPage]);

  return {
    pageSize,
    search,
    handleSearch,
    category,
    categoryName,
    handleCategory,
    handleClearCategory,
    level,
    handleLevel,
    pricing,
    handlePricing,
    sort,
    handleSort,
    clearFilters,
    pagination,
    data,
    isLoading,
    error,
    refetch,
    courses,
    hasActiveFilters,
    hasControls,
  };
}
