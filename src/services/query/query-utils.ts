/**
 * Query utilities.
 *
 * Provides helper functions for working with TanStack Query: cache invalidation,
 * optimistic updates and query lifecycle management.
 */
import type { QueryClient } from '@tanstack/react-query';

/**
 * Turns a key into the prefix it was meant to be by dropping trailing
 * `undefined` elements.
 *
 * Every list factory takes an optional trailing `query` (`list(scope,
 * query?)`), so `list(scope)` builds `[..., scope, undefined]`. TanStack's
 * partial matching compares that `undefined` against the cached query
 * object (`{ pagination: … }`), finds the types differ and never matches —
 * so "invalidate every list of this scope" silently invalidated nothing
 * whenever the screen had fetched with a query. Dropping the trailing
 * `undefined`s gives the prefix the caller intended; elements in the middle
 * of a key are left alone (an `undefined` scope id there is real data).
 */
export function normalizeKeyPrefix(
  keyPrefix: readonly unknown[]
): readonly unknown[] {
  let end = keyPrefix.length;
  while (end > 0 && keyPrefix[end - 1] === undefined) end -= 1;
  return end === keyPrefix.length ? keyPrefix : keyPrefix.slice(0, end);
}

/**
 * Invalidates all queries matching a key prefix.
 *
 * Trailing `undefined` elements are dropped first (see
 * `normalizeKeyPrefix`), so `list(scope)` matches every `list(scope,
 * query)` cache entry.
 *
 * @param queryClient The query client.
 * @param keyPrefix The key prefix to invalidate.
 */
export async function invalidateQueries(
  queryClient: QueryClient,
  keyPrefix: readonly unknown[]
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: normalizeKeyPrefix(keyPrefix) as unknown[],
  });
}

/**
 * Invalidates several key prefixes at once (each normalized as above).
 *
 * @param queryClient The query client.
 * @param keyPrefixes The key prefixes to invalidate.
 */
export async function invalidateQueryPrefixes(
  queryClient: QueryClient,
  keyPrefixes: readonly (readonly unknown[])[]
): Promise<void> {
  await Promise.all(
    keyPrefixes.map((keyPrefix) => invalidateQueries(queryClient, keyPrefix))
  );
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
