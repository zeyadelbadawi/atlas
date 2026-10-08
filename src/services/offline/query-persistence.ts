/**
 * Local-first dashboard — offline-readable data.
 *
 * WHAT IS KEPT. Only an explicit allowlist of dashboard reads a person
 * needs to find their way around without a connection: their academies,
 * the academy overview, course structure, website pages and configuration,
 * their notification feed and organizations. Everything else is NEVER
 * written to disk — rosters and member lists (other people's personal
 * data), orders, payments, billing, audit logs, support and customer
 * requests, analytics, anything about authentication. A new query family
 * is excluded until someone adds it here deliberately (default deny).
 *
 * HOW IT IS SCOPED. One record per query, keyed by the signed-in user's
 * id: a record is only ever restored for that same user. The query keys
 * themselves already carry the academy id, and every academy route renders
 * only its own academy's keys — so Academy B can never show Academy A's
 * saved rows. Sign-out, a server-ended session or a different person
 * signing in wipes the whole store (see `clearOfflineData`).
 *
 * HOW LONG. 24 hours (older copies are deleted, not shown), at most
 * `MAX_ENTRIES` records and `MAX_TOTAL_BYTES` per browser (least recently
 * saved go first), no single record over `MAX_ENTRY_BYTES`. A new build
 * (`BUSTER`) discards everything, so an old response shape is never fed
 * to new code.
 *
 * WHY NOT ENCRYPTED. A key the page can use to decrypt is stored right next
 * to the data on the same device, so encryption would add cost without
 * protecting against anyone who can read the store. The protections that
 * do work are: nothing sensitive is stored, the store is per user and wiped
 * at sign-out, and copies expire.
 */
import { dehydrate, hydrate } from '@tanstack/react-query';
import type { Query, QueryClient, QueryKey } from '@tanstack/react-query';
import { offlineStore } from './offline-store';

export const OFFLINE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_ENTRIES = 400;
export const MAX_ENTRY_BYTES = 512 * 1024;
export const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const WRITE_DEBOUNCE_MS = 1_000;
/** Bump when a persisted shape changes incompatibly; old records are then dropped. */
export const BUSTER = 'atlas-offline-v1';

export interface PersistedQueryRecord {
  readonly userId: string;
  readonly queryHash: string;
  readonly queryKey: QueryKey;
  readonly state: unknown;
  readonly savedAt: number;
  readonly bytes: number;
  readonly buster: string;
}

const WEBSITE_EXCLUDED = new Set([
  'contactSubmissions',
  'contactSubmissionSummary',
]);
const ACADEMY_INCLUDED = new Set(['list', 'detail', 'stats', 'membership']);

/** The allowlist. `false` for anything not named here. */
export function isPersistableQueryKey(queryKey: QueryKey): boolean {
  const [root, kind] = queryKey as readonly unknown[];
  switch (root) {
    case 'academy':
      return typeof kind === 'string' && ACADEMY_INCLUDED.has(kind);
    case 'course':
    case 'dashboard':
    case 'notification':
    case 'organizations':
      return true;
    case 'website':
      return typeof kind === 'string' && !WEBSITE_EXCLUDED.has(kind);
    default:
      return false;
  }
}

function recordKey(userId: string, queryHash: string): string {
  return `${userId}|${queryHash}`;
}

/**
 * Writes successful allowlisted queries for `getUserId()` as they settle.
 * Returns the unsubscribe function.
 */
export function startQueryPersistence(
  queryClient: QueryClient,
  getUserId: () => string | null
): () => void {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const persist = async (query: Query) => {
    const userId = getUserId();
    if (
      !userId ||
      query.state.status !== 'success' ||
      query.state.data === undefined
    ) {
      return;
    }
    const dehydrated = dehydrate(queryClient, {
      shouldDehydrateQuery: (candidate) =>
        candidate.queryHash === query.queryHash,
    });
    const entry = dehydrated.queries[0];
    if (!entry) return;
    let serialized: string;
    try {
      serialized = JSON.stringify(entry.state);
    } catch {
      return;
    }
    if (serialized.length > MAX_ENTRY_BYTES) return;
    const record: PersistedQueryRecord = {
      userId,
      queryHash: query.queryHash,
      queryKey: query.queryKey,
      state: entry.state,
      savedAt: Date.now(),
      bytes: serialized.length,
      buster: BUSTER,
    };
    await offlineStore().put(
      'queries',
      recordKey(userId, query.queryHash),
      record
    );
  };

  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'success') return;
    const { query } = event;
    if (!isPersistableQueryKey(query.queryKey)) return;
    if (query.meta?.persistOffline === false) return;
    const pending = timers.get(query.queryHash);
    if (pending) clearTimeout(pending);
    timers.set(
      query.queryHash,
      setTimeout(() => {
        timers.delete(query.queryHash);
        void persist(query);
      }, WRITE_DEBOUNCE_MS)
    );
  });

  return () => {
    unsubscribe();
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
  };
}

/**
 * Puts the user's saved copies back into the query cache (only theirs,
 * only fresh enough, only this build's) and deletes everything else.
 * Returns when the copies were saved, or `null` when there were none.
 */
export async function restorePersistedQueries(
  queryClient: QueryClient,
  userId: string,
  now: number = Date.now()
): Promise<{ readonly count: number; readonly newestSavedAt: number | null }> {
  const records = await offlineStore().getAll<PersistedQueryRecord>('queries');
  const keep: PersistedQueryRecord[] = [];
  for (const record of records) {
    const usable =
      record.userId === userId &&
      record.buster === BUSTER &&
      now - record.savedAt <= OFFLINE_CACHE_TTL_MS &&
      isPersistableQueryKey(record.queryKey);
    if (usable) keep.push(record);
    else
      await offlineStore().delete(
        'queries',
        recordKey(record.userId, record.queryHash)
      );
  }

  // Budget: newest first; whatever does not fit is deleted.
  keep.sort((a, b) => b.savedAt - a.savedAt);
  let total = 0;
  const restored: PersistedQueryRecord[] = [];
  for (const record of keep) {
    if (
      restored.length >= MAX_ENTRIES ||
      total + record.bytes > MAX_TOTAL_BYTES
    ) {
      await offlineStore().delete(
        'queries',
        recordKey(record.userId, record.queryHash)
      );
      continue;
    }
    total += record.bytes;
    restored.push(record);
  }

  if (restored.length > 0) {
    hydrate(queryClient, {
      mutations: [],
      queries: restored.map((record) => ({
        queryKey: record.queryKey,
        queryHash: record.queryHash,
        state: record.state as never,
      })),
    });
  }
  return {
    count: restored.length,
    newestSavedAt: restored.length ? restored[0].savedAt : null,
  };
}

/** Every saved copy and queued change, for every user — sign-out and account switches. */
export async function clearOfflineData(): Promise<void> {
  await Promise.all([
    offlineStore().clear('queries'),
    offlineStore().clear('outbox'),
    offlineStore().clear('meta'),
  ]);
}
