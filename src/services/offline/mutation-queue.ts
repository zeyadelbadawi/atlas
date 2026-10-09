/**
 * Local-first dashboard — the durable outbox for changes made offline.
 *
 * ONLY REPLAY-SAFE CHANGES. A change is queued only if replaying it any
 * number of times, minutes or hours later, leaves the server exactly where
 * a single on-time request would have: marking a notification read (the
 * same PATCH twice is the same state), marking all read up to the moment
 * the person pressed it (`before` — never the ones that arrived later).
 * Anything that creates, pays, publishes or deletes stays online-only and
 * fails immediately with "you're offline" (`networkMode: 'always'`); it is
 * never silently replayed later. A new kind must make that argument in its
 * handler before it is registered.
 *
 * DURABLE. Entries live in IndexedDB, so a refresh, a closed tab or a
 * browser restart does not lose them. They belong to the user who made
 * them and only that user's session replays them; sign-out clears them.
 *
 * ONE RUNNER. Every tab can enqueue, but a Web Lock lets one tab drain the
 * queue at a time, so two tabs never send the same entry concurrently.
 *
 * GENTLE ON THE SERVER. A reconnect waits a random 0–10 s before the first
 * attempt (so a whole region coming back online does not arrive in the same
 * second), and failures back off exponentially with full jitter up to five
 * minutes. A transient failure stops the drain (the next entries would fail
 * the same way); a 401 waits for a new session; a 409 is a conflict the
 * person resolves; any other 4xx is a permanent failure shown to them.
 */
import { normalizeUnknownError } from '@api';
import { offlineStore } from './offline-store';

export type OutboxStatus = 'pending' | 'failed' | 'conflict';

export interface OutboxEntry<P = unknown> {
  readonly id: string;
  readonly userId: string;
  readonly kind: string;
  readonly payload: P;
  readonly createdAt: number;
  readonly attempts: number;
  readonly nextAttemptAt: number;
  readonly status: OutboxStatus;
  readonly lastErrorKey?: string;
}

export interface OutboxHandler<P = unknown> {
  /** Sends the change. Must be safe to run more than once (see header). */
  readonly run: (payload: P) => Promise<void>;
  /**
   * A permanent refusal that means "already done / no longer exists"
   * (e.g. a deleted notification: 404) is dropped instead of shown.
   */
  readonly dropOnStatus?: readonly number[];
  /**
   * Academy offline — an entry older than this is not sent any more; it is
   * marked failed (`OUTBOX_TOO_OLD_KEY`) for the person to see and discard.
   * The server's replay guards remember an operation for 10 days; the
   * client stops well before.
   */
  readonly maxAgeMs?: number;
}

export const OUTBOX_TOO_OLD_KEY = 'learning:offline.sync.tooOld';

export interface OutboxSnapshot {
  readonly pending: number;
  readonly failed: number;
  readonly conflict: number;
  readonly syncing: boolean;
  readonly lastSyncedAt: number | null;
}

export const RECONNECT_JITTER_MS = 10_000;
const BACKOFF_BASE_MS = 2_000;
const BACKOFF_CAP_MS = 5 * 60_000;
const LOCK_NAME = 'atlas:outbox';

const handlers = new Map<string, OutboxHandler<never>>();
const listeners = new Set<(snapshot: OutboxSnapshot) => void>();
let snapshot: OutboxSnapshot = {
  pending: 0,
  failed: 0,
  conflict: 0,
  syncing: false,
  lastSyncedAt: null,
};
let currentUser: () => string | null = () => null;
let timer: ReturnType<typeof setTimeout> | null = null;
let draining = false;

export function registerOutboxHandler<P>(
  kind: string,
  handler: OutboxHandler<P>
): void {
  handlers.set(kind, handler as OutboxHandler<never>);
  // Entries of this kind may have been waiting for this code to load.
  if (currentUser() && isOnline()) schedule(0);
}

/** Full jitter: uniformly random between 0 and the capped exponential step. */
export function backoffDelay(
  attempts: number,
  random: () => number = Math.random
): number {
  const ceiling = Math.min(
    BACKOFF_CAP_MS,
    BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1)
  );
  return Math.floor(random() * ceiling);
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

