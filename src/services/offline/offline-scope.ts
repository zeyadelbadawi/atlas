/**
 * Local-first — WHICH offline store this page uses (academy offline work).
 *
 * The browser already separates storage per origin, and in production every
 * Academy website is its own origin (`slug.<platform>` or the academy's own
 * domain), distinct from the dashboard. That is the primary isolation.
 *
 * It is not the only one, because one origin can serve more than one
 * "tenant surface": local development serves the dashboard AND every
 * academy (chosen by the dev-override parameter) from `localhost`. So the
 * IndexedDB database itself is named per surface:
 *
 *   platform host            `atlas-offline`            (unchanged)
 *   academy website          `atlas-offline:academy:<lookup key>`
 *
 * Academy A's saved lessons, drafts and queued changes are therefore never
 * even in the same database as Academy B's, on any host. Within a database,
 * every user-bound record is additionally keyed by the signed-in user's id.
 *
 * The scope is configured once at start-up (`main.tsx`) from the same
 * hostname resolution the router uses, before anything reads the store.
 */
export type OfflineSurface = 'platform' | 'academy';

export interface OfflineScope {
  readonly surface: OfflineSurface;
  /** Stable id of the surface: `platform`, or `academy:<lookup key>`. */
  readonly key: string;
  /** The IndexedDB database holding this surface's records. */
  readonly dbName: string;
}

export const OFFLINE_DB_PREFIX = 'atlas-offline';

export const PLATFORM_SCOPE: OfflineScope = {
  surface: 'platform',
  key: 'platform',
  dbName: OFFLINE_DB_PREFIX,
};

/** The scope for an Academy website identified by `lookupKey` (its hostname, or the dev-override slug). */
export function academyScope(lookupKey: string): OfflineScope {
  const normalized = lookupKey.trim().toLowerCase();
  return {
    surface: 'academy',
    key: `academy:${normalized}`,
    dbName: `${OFFLINE_DB_PREFIX}:academy:${encodeURIComponent(normalized)}`,
  };
}

let current: OfflineScope = PLATFORM_SCOPE;
const listeners = new Set<(scope: OfflineScope) => void>();

export function configureOfflineScope(scope: OfflineScope): void {
  if (scope.dbName === current.dbName) return;
  current = scope;
  for (const listener of listeners) listener(scope);
}

export function currentOfflineScope(): OfflineScope {
  return current;
}

/** The store layer re-opens its database when the scope changes (tests, dev). */
export function onOfflineScopeChange(
  listener: (scope: OfflineScope) => void
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
