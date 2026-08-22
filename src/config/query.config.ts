/**
 * TanStack Query defaults.
 *
 * Caching, retry and refetch behaviour is declared once so every module shares
 * the same data-freshness contract.
 */
import type { NormalizedApiError } from '@types';

/** How long fetched data is considered fresh, in milliseconds. */
export const QUERY_STALE_TIME_MS = 60_000;

/** How long unused data stays in the cache before garbage collection. */
export const QUERY_GC_TIME_MS = 5 * 60_000;

/** Maximum automatic retries for a failed query. */
export const QUERY_MAX_RETRIES = 2;

/** Mutations are not retried automatically: they may not be idempotent. */
export const MUTATION_MAX_RETRIES = 0;

/** Upper bound of the exponential retry backoff, in milliseconds. */
const RETRY_MAX_DELAY_MS = 8_000;

/** Base of the exponential retry backoff, in milliseconds. */
const RETRY_BASE_DELAY_MS = 500;

/**
 * Exponential backoff with a ceiling, so a struggling backend is not flooded.
 */
export function queryRetryDelay(attemptIndex: number): number {
  return Math.min(RETRY_BASE_DELAY_MS * 2 ** attemptIndex, RETRY_MAX_DELAY_MS);
}

/**
 * Decides whether a failed query should be retried.
 *
 * Only transient failures are retried. Authorization, validation and
 * not-found failures will not change on their own, so retrying them wastes
 * requests and delays the error state the user needs to see.
 */
export function shouldRetryQuery(
  failureCount: number,
  error: NormalizedApiError
): boolean {
  if (failureCount >= QUERY_MAX_RETRIES) return false;
  return error.retryable;
}