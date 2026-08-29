/**
 * Request-building helpers.
 *
 * Shared by services so collection queries and paginated responses are shaped
 * identically everywhere, and so no service invents its own parameter names.
 */
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@constants';
import type {
  CollectionQuery,
  JsonValue,
  PaginatedResult,
  PaginationMeta,
  QueryParams,
} from '@types';

/** Wire parameter names for collection queries. Declared once, used everywhere. */
export const COLLECTION_PARAM_NAMES = {
  page: 'page',
  pageSize: 'pageSize',
  sortField: 'sortBy',
  sortDirection: 'sortDirection',
  search: 'search',
} as const;

/**
 * Converts a collection query into flat query parameters.
 *
 * Generic over `TFilters` so a domain-narrowed query type (e.g.
 * `CourseListQuery`, which narrows `filters` to `CourseFilters` instead of
 * the base `Record<string, JsonValue>` — see that type's own doc comment)
 * satisfies this function without a call-site type cast. `filters` is only
 * ever read generically here (enumerated and defensively filtered to
 * primitives), so the looser `extends object` constraint costs no runtime
 * safety versus the previous fixed `CollectionQuery` parameter — it only
 * removes a structural-typing false negative (interfaces don't carry an
 * implicit index signature, so TS rejected every narrowed filters type even
 * though every field on them is a JSON-compatible primitive).
 */
export function toCollectionParams<TFilters extends object = Record<string, JsonValue>>(
  query?: Omit<CollectionQuery, 'filters'> & { readonly filters?: TFilters }
): QueryParams {
  if (!query) return {};

  const params: Record<string, QueryParams[string]> = {
    [COLLECTION_PARAM_NAMES.page]: query.pagination?.page ?? DEFAULT_PAGE,
    [COLLECTION_PARAM_NAMES.pageSize]:
      query.pagination?.pageSize ?? DEFAULT_PAGE_SIZE,
  };

  if (query.sort) {
    params[COLLECTION_PARAM_NAMES.sortField] = query.sort.field;
    params[COLLECTION_PARAM_NAMES.sortDirection] = query.sort.direction;
  }

  if (query.search && query.search.trim().length > 0) {
    params[COLLECTION_PARAM_NAMES.search] = query.search.trim();
  }

  for (const [key, value] of Object.entries(
    (query.filters ?? {}) as Record<string, unknown>
  )) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'object') continue;
    params[key] = value as QueryParams[string];
  }

  return params;
}

/** Derives pagination metadata, tolerating an incomplete backend response. */
export function buildPaginationMeta(
  page: number,
  pageSize: number,
  totalItems: number
): PaginationMeta {
  const safePageSize = pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;
  const safeTotal = Number.isFinite(totalItems) && totalItems > 0 ? totalItems : 0;

  return {
    page: page > 0 ? page : DEFAULT_PAGE,
    pageSize: safePageSize,
    totalItems: safeTotal,
    totalPages: Math.max(1, Math.ceil(safeTotal / safePageSize)),
  };
}

/** Builds an empty page, used as a safe fallback for a missing collection. */
export function emptyPaginatedResult<TItem>(
  query?: CollectionQuery
): PaginatedResult<TItem> {
  return {
    items: [],
    pagination: buildPaginationMeta(
      query?.pagination?.page ?? DEFAULT_PAGE,
      query?.pagination?.pageSize ?? DEFAULT_PAGE_SIZE,
      0
    ),
  };
}

/** Builds a path with URL-encoded segments, preventing malformed requests. */
export function resourcePath(...segments: readonly string[]): string {
  return segments
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}