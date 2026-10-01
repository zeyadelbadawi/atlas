/**
 * The public course catalog's URL contract (Theme 1 plan §D.2, "catalog URL
 * state"): the one place that knows the query-parameter names, so links
 * INTO the catalog (category tiles, hero/page-header search) and the
 * catalog's own state can never drift apart.
 */
import { resolvePagePath } from './link-resolution.utils';
import type { WebsitePage } from '@types';

export const CATALOG_URL_PARAMS = {
  search: 'q',
  category: 'category',
  level: 'level',
  pricing: 'pricing',
  sort: 'sort',
  page: 'page',
} as const;

export type CatalogUrlState = Partial<
  Record<keyof typeof CATALOG_URL_PARAMS, string>
>;

/** Serialises catalog state to a query string (leading `?`, or `''`), skipping empty values. */
export function toCatalogSearch(state: CatalogUrlState): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(
    CATALOG_URL_PARAMS
  ) as (keyof CatalogUrlState)[]) {
    const value = state[key];
    if (value) params.set(CATALOG_URL_PARAMS[key], value);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** Reads catalog state from a query string; unknown parameters are ignored. */
export function fromCatalogSearch(search: string): CatalogUrlState {
  const params = new URLSearchParams(search);
  const state: Record<string, string> = {};
  for (const key of Object.keys(
    CATALOG_URL_PARAMS
  ) as (keyof CatalogUrlState)[]) {
    const value = params.get(CATALOG_URL_PARAMS[key])?.trim();
    if (value) state[key] = value;
  }
  return state;
}

/**
 * `currentSearch` with the catalog's own parameters replaced by `state`
 * (empty values removed) and every other parameter kept — e.g. the
 * development preview's `__atlas_academy_preview`, or campaign tags.
 */
export function mergeCatalogSearch(
  currentSearch: string,
  state: CatalogUrlState
): string {
  const params = new URLSearchParams(currentSearch);
  for (const key of Object.keys(
    CATALOG_URL_PARAMS
  ) as (keyof CatalogUrlState)[]) {
    const value = state[key];
    if (value) params.set(CATALOG_URL_PARAMS[key], value);
    else params.delete(CATALOG_URL_PARAMS[key]);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** The catalog (`/courses` core page) with the given state, or `undefined` when the site has no catalog page. */
export function resolveCatalogHref(
  pages: readonly WebsitePage[],
  state: CatalogUrlState = {}
): string | undefined {
  const catalogPage = pages.find((page) => page.coreType === 'courses');
  const path = catalogPage ? resolvePagePath(catalogPage) : undefined;
  return path ? `${path}${toCatalogSearch(state)}` : undefined;
}

/**
 * Sent (cancelable) on `window` by a search box outside the catalog — the
 * Courses page hero. A catalog on the same page applies it and cancels the
 * event; not cancelled means there's no catalog here, and the sender
 * navigates to the catalog instead.
 */
export const CATALOG_SEARCH_EVENT = 'atlas:catalog-search';

export interface CatalogSearchEventDetail {
  readonly search: string;
}

/** Hands a search to a catalog on this page; `false` when there isn't one. */
export function sendSearchToCatalog(search: string): boolean {
  return !window.dispatchEvent(
    new CustomEvent<CatalogSearchEventDetail>(CATALOG_SEARCH_EVENT, {
      detail: { search },
      cancelable: true,
    })
  );
}
