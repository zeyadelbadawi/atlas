/**
 * Pagination defaults.
 *
 * Centralised so no component ever contains a magic page-size number.
 */

export const DEFAULT_PAGE = 1;

export const DEFAULT_PAGE_SIZE = 20;

export const PAGE_SIZE_OPTIONS: readonly number[] = [10, 20, 50, 100];

/** Number of numbered page buttons rendered around the current page. */
export const PAGINATION_SIBLING_COUNT = 1;

/**
 * Record count above which a search field becomes mandatory on a listing
 * surface, per the Atlas UX standards.
 */
export const SEARCH_REQUIRED_THRESHOLD = 20;