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

export function useApiQuery<TData, TError = Error>(
  options: UseQueryOptions<TData, TError>
): UseQueryResult<TData, TError> {
  return useQuery<TData, TError>({
    ...options,
    // Ensure query keys are arrays for consistent invalidation.
    queryKey: options.queryKey as QueryKey,
  });
}