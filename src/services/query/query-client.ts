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
 * Mutation (and query) `meta` flag: the component that runs this renders every
 * failure itself, so the app-wide error toast must stay quiet for it (it
 * would only repeat — or, worse, contradict — what is already on screen).
 */
export const INLINE_ERRORS_META = 'inlineErrors';

/**
 * Creates a configured query client.
 *
 * @param reportError Receives normalized failures so a provider can surface
 * them (for example as a toast) without any feature wiring error plumbing.
 */
export function createQueryClient(
  reportError?: QueryErrorReporter
): QueryClient {
  const handleError = (error: unknown): void => {
    reportError?.(normalizeUnknownError(error));
  };

  return new QueryClient({
    queryCache: new QueryCache({
      // The same opt-out for queries: a query whose screen renders its own
      // failure (W5 — the academy membership check, which redirects with
      // its own message) must not also raise the generic toast.
      onError: (error, query) => {
        if (query.meta?.[INLINE_ERRORS_META] === true) return;
        handleError(error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.[INLINE_ERRORS_META] === true) return;
        handleError(error);
      },
    }),
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
        // No global `placeholderData`: a default function never sees the new
        // key, so it kept the PREVIOUS entity on screen when a detail page's
        // id changed. `useApiQuery` applies a key-aware policy instead
        // (`keepPreviousForSameResource`): paging a list keeps its rows,
        // changing entity/scope shows the loading state.
        throwOnError: false,
      },
      mutations: {
        retry: MUTATION_MAX_RETRIES,
        throwOnError: false,
        // Local-first dashboard — NEVER replay a change silently. TanStack's
        // default (`'online'`) pauses a mutation while offline and fires it
        // when the connection returns, possibly minutes later and after the
        // person has moved on — a create or a publish nobody is watching.
        // With `'always'` an online-only action fails at once ("you're
        // offline"); the few changes that are safe to replay go through the
        // durable outbox explicitly (`@services/offline`).
        networkMode: 'always',
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