function emit(next: Partial<OutboxSnapshot>): void {
  snapshot = { ...snapshot, ...next };
  for (const listener of listeners) listener(snapshot);
}

export function subscribeOutbox(
  listener: (snapshot: OutboxSnapshot) => void
): () => void {
  listeners.add(listener);
  listener(snapshot);
  return () => listeners.delete(listener);
}

export function getOutboxSnapshot(): OutboxSnapshot {
  return snapshot;
}

/** The signed-in user's entries of one kind, oldest first — for "waiting to send" states in the UI. */
export async function listOutboxEntries<P>(
  kind: string
): Promise<readonly OutboxEntry<P>[]> {
  const userId = currentUser();
  if (!userId) return [];
  return (await entriesFor(userId)).filter(
    (entry) => entry.kind === kind
  ) as OutboxEntry<P>[];
}

async function entriesFor(userId: string): Promise<OutboxEntry[]> {
  const all = await offlineStore().getAll<OutboxEntry>('outbox');
  return all
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

async function refreshCounts(): Promise<void> {
  const userId = currentUser();
  const entries = userId ? await entriesFor(userId) : [];
  emit({
    pending: entries.filter((e) => e.status === 'pending').length,
    failed: entries.filter((e) => e.status === 'failed').length,
    conflict: entries.filter((e) => e.status === 'conflict').length,
  });
}

function schedule(delayMs: number): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(
    () => {
      timer = null;
      void drainOutbox();
    },
    Math.max(0, delayMs)
  );
}

/**
 * Queues a change for the signed-in user and tries to send it right away
 * when online. Returns `false` when it could not be stored (no IndexedDB):
 * the caller then tells the person the change needs a connection.
 */
export async function enqueueOutbox<P>(
  userId: string,
  kind: string,
  payload: P,
  id: string = crypto.randomUUID(),
  options: {
    /**
     * Pending entries of the same user and kind this one supersedes (e.g.
     * an earlier complete/undo of the same lesson): removed before this one
     * is stored, so only the latest intent is sent.
     */
    readonly supersedes?: (entry: OutboxEntry<P>) => boolean;
  } = {}
): Promise<boolean> {
  if (!handlers.has(kind)) throw new Error(`No outbox handler for ${kind}`);
  if (options.supersedes) {
    for (const entry of await entriesFor(userId)) {
      if (
        entry.kind === kind &&
        entry.status === 'pending' &&
        options.supersedes(entry as OutboxEntry<P>)
      ) {
        await offlineStore().delete('outbox', entry.id);
      }
    }
  }
  const entry: OutboxEntry<P> = {
    id,
    userId,
    kind,
    payload,
    createdAt: Date.now(),
    attempts: 0,
    nextAttemptAt: 0,
    status: 'pending',
  };
  const stored = await offlineStore().put('outbox', id, entry);
  await refreshCounts();
  if (stored && isOnline()) schedule(0);
  return stored;
}

/** Retry entries the person chose to retry (failed ones) — or everything due. */
export async function retryOutbox(): Promise<void> {
  const userId = currentUser();
  if (!userId) return;
  for (const entry of await entriesFor(userId)) {
    if (entry.status === 'failed') {
      await offlineStore().put('outbox', entry.id, {
        ...entry,
        status: 'pending',
        attempts: 0,
        nextAttemptAt: 0,
      });
    }
  }
  await refreshCounts();
  schedule(0);
}

/**
 * Drop every change that cannot be synced as it is (failed or in conflict)
 * — the person's choice, so a permanent refusal never leaves the dashboard
 * with a warning it cannot clear.
 */
export async function discardUnsyncableOutbox(): Promise<void> {
  const userId = currentUser();
  if (!userId) return;
  for (const entry of await entriesFor(userId)) {
    if (entry.status !== 'pending')
      await offlineStore().delete('outbox', entry.id);
  }
  await refreshCounts();
}

/** Drop one entry (e.g. a conflict the person resolved another way). */
export async function discardOutboxEntry(id: string): Promise<void> {
  await offlineStore().delete('outbox', id);
  await refreshCounts();
}

