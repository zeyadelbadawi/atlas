/**
 * useGlobalSearch hook.
 *
 * `enabled` gates on a minimum query length so no request fires for a
 * one-character query — the debounce itself lives in the shared
 * `useSearch()` hook already used by `SearchPage`.
 */
import { useApiQuery, useAuth } from '@/shared/hooks';
import { searchKeys } from '@services/query';
import { searchService } from '../services/SearchService';
import type { SearchResults } from '@types';
import type { ApiError } from '@api';

const MIN_QUERY_LENGTH = 2;

export function useGlobalSearch(query: string) {
  const { user } = useAuth();

  return useApiQuery<SearchResults, ApiError>({
    queryKey: searchKeys.results(user?.id, query),
    queryFn: () => searchService.search(query),
    enabled: !!user && query.trim().length >= MIN_QUERY_LENGTH,
  });
}
