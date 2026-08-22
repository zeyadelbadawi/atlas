/**
 * Search types.
 *
 * Generic search types that support extensible result categories.
 * Future modules can register their own result types without modifying
 * the core search architecture.
 */

/** Supported search result categories. */
export type SearchResultCategory = 'users' | 'platform' | 'content' | 'system';

/** A single search result item. */
export interface SearchResultItem {
  readonly id: string;
  readonly category: SearchResultCategory;
  readonly title: string;
  readonly description?: string;
  readonly metadata?: Record<string, string>;
  readonly path?: string;
  readonly icon?: string;
}

/** Grouped search results by category. */
export interface SearchResultGroup {
  readonly category: SearchResultCategory;
  readonly categoryLabelKey: string;
  readonly items: readonly SearchResultItem[];
}

/** Complete search results with grouping. */
export interface SearchResults {
  readonly query: string;
  readonly groups: readonly SearchResultGroup[];
  readonly totalCount: number;
}

/** Search state for UI management. */
export interface SearchState {
  readonly query: string;
  readonly results: SearchResults | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}