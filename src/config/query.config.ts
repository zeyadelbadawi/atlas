/**
 * TanStack Query defaults.
 *
 * Caching, retry and refetch behaviour is declared once so every module shares
 * the same data-freshness contract.
 */

/** How long fetched data is considered fresh, in milliseconds. */
export const QUERY_STALE_TIME_MS = 60_000;

/** How long unused data stays in the cache before garbage collection. */
export const QUERY_GC_TIME_MS = 5 * 60_000;

/**
 * Refresh cadence for lists and queues that OTHER people change (a learner
 * accepting an invite, a visitor sending a contact message, support
 * replying to a ticket). The backend has no push channel, so these screens
 * poll while mounted. TanStack pauses the interval while the tab is in the
 * background (`refetchIntervalInBackground` stays false), so an idle tab
 * costs nothing. Kept deliberately conservative.
 */
export const LIVE_LIST_REFETCH_INTERVAL_MS = 45_000;

/**
 * Query options for a list/queue that other people change: poll while
 * mounted and refetch when the window regains focus. Never used on detail
 * editors, where a background refetch could fight the person's edits.
 */
export const LIVE_LIST_QUERY_OPTIONS = {
  refetchInterval: LIVE_LIST_REFETCH_INTERVAL_MS,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
} as const;

/**
 * Queries are not retried by TanStack Query. Owner decision (UX audit,
 * "faster error on failed reads"): the HTTP client is the ONE retry layer —
 * a failed read is retried once there (any 5xx or a lost response, never a
 * 4xx; a 429 only when its `Retry-After` is a few seconds), so a GET that
 * fails with a 500 shows its error in about 1–2 s. Retrying here too is
 * what stacked up to ~12 s before. A query that goes offline is paused by
 * TanStack and refetched on reconnect (`refetchOnReconnect`), not retried.
 */
export const QUERY_RETRY = false;

/** Mutations are not retried automatically: they may not be idempotent. */
export const MUTATION_MAX_RETRIES = 0;