async function withLock(work: () => Promise<void>): Promise<void> {
  const locks = (navigator as Navigator & { locks?: LockManager }).locks;
  if (!locks?.request) {
    await work();
    return;
  }
  // `ifAvailable`: another tab is already draining; this one need not wait.
  await locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
    if (lock) await work();
  });
}

/** Sends every due entry for the signed-in user, oldest first. */
export async function drainOutbox(now: () => number = Date.now): Promise<void> {
  const userId = currentUser();
  if (!userId || draining || !isOnline()) return;
  draining = true;
  emit({ syncing: true });
  try {
    await withLock(async () => {
      let nextDue: number | null = null;
      for (const entry of await entriesFor(userId)) {
        if (entry.status !== 'pending') continue;
        if (entry.nextAttemptAt > now()) {
          nextDue = Math.min(nextDue ?? Infinity, entry.nextAttemptAt);
          continue;
        }
        const handler = handlers.get(entry.kind);
        // Its feature's code has not loaded yet (route chunks load lazily):
        // the entry waits; registering the handler drains again.
        if (!handler) continue;
        if (
          handler.maxAgeMs !== undefined &&
          now() - entry.createdAt > handler.maxAgeMs
        ) {
          await offlineStore().put('outbox', entry.id, {
            ...entry,
            status: 'failed',
            lastErrorKey: OUTBOX_TOO_OLD_KEY,
          });
          continue;
        }
        try {
          await handler.run(entry.payload as never);
          await offlineStore().delete('outbox', entry.id);
          emit({ lastSyncedAt: now() });
        } catch (raw) {
          const error = normalizeUnknownError(raw);
          const status = error.status;
          if (status !== undefined && handler.dropOnStatus?.includes(status)) {
            await offlineStore().delete('outbox', entry.id);
            continue;
          }
          if (error.kind === 'unauthorized') {
            // The session must be renewed first; keep the entry as it is.
            break;
          }
          if (error.kind === 'conflict') {
            await offlineStore().put('outbox', entry.id, {
              ...entry,
              status: 'conflict',
              lastErrorKey: error.messageKey,
            });
            continue;
          }
          const transient =
            error.kind === 'network' ||
            error.kind === 'timeout' ||
            error.kind === 'server' ||
            error.kind === 'rateLimited';
          if (transient) {
            const attempts = entry.attempts + 1;
            const due = now() + backoffDelay(attempts);
            await offlineStore().put('outbox', entry.id, {
              ...entry,
              attempts,
              nextAttemptAt: due,
              lastErrorKey: error.messageKey,
            });
            nextDue = Math.min(nextDue ?? Infinity, due);
            // The next entries would fail the same way; try again later.
            break;
          }
          await offlineStore().put('outbox', entry.id, {
            ...entry,
            status: 'failed',
            lastErrorKey: error.messageKey,
          });
        }
      }
      if (nextDue !== null) schedule(nextDue - now());
    });
  } finally {
    draining = false;
    emit({ syncing: false });
    await refreshCounts();
  }
}

/**
 * Starts the runner for whoever `getUserId` returns: drains on start, on
 * reconnect (after a random delay) and when the tab becomes visible.
 * Returns the stop function.
 */
export function startOutbox(getUserId: () => string | null): () => void {
  currentUser = getUserId;
  const onOnline = () =>
    schedule(Math.floor(Math.random() * RECONNECT_JITTER_MS));
  const onVisible = () => {
    if (document.visibilityState === 'visible') schedule(0);
  };
  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisible);
  void refreshCounts();
  schedule(0);
  return () => {
    window.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onVisible);
    if (timer) clearTimeout(timer);
    timer = null;
    currentUser = () => null;
  };
}

/** Tests only. */
export function resetOutboxForTesting(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  draining = false;
  handlers.clear();
  listeners.clear();
  currentUser = () => null;
  snapshot = {
    pending: 0,
    failed: 0,
    conflict: 0,
    syncing: false,
    lastSyncedAt: null,
  };
}
