/**
 * Local-first dashboard — the offline layer's contract: what is persisted,
 * for whom, for how long; how the outbox replays (and refuses to replay);
 * the identity snapshot and the pending offline sign-out.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { createApiError, ApiError } from '@api';
import {
  academyKeys,
  auditLogKeys,
  courseOrderKeys,
  customerRequestKeys,
  platformWatermarkKeys,
  websiteKeys,
} from '@/services/query/query-keys';
import { MemoryOfflineStore, setOfflineStoreForTesting } from './offline-store';
import type { OfflineStore } from './offline-store';
import {
  BUSTER,
  MAX_ENTRY_BYTES,
  OFFLINE_CACHE_TTL_MS,
  clearOfflineData,
  isPersistableQueryKey,
  restorePersistedQueries,
  startQueryPersistence,
} from './query-persistence';
import type { PersistedQueryRecord } from './query-persistence';
import {
  backoffDelay,
  drainOutbox,
  enqueueOutbox,
  getOutboxSnapshot,
  registerOutboxHandler,
  resetOutboxForTesting,
  retryOutbox,
  startOutbox,
} from './mutation-queue';
import type { OutboxEntry } from './mutation-queue';
import {
  IDENTITY_SNAPSHOT_TTL_MS,
  clearPendingSignOut,
  hasPendingSignOut,
  loadIdentitySnapshot,
  markPendingSignOut,
  saveIdentitySnapshot,
} from './identity-snapshot';
import {
  getConnectivity,
  reportNetworkFailure,
  reportServerReached,
  resetConnectivityForTesting,
} from './connectivity';

let store: MemoryOfflineStore;

beforeEach(() => {
  store = new MemoryOfflineStore();
  setOfflineStoreForTesting(store);
  resetOutboxForTesting();
  resetConnectivityForTesting();
  window.localStorage.clear();
});

afterEach(() => {
  setOfflineStoreForTesting(null);
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const apiError = (
  kind: Parameters<typeof createApiError>[0],
  status?: number
) => new ApiError(createApiError(kind, { status }));

describe('isPersistableQueryKey — default deny', () => {
  it.each([
    [['academy', 'list'], true],
    [['academy', 'detail', 'a1'], true],
    [['course', 'detail', 'c1'], true],
    [['dashboard', 'overview'], true],
    [['notification', 'scope', 'academy:a1', 'list'], true],
    [['website', 'pages', 'a1'], true],
    [websiteKeys.configuration('a1'), true],
    [websiteKeys.page('a1', 'p1'), true],
    [websiteKeys.faqEntries('a1'), true],
    [websiteKeys.testimonialEntry('a1', 't1'), true],
  ])('keeps %j', (key, expected) => {
    expect(isPersistableQueryKey(key)).toBe(expected);
  });

  it.each([
    [['academy', 'members', 'a1']],
    // Built from the real key factories: a literal here once hid that the
    // exclusion list spelled the contact-submission keys differently.
    [websiteKeys.contactSubmissions('a1')],
    [websiteKeys.allContactSubmissions('a1')],
    [websiteKeys.contactSubmissionSummary('a1')],
    [['website', 'some-future-key', 'a1']],
    [academyKeys.members('o1', 'a1')],
    [academyKeys.memberLookup('o1', 'a1', 'student', 'x@example.com')],
    [auditLogKeys.academyFeed('a1')],
    [customerRequestKeys.academyList('a1')],
    [courseOrderKeys.list('u1')],
    // Forensic watermark lookups name a person (name, email, phone, IP).
    [platformWatermarkKeys.lookup('7K3QMX9TR7')],
    [['orders', 'list']],
    [['billing']],
    [['currentUser']],
    [[]],
  ])('never writes %j to disk', (key) => {
    expect(isPersistableQueryKey(key)).toBe(false);
  });
});

describe('query persistence', () => {
  it('saves a settled allowlisted query under the signed-in user only', async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    const stop = startQueryPersistence(client, () => 'u1');
    client.setQueryData(['academy', 'detail', 'a1'], { id: 'a1' });
    client.setQueryData(['academy', 'members', 'a1'], [{ email: 'x@y.z' }]);
    await vi.advanceTimersByTimeAsync(1_500);
    stop();
    const records = await store.getAll<PersistedQueryRecord>('queries');
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      userId: 'u1',
      queryKey: ['academy', 'detail', 'a1'],
      buster: BUSTER,
    });
  });

  it('skips oversized records and queries that opt out', async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    const stop = startQueryPersistence(client, () => 'u1');
    client.setQueryData(['course', 'big'], 'x'.repeat(MAX_ENTRY_BYTES + 10));
    await vi.advanceTimersByTimeAsync(1_500);
    stop();
    expect(await store.getAll('queries')).toHaveLength(0);
  });

  it('writes nothing while no one is signed in', async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    const stop = startQueryPersistence(client, () => null);
    client.setQueryData(['academy', 'list'], []);
    await vi.advanceTimersByTimeAsync(1_500);
    stop();
    expect(await store.getAll('queries')).toHaveLength(0);
  });

  it("restores only this user's fresh, current-build copies and deletes the rest", async () => {
    const now = Date.now();
    const record = (
      key: string,
      userId: string,
      savedAt: number,
      buster = BUSTER
    ): PersistedQueryRecord => ({
      userId,
      queryHash: JSON.stringify(['academy', 'detail', key]),
      queryKey: ['academy', 'detail', key],
      state: {
        data: { id: key },
        dataUpdatedAt: savedAt,
        status: 'success',
        fetchStatus: 'idle',
        error: null,
        errorUpdateCount: 0,
        errorUpdatedAt: 0,
        dataUpdateCount: 1,
        fetchFailureCount: 0,
        fetchFailureReason: null,
        fetchMeta: null,
        isInvalidated: false,
      },
      savedAt,
      bytes: 20,
      buster,
    });
    const put = (r: PersistedQueryRecord) =>
      store.put('queries', `${r.userId}|${r.queryHash}`, r);
    await put(record('mine', 'u1', now - 1_000));
    await put(record('theirs', 'u2', now - 1_000));
    await put(record('stale', 'u1', now - OFFLINE_CACHE_TTL_MS - 1));
    await put(record('old-build', 'u1', now - 1_000, 'atlas-offline-v0'));

    const client = new QueryClient();
    const result = await restorePersistedQueries(client, 'u1', now);

    expect(result).toEqual({ count: 1, newestSavedAt: now - 1_000 });
    expect(client.getQueryData(['academy', 'detail', 'mine'])).toEqual({
      id: 'mine',
    });
    expect(
      client.getQueryData(['academy', 'detail', 'theirs'])
    ).toBeUndefined();
    const left = await store.getAll<PersistedQueryRecord>('queries');
    expect(left.map((r) => r.userId).sort()).toEqual(['u1']);
  });

  it('deletes a saved record the allowlist no longer admits (e.g. contact submissions saved by an earlier build)', async () => {
    const now = Date.now();
    const store = new MemoryOfflineStore();
    setOfflineStoreForTesting(store);
    const key = websiteKeys.contactSubmissions('a1');
    await store.put('queries', `u1|${JSON.stringify(key)}`, {
      userId: 'u1',
      queryHash: JSON.stringify(key),
      queryKey: key,
      state: { data: [{ email: 'visitor@example.com' }], dataUpdatedAt: now },
      savedAt: now - 1_000,
      bytes: 40,
      buster: BUSTER,
    } satisfies PersistedQueryRecord);

    const client = new QueryClient();
    const result = await restorePersistedQueries(client, 'u1', now);

    expect(result.count).toBe(0);
    expect(client.getQueryData(key)).toBeUndefined();
    expect(await store.getAll('queries')).toEqual([]);
  });

  it('a restored copy is never fresh, even one saved a second before the reload', async () => {
    vi.useFakeTimers();
    const writer = new QueryClient();
    const stop = startQueryPersistence(writer, () => 'u1');
    writer.setQueryData(['course', 'detail', 'c1'], { title: 'before' });
    await vi.advanceTimersByTimeAsync(1_500);
    stop();
    vi.useRealTimers();

    // A new page load: staleTime would treat a just-saved copy as fresh.
    const reader = new QueryClient({
      defaultOptions: { queries: { staleTime: 60_000 } },
    });
    await restorePersistedQueries(reader, 'u1');
    const query = reader
      .getQueryCache()
      .find({ queryKey: ['course', 'detail', 'c1'] });
    expect(query?.state.data).toEqual({ title: 'before' });
    expect(query?.isStale()).toBe(true);
  });

  it('does not touch fresher data the page already loaded', async () => {
    const writer = new QueryClient();
    vi.useFakeTimers();
    const stop = startQueryPersistence(writer, () => 'u1');
    writer.setQueryData(['course', 'detail', 'c2'], { title: 'saved' });
    await vi.advanceTimersByTimeAsync(1_500);
    stop();
    vi.useRealTimers();

    const reader = new QueryClient({
      defaultOptions: { queries: { staleTime: 60_000 } },
    });
    reader.setQueryData(
      ['course', 'detail', 'c2'],
      { title: 'live' },
      {
        updatedAt: Date.now() + 10_000,
      }
    );
    await restorePersistedQueries(reader, 'u1');
    const query = reader
      .getQueryCache()
      .find({ queryKey: ['course', 'detail', 'c2'] });
    expect(query?.state.data).toEqual({ title: 'live' });
    expect(query?.isStale()).toBe(false);
  });

  it('clearOfflineData wipes copies, queued changes and metadata', async () => {
    await store.put('queries', 'k', { a: 1 });
    await store.put('outbox', 'k', { a: 1 });
    await store.put('meta', 'k', { a: 1 });
    await clearOfflineData();
    expect(await store.getAll('queries')).toEqual([]);
    expect(await store.getAll('outbox')).toEqual([]);
    expect(await store.getAll('meta')).toEqual([]);
  });
});

describe('outbox', () => {
  const entries = () => store.getAll<OutboxEntry>('outbox');

  it('refuses kinds without a replay-safe handler', async () => {
    await expect(enqueueOutbox('u1', 'course.delete', {})).rejects.toThrow(
      /No outbox handler/
    );
  });

  it('replays queued entries oldest first for the signed-in user only', async () => {
    const sent: string[] = [];
    registerOutboxHandler<{ n: string }>('t.ok', {
      run: async ({ n }) => {
        sent.push(n);
      },
    });
    vi.stubGlobal('navigator', { ...navigator, onLine: false });
    await enqueueOutbox('u1', 't.ok', { n: 'first' }, 'e1');
    await enqueueOutbox('u2', 't.ok', { n: 'other-user' }, 'e2');
    await enqueueOutbox('u1', 't.ok', { n: 'second' }, 'e3');
    vi.unstubAllGlobals();

    const stop = startOutbox(() => 'u1');
    await drainOutbox();
    stop();
    expect(sent).toEqual(['first', 'second']);
    expect((await entries()).map((e) => e.userId)).toEqual(['u2']);
  });

  it('does not send while the browser is offline', async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    registerOutboxHandler('t.ok', { run });
    vi.stubGlobal('navigator', { ...navigator, onLine: false });
    await enqueueOutbox('u1', 't.ok', {}, 'e1');
    startOutbox(() => 'u1');
    await drainOutbox();
    expect(run).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(getOutboxSnapshot().pending).toBe(1));
  });

  it('backs off on a transient failure and stops the drain', async () => {
    const second = vi.fn().mockResolvedValue(undefined);
    registerOutboxHandler('t.down', {
      run: vi.fn().mockRejectedValue(apiError('server', 503)),
    });
    registerOutboxHandler('t.ok', { run: second });
    vi.stubGlobal('navigator', { ...navigator, onLine: false });
    await enqueueOutbox('u1', 't.down', {}, 'e1');
    await enqueueOutbox('u1', 't.ok', {}, 'e2');
    vi.unstubAllGlobals();
    startOutbox(() => 'u1');
    await drainOutbox(() => 1_000);
    const [first] = (await entries()).filter((e) => e.id === 'e1');
    expect(first.attempts).toBe(1);
    expect(first.status).toBe('pending');
    expect(first.nextAttemptAt).toBeGreaterThanOrEqual(1_000);
    expect(second).not.toHaveBeenCalled();
  });

  it('drops an entry the server says no longer exists (dropOnStatus)', async () => {
    registerOutboxHandler('t.gone', {
      run: vi.fn().mockRejectedValue(apiError('notFound', 404)),
      dropOnStatus: [404],
    });
    vi.stubGlobal('navigator', { ...navigator, onLine: false });
    await enqueueOutbox('u1', 't.gone', {}, 'e1');
    vi.unstubAllGlobals();
    startOutbox(() => 'u1');
    await drainOutbox();
    expect(await entries()).toEqual([]);
  });

  it('keeps entries untouched on 401 (waits for a new session)', async () => {
    registerOutboxHandler('t.auth', {
      run: vi.fn().mockRejectedValue(apiError('unauthorized', 401)),
    });
    vi.stubGlobal('navigator', { ...navigator, onLine: false });
    await enqueueOutbox('u1', 't.auth', {}, 'e1');
    vi.unstubAllGlobals();
    startOutbox(() => 'u1');
    await drainOutbox();
    expect(await entries()).toMatchObject([
      { id: 'e1', status: 'pending', attempts: 0 },
    ]);
  });

  it('marks a 409 as a conflict and other 4xx as failed; retry re-queues failed ones', async () => {
    registerOutboxHandler('t.conflict', {
      run: vi.fn().mockRejectedValue(apiError('conflict', 409)),
    });
    const forbidden = vi
      .fn()
      .mockRejectedValueOnce(apiError('forbidden', 403))
      .mockResolvedValue(undefined);
    registerOutboxHandler('t.forbidden', { run: forbidden });
    vi.stubGlobal('navigator', { ...navigator, onLine: false });
    await enqueueOutbox('u1', 't.conflict', {}, 'e1');
    await enqueueOutbox('u1', 't.forbidden', {}, 'e2');
    vi.unstubAllGlobals();
    startOutbox(() => 'u1');
    await drainOutbox();
    expect(getOutboxSnapshot()).toMatchObject({
      conflict: 1,
      failed: 1,
      pending: 0,
    });

    await retryOutbox();
    await drainOutbox();
    expect(forbidden).toHaveBeenCalledTimes(2);
    expect(getOutboxSnapshot()).toMatchObject({
      conflict: 1,
      failed: 0,
      pending: 0,
    });
  });

  it('leaves entries whose feature code has not loaded yet', async () => {
    registerOutboxHandler('t.later', { run: vi.fn() });
    vi.stubGlobal('navigator', { ...navigator, onLine: false });
    await enqueueOutbox('u1', 't.later', {}, 'e1');
    vi.unstubAllGlobals();
    resetOutboxForTesting(); // handler registry gone, as on a fresh page load
    startOutbox(() => 'u1');
    await drainOutbox();
    expect(await entries()).toHaveLength(1);
  });

  it('backoffDelay is full-jitter, exponential and capped at five minutes', () => {
    expect(backoffDelay(1, () => 0.999)).toBeLessThan(2_000);
    expect(backoffDelay(3, () => 0.999)).toBeLessThan(8_000);
    expect(backoffDelay(3, () => 0.999)).toBeGreaterThan(7_000);
    expect(backoffDelay(30, () => 0.999)).toBeLessThan(5 * 60_000);
    expect(backoffDelay(5, () => 0)).toBe(0);
  });
});

describe('identity snapshot + pending offline sign-out', () => {
  const user = { id: 'u1', email: 'owner@example.test' } as never;

  it('round-trips within its lifetime and expires after it', async () => {
    await saveIdentitySnapshot(user);
    expect((await loadIdentitySnapshot())?.user).toMatchObject({ id: 'u1' });
    expect(
      await loadIdentitySnapshot(Date.now() + IDENTITY_SNAPSHOT_TTL_MS + 1)
    ).toBeNull();
  });

  it('pending sign-out marker is set, read and cleared', () => {
    expect(hasPendingSignOut()).toBe(false);
    markPendingSignOut();
    expect(hasPendingSignOut()).toBe(true);
    clearPendingSignOut();
    expect(hasPendingSignOut()).toBe(false);
  });
});

describe('connectivity', () => {
  it('distinguishes offline from "network says online but the server is unreachable"', () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: true });
    reportNetworkFailure();
    expect(getConnectivity().state).toBe('reconnecting');
    reportServerReached();
    expect(getConnectivity().state).toBe('online');
    vi.stubGlobal('navigator', { ...navigator, onLine: false });
    reportNetworkFailure();
    expect(getConnectivity().state).toBe('offline');
  });
});

describe('a store that is unavailable', () => {
  it('fails closed: enqueue reports it could not store the change', async () => {
    const broken: OfflineStore = {
      get: async () => undefined,
      getAll: async () => [],
      put: async () => false,
      delete: async () => undefined,
      clear: async () => undefined,
      status: () => 'unavailable',
    };
    setOfflineStoreForTesting(broken);
    registerOutboxHandler('t.ok', { run: vi.fn() });
    expect(await enqueueOutbox('u1', 't.ok', {})).toBe(false);
  });
});
