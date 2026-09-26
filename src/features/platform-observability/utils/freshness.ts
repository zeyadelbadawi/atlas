/**
 * When is monitoring data too old to trust?
 *
 * Data is stale when the last SUCCESSFUL fetch is older than two refresh
 * intervals — one missed refresh is ordinary jitter, two means the page is
 * no longer live. A failed refetch that left older data on screen is also
 * stale, whatever its age.
 */
export const STALE_AFTER_INTERVALS = 2;

export function isDataStale(options: {
  readonly dataUpdatedAt: number;
  readonly intervalMs: number;
  readonly now: number;
  readonly refetchFailed?: boolean;
}): boolean {
  const { dataUpdatedAt, intervalMs, now, refetchFailed = false } = options;
  if (refetchFailed) return true;
  if (!dataUpdatedAt) return false;
  return now - dataUpdatedAt > intervalMs * STALE_AFTER_INTERVALS;
}
