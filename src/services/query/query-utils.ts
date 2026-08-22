/**
 * Query utilities.
 *
 * Provides helper functions for working with TanStack Query: cache invalidation,
 * optimistic updates and query lifecycle management.
 */
import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalidates all queries matching a key prefix.
 *
 * @param queryClient The query client.
 * @param keyPrefix The key prefix to invalidate.
 */
export async function invalidateQueries(
  queryClient: QueryClient,
  keyPrefix: readonly unknown[]
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: keyPrefix as unknown[],
  });
}

/**
 * Invalidates queries for a specific resource.
 *
 * @param queryClient The query client.
 * @param resource The resource identifier.
 */
export async function invalidateResource(
  queryClient: QueryClient,
  resource: string
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: [resource],
  });
}

/**
 * Removes all queries matching a key prefix from the cache.
 *
 * @param queryClient The query client.
 * @param keyPrefix The key prefix to remove.
 */
export function removeQueries(
  queryClient: QueryClient,
  keyPrefix: readonly unknown[]
): void {
  queryClient.removeQueries({
    queryKey: keyPrefix as unknown[],
  });
}

/**
 * Cancels all in-flight queries matching a key prefix.
 *
 * @param queryClient The query client.
 * @param keyPrefix The key prefix to cancel.
 */
export async function cancelQueries(
  queryClient: QueryClient,
  keyPrefix: readonly unknown[]
): Promise<void> {
  await queryClient.cancelQueries({
    queryKey: keyPrefix as unknown[],
  });
}

/**
 * Optimistically updates a query's data.
 *
 * @param queryClient The query client.
 * @param queryKey The query key.
 * @param updater Function that produces the optimistic value.
 */
export function setQueryData<TData>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  updater: (old: TData | undefined) => TData
): void {
  queryClient.setQueryData(queryKey as unknown[], updater);
}

/**
 * Gets the current data for a query without subscribing.
 *
 * @param queryClient The query client.
 * @param queryKey The query key.
 */
export function getQueryData<TData>(
  queryClient: QueryClient,
  queryKey: readonly unknown[]
): TData | undefined {
  return queryClient.getQueryData<TData>(queryKey as unknown[]);
}