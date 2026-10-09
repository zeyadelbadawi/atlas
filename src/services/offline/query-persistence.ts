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
import { deleteOtherOfflineDatabases, offlineStore } from './offline-store';

export const OFFLINE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_ENTRIES = 400;
export const MAX_ENTRY_BYTES = 512 * 1024;
export const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const WRITE_DEBOUNCE_MS = 1_000;
/** Bump when a persisted shape changes incompatibly; old records are then dropped. */
export const BUSTER = 'atlas-offline-v1';

export interface PersistedQueryRecord {
  /** The signed-in user the copy belongs to, or `PUBLIC_OWNER` for tenant-public data. */
  readonly userId: string;
  readonly queryHash: string;
  readonly queryKey: QueryKey;
  readonly state: unknown;
  readonly savedAt: number;
  readonly bytes: number;
  readonly buster: string;
}

/**
 * Website reads that are safe on disk: the academy's own published-content
 * editors. Named explicitly (default deny) — an exclusion list once named
 * the contact-submission keys by the wrong spelling and let visitors'
 * messages through, so a new website key family stays off disk until it is
 * added here on purpose.
 */
const WEBSITE_INCLUDED = new Set([
  'configuration',
  'page',
  'pages',
  'faq-entries',
  'faq-entry',
  'testimonial-entries',
  'testimonial-entry',
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
      return typeof kind === 'string' && WEBSITE_INCLUDED.has(kind);
    default:
      return false;
  }
}

/**
 * Owner of a record that is not about any person: an Academy's published
 * website (pages, configuration, public course pages). Kept on the
 * Academy's own origin/scope, restored for whoever opens that site.
 */
export const PUBLIC_OWNER = '__public__';

/**
 * Which queries a surface may keep on disk, for whom, and how long.
 * `dashboardPersistencePolicy` (below) is the platform host's;
 * `learnerPersistencePolicy` (`learner-persistence.ts`) the Academy
 * website's. Both are allowlists: a key not named is never written.
 */
export interface PersistencePolicy {
  readonly name: string;
  /** Who the copy belongs to — `null` means "do not keep it". */
  readonly ownerOf: (
    queryKey: QueryKey,
    userId: string | null
  ) => string | null;
  readonly maxEntryBytes: (queryKey: QueryKey) => number;
  readonly ttlMs: number;
  readonly maxEntries: number;
  readonly maxTotalBytes: number;
  /** Data that must never reach disk even under an allowlisted key. */
  readonly rejectsData?: (data: unknown) => boolean;
}

export const dashboardPersistencePolicy: PersistencePolicy = {
  name: 'dashboard',
  ownerOf: (queryKey, userId) =>
    userId && isPersistableQueryKey(queryKey) ? userId : null,
  maxEntryBytes: () => MAX_ENTRY_BYTES,
  ttlMs: OFFLINE_CACHE_TTL_MS,
  maxEntries: MAX_ENTRIES,
  maxTotalBytes: MAX_TOTAL_BYTES,
};

/**
 * DEFENCE IN DEPTH (learner policy). Field names that mean "credential" or
 * "durable media address". An allowlisted query whose data contains any of
 * them anywhere is not written — so a future response shape that starts carrying a
 * signed URL or a lesson's `contentUrl` cannot reach disk just because its
 * key family was allowlisted for something else.
 */
const FORBIDDEN_FIELDS = new Set([
  'accesstoken',
  'refreshtoken',
  'token',
  'contenturl',
  'fileurl',
  'videourl',
  'signedurl',
  'streamurl',
  'playbacklease',
  'watermark',
  'video',
  'bodyhtml',
  'password',
]);

export function containsForbiddenField(value: unknown, depth = 0): boolean {
  if (depth > 12 || value === null || typeof value !== 'object') return false;
  if (Array.isArray(value))
    return value.some((item) => containsForbiddenField(item, depth + 1));
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_FIELDS.has(key.toLowerCase())) return true;
    if (containsForbiddenField(child, depth + 1)) return true;
  }
  return false;
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
  getUserId: () => string | null,
  policy: PersistencePolicy = dashboardPersistencePolicy
): () => void {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  const persist = async (query: Query) => {
    const owner = policy.ownerOf(query.queryKey, getUserId());
    if (
      !owner ||
      query.state.status !== 'success' ||
      query.state.data === undefined ||
      policy.rejectsData?.(query.state.data)
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
    if (serialized.length > policy.maxEntryBytes(query.queryKey)) return;
    const record: PersistedQueryRecord = {
      userId: owner,
      queryHash: query.queryHash,
      queryKey: query.queryKey,
      state: entry.state,
      savedAt: Date.now(),
      bytes: serialized.length,
      buster: BUSTER,
    };
    await offlineStore().put(
      'queries',
      recordKey(owner, query.queryHash),
      record
    );
  };

  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'success') return;
    const { query } = event;
    if (!policy.ownerOf(query.queryKey, getUserId())) return;
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
 * Puts saved copies back into the query cache — the user's own (when
 * `userId` is given) and the surface's public ones — only fresh enough,
 * only this build's, only what the policy still allows, and deletes what
 * is expired, foreign to this build or no longer allowed. Another user's
 * records are deleted when a user is restored (a different person signing
 * in also wipes the store; this is the second line). An anonymous restore
 * leaves user records untouched: the person may still be signing in.
 * Returns when the copies were saved, or `null` when there were none.
 */
export async function restorePersistedQueries(
  queryClient: QueryClient,
  userId: string | null,
  now: number = Date.now(),
  policy: PersistencePolicy = dashboardPersistencePolicy
): Promise<{ readonly count: number; readonly newestSavedAt: number | null }> {
  const records = await offlineStore().getAll<PersistedQueryRecord>('queries');
  const keep: PersistedQueryRecord[] = [];
  for (const record of records) {
    const isPublic = record.userId === PUBLIC_OWNER;
    const valid =
      record.buster === BUSTER &&
      now - record.savedAt <= policy.ttlMs &&
      policy.ownerOf(record.queryKey, isPublic ? null : record.userId) ===
        record.userId &&
      !policy.rejectsData?.((record.state as { data?: unknown })?.data);
    if (!valid) {
      await offlineStore().delete(
        'queries',
        recordKey(record.userId, record.queryHash)
      );
      continue;
    }
    if (isPublic || record.userId === userId) keep.push(record);
    else if (userId)
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
      restored.length >= policy.maxEntries ||
      total + record.bytes > policy.maxTotalBytes
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
    // A saved copy is a fallback, never fresh: keeping its original
    // `dataUpdatedAt` would make a copy saved seconds before a reload count
    // as fresh for `staleTime`, so an online page would show it (possibly
    // from before the last change) without asking the server. Marked stale,
    // every restored query is refetched as soon as it is used online, and
    // still shown while offline. Only queries the copy actually filled are
    // touched (`hydrate` keeps fresher data already in the cache).
    const savedAt = new Map(
      restored.map((record) => [
        record.queryHash,
        (record.state as { dataUpdatedAt?: number }).dataUpdatedAt,
      ])
    );
    void queryClient.invalidateQueries({
      predicate: (query) =>
        savedAt.has(query.queryHash) &&
        query.state.dataUpdatedAt === savedAt.get(query.queryHash),
      refetchType: 'none',
    });
  }
  return {
    count: restored.length,
    newestSavedAt: restored.length ? restored[0].savedAt : null,
  };
}

/** Deletes saved query copies of `userId` whose key matches — e.g. one course after its enrolment was revoked. */
export async function deletePersistedQueries(
  userId: string,
  matches: (queryKey: QueryKey) => boolean
): Promise<void> {
  const records = await offlineStore().getAll<PersistedQueryRecord>('queries');
  for (const record of records) {
    if (record.userId === userId && matches(record.queryKey)) {
      await offlineStore().delete(
        'queries',
        recordKey(record.userId, record.queryHash)
      );
    }
  }
}

/**
 * Every saved copy, queued change, offline lesson, draft and journal, for
 * every user — sign-out, a server-ended session and account switches. The
 * current scope's database is cleared in place and every other Atlas
 * offline database of this origin is deleted (`deleteOtherOfflineDatabases`).
 */
export async function clearOfflineData(): Promise<void> {
  await Promise.all([
    offlineStore().clear('queries'),
    offlineStore().clear('outbox'),
    offlineStore().clear('meta'),
    offlineStore().clear('content'),
    deleteOtherOfflineDatabases(),
  ]);
}
