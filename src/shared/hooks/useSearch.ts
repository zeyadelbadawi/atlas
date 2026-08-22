/**
 * useSearch hook.
 *
 * Provides debounced search with cancellation and loading state.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';
import { APP_CONFIG } from '@config';

export interface UseSearchOptions {
  /** Debounce delay in milliseconds. */
  readonly debounceMs?: number;

  /** Minimum query length to trigger search. */
  readonly minLength?: number;

  /** Callback invoked when search query changes (debounced). */
  readonly onSearch?: (query: string) => void;
}

export interface UseSearchResult {
  /** Current search query. */
  readonly query: string;

  /** Debounced search query. */
  readonly debouncedQuery: string;

  /** Updates the search query. */
  readonly setQuery: (query: string) => void;

  /** Clears the search query. */
  readonly clearQuery: () => void;

  /** True while waiting for debounce. */
  readonly isDebouncing: boolean;
}

export function useSearch(options: UseSearchOptions = {}): UseSearchResult {
  const {
    debounceMs = APP_CONFIG.searchDebounceMs,
    minLength = 0,
    onSearch,
  } = options;

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, debounceMs);
  const previousDebouncedQuery = useRef<string>('');

  const isDebouncing = query !== debouncedQuery;

  useEffect(() => {
    if (
      debouncedQuery !== previousDebouncedQuery.current &&
      (debouncedQuery.length >= minLength || debouncedQuery === '')
    ) {
      previousDebouncedQuery.current = debouncedQuery;
      onSearch?.(debouncedQuery);
    }
  }, [debouncedQuery, minLength, onSearch]);

  const clearQuery = useCallback(() => {
    setQuery('');
  }, []);

  return {
    query,
    debouncedQuery,
    setQuery,
    clearQuery,
    isDebouncing,
  };
}