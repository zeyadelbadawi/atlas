/**
 * TanStack Query client.
 *
 * Caching, retry and refetch behaviour is configured once here so every module
 * inherits the same data-freshness contract. Business queries are never
 * declared in this file: features own their own queries.
 */
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import {
  MUTATION_MAX_RETRIES,
  QUERY_GC_TIME_MS,
  QUERY_STALE_TIME_MS,
  queryRetryDelay,
  shouldRetryQuery,
} from '@config';
import { normalizeUnknownError } from '@api';
import type { ApiError } from '@api';

/** Invoked for every unhandled query or mutation failure. */
export type QueryErrorReporter = (error: ApiError) => void;

/**
 * Creates a configured query client.
 *
 * @param reportError Receives normalized failures so a provider can surface
 * them (for example as a toast) without any feature wiring error plumbing.
 */
export function createQueryClient(reportError?: QueryErrorReporter): QueryClient {
  const handleError = (error: unknown): void => {
    reportError?.(normalizeUnknownError(error));
  };

  return new QueryClient({
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME_MS,
        gcTime: QUERY_GC_TIME_MS,
        // Retry only transient failures; see shouldRetryQuery.
        retry: (failureCount, error) =>
          shouldRetryQuery(failureCount, normalizeUnknownError(error)),
        retryDelay: queryRetryDelay,
        // Refetching on focus is disruptive in a long-running admin console.
        refetchOnWindowFocus: false,
        // Reconnecting should recover data the user was already looking at.
        refetchOnReconnect: true,
        // Keeping the previous page visible avoids layout collapse while paging.
        placeholderData: <TData,>(previous: TData): TData => previous,
        throwOnError: false,
      },
      mutations: {
        retry: MUTATION_MAX_RETRIES,
        throwOnError: false,
      },
    },
  });
}

/**
 * The singleton query client instance used by the entire application.
 * 
 * This lives in the query infrastructure layer so both QueryProvider and
 * PlatformProvider can access the exact same instance without creating
 * a circular dependency.
 */
let globalQueryClient: QueryClient | null = null;

/**
 * Returns the global query client instance.
 * 
 * @throws Error if called before the query client is initialized.
 */
export function getGlobalQueryClient(): QueryClient {
  if (!globalQueryClient) {
    throw new Error('QueryClient accessed before initialization');
  }
  return globalQueryClient;
}

/**
 * Initializes the global query client singleton.
 * 
 * @param client The query client instance to use as the global singleton.
 */
export function setGlobalQueryClient(client: QueryClient): void {
  globalQueryClient = client;
}

/**
 * Clears the global query client singleton.
 * 
 * Used during unmount in development/test environments.
 */
export function clearGlobalQueryClient(): void {
  globalQueryClient = null;
}