/**
 * useApiQuery hook.
 *
 * Wraps TanStack Query's useQuery with Atlas-specific defaults and conventions.
 * Use this instead of useQuery directly to ensure consistent query behavior.
 */
import { useQuery } from '@tanstack/react-query';
import type {
  UseQueryOptions,
  UseQueryResult,
  QueryKey,
} from '@tanstack/react-query';
import { keepPreviousForSameResource } from '@services/query/placeholder';

export function useApiQuery<TData, TError = Error>(
  options: UseQueryOptions<TData, TError>
): UseQueryResult<TData, TError> {
  return useQuery<TData, TError>({
    // Keep the previous result visible while the SAME resource re-pages or
    // re-filters, but never across a change of id/scope (a detail page
    // must not render the previous entity for a beat). A hook that sets
    // `placeholderData` itself — even to `undefined` — keeps its own.
    ...('placeholderData' in options
      ? {}
      : {
          placeholderData: keepPreviousForSameResource<TData>(
            options.queryKey as QueryKey
          ) as UseQueryOptions<TData, TError>['placeholderData'],
        }),
    ...options,
    // Ensure query keys are arrays for consistent invalidation.
    queryKey: options.queryKey as QueryKey,
  });
}
