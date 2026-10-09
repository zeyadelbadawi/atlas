/**
 * Academy offline — the learner layer's contract: the Academy website's
 * allowlist (default deny; grants, video, `contentUrl`, grades never on
 * disk), per-academy and per-user isolation, the server-permitted lesson
 * text, the minimal identity snapshot, the revocation purge and the
 * sign-out wipe.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { ApiError, createApiError } from '@api';
import type { CurrentUser, LessonContentGrant } from '@types';
import {
  IndexedDbOfflineStore,
  MemoryOfflineStore,
  offlineStore,
  setOfflineStoreForTesting,
} from './offline-store';
import {
  PLATFORM_SCOPE,
  academyScope,
  configureOfflineScope,
  currentOfflineScope,
} from './offline-scope';
import {
  BUSTER,
  PUBLIC_OWNER,
  clearOfflineData,
  restorePersistedQueries,
  startQueryPersistence,
  type PersistedQueryRecord,
} from './query-persistence';
import {
  LEARNER_OFFLINE_TTL_MS,
  learnerOwnerOf,
  learnerPersistencePolicy,
} from './learner-persistence';
import {
  loadAssignmentDraft,
  loadOfflineLessonText,
  loadQuizJournal,
  purgeOfflineCourse,
  saveAssignmentDraft,
  saveOfflineLessonText,
  saveQuizJournal,
} from './learner-content';
import { startLearnerOfflineWatcher } from './learner-offline-watcher';
import {
  loadIdentitySnapshot,
  saveIdentitySnapshot,
} from './identity-snapshot';

let store: MemoryOfflineStore;

beforeEach(() => {
  store = new MemoryOfflineStore();
  setOfflineStoreForTesting(store);
  configureOfflineScope(academyScope('alpha.atlas.test'));
});

afterEach(() => {
  setOfflineStoreForTesting(null);
  configureOfflineScope(PLATFORM_SCOPE);
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const U1 = 'user-1';
const U2 = 'user-2';

function grant(over: Partial<LessonContentGrant> = {}): LessonContentGrant {
  return {
    lessonId: 'l1',
    courseId: 'c1',
    academyId: 'a1',
    title: 'Reading 1',
    kind: 'text',
    isPreview: false,
    durationSeconds: 300,
    completionRule: 'manual',
    minimumWatchedRatio: null,
    protection: {
      tier: null,
      signedUrl: true,
      expiresInSeconds: 600,
      boundToSession: false,
      boundToDevice: false,
      revocableBeforeExpiry: true,
      originRestricted: false,
      watermark: false,
      adaptiveBitrate: false,
      drm: false,
    },
    bodyHtml: '<p>Body</p>',
    resources: [
      { id: 'r1', title: 'Slides', url: 'https://cdn.test/r1?sig=SECRET' },
    ],
    watermark: { enabled: false, text: '' },
    playbackLease: { leaseId: 'lease-1', ttlSeconds: 60, heartbeatSeconds: 20 },
    resumePositionSeconds: 0,
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    offlineReading: {
      allowed: true,
      until: new Date(Date.now() + 72 * 3_600_000).toISOString(),
    },
    ...over,
  };
}

describe('learner allowlist — default deny', () => {
  it.each([
    // published website: public, for everyone on this academy's site
    [['public-website', 'resolve', 'alpha.atlas.test'], PUBLIC_OWNER],
    [['public-website', 'configuration', 'a1'], PUBLIC_OWNER],
    [['public-website', 'page', 'a1', 'about'], PUBLIC_OWNER],
    // other learners' words: never
    [['public-website', 'course-reviews', 'a1', 'c1'], null],
    // the learner's own outline, progress, enrolments, assignment brief
    [['learner', 'sequence', U1, 'c1'], U1],
    [['progress', 'course', U1, 'c1'], U1],
    [['enrollment', 'list', U1, { academyId: 'a1' }], U1],
    [['assignment', 'detail', U1, 'c1', 'asg1'], U1],
    // credentials, durable media, grades, answers, payments: never
    [['learner', 'lesson-grant', U1, 'c1', 'l1'], null],
    [['course-content', 'sections', U1, 'c1'], null],
    [['learner', 'overview', U1, 'a1'], null],
    [['learner', 'assessments', U1, 'a1', 'quiz'], null],
    [['quiz', 'session', U1, 'c1', 'q1', 'att1'], null],
    [['quiz', 'results', U1, 'c1', 'q1', 'att1'], null],
    [['assignment', 'submission', U1, 'c1', 'asg1'], null],
    [['course-order', 'list', U1], null],
    [['certificate', 'mine', U1, 'a1'], null],
    [['notification', 'list'], null],
    [['something-new', 'list'], null],
  ])('%j → %s', (key, owner) => {
    expect(learnerOwnerOf(key, U1)).toBe(owner);
  });

  it('never keeps a copy addressed to anyone but the signed-in learner', () => {
    expect(learnerOwnerOf(['learner', 'sequence', U2, 'c1'], U1)).toBeNull();
    expect(learnerOwnerOf(['learner', 'sequence', U1, 'c1'], null)).toBeNull();
  });
});

describe('learner persistence', () => {
  it('writes allowlisted reads; never the grant, a contentUrl or video-shaped data', async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    const stop = startQueryPersistence(
      client,
      () => U1,
      learnerPersistencePolicy
    );
    client.setQueryData(['learner', 'sequence', U1, 'c1'], { items: [] });
    client.setQueryData(['learner', 'lesson-grant', U1, 'c1', 'l1'], grant());
    client.setQueryData(
      ['course-content', 'sections', U1, 'c1'],
      [{ lessons: [{ contentUrl: 'https://cdn.test/v.mp4' }] }]
    );
    // An allowlisted family whose response suddenly carries a durable URL.
    client.setQueryData(['progress', 'course', U1, 'c2'], {
      lessons: [{ contentUrl: 'https://cdn.test/x.mp4' }],
    });
    client.setQueryData(['public-website', 'course', 'a1', 'c3'], {
      preview: { video: { url: 'https://cdn.test/p.m3u8' } },
    });
    await vi.advanceTimersByTimeAsync(1_500);
    stop();

    const records = await store.getAll<PersistedQueryRecord>('queries');
    expect(records.map((r) => r.queryKey)).toEqual([
      ['learner', 'sequence', U1, 'c1'],
    ]);
    expect(JSON.stringify(records)).not.toContain('SECRET');
    expect(JSON.stringify(records)).not.toContain('cdn.test');
  });

  it('restores public copies for anyone, own copies only for their owner', async () => {
    const now = Date.now();
    const record = (
      userId: string,
      queryKey: unknown[],
      savedAt = now
    ): PersistedQueryRecord => ({
      userId,
      queryHash: JSON.stringify(queryKey),
      queryKey,
      state: {
        data: { ok: userId },
        dataUpdatedAt: savedAt,
        status: 'success',
      },
      savedAt,
      bytes: 10,
      buster: BUSTER,
    });
    const put = (r: PersistedQueryRecord) =>
      store.put('queries', `${r.userId}|${r.queryHash}`, r);
    const pub = record(PUBLIC_OWNER, ['public-website', 'pages', 'a1']);
    const own = record(U1, ['learner', 'sequence', U1, 'c1']);
    const old = record(
      U1,
      ['progress', 'course', U1, 'c1'],
      now - LEARNER_OFFLINE_TTL_MS - 1
    );
    await Promise.all([put(pub), put(own), put(old)]);
    const has = async (r: PersistedQueryRecord) =>
      (await store.get('queries', `${r.userId}|${r.queryHash}`)) !== undefined;

    // Anonymous visitor: the published site only; the learner's copy stays.
    const anonymous = new QueryClient();
    await restorePersistedQueries(
      anonymous,
      null,
      now,
      learnerPersistencePolicy
    );
    expect(anonymous.getQueryData(['public-website', 'pages', 'a1'])).toEqual({
      ok: PUBLIC_OWNER,
    });
    expect(
      anonymous.getQueryData(['learner', 'sequence', U1, 'c1'])
    ).toBeUndefined();
    expect(await has(own)).toBe(true);
    expect(await has(old)).toBe(false); // expired: deleted

    // A different learner signs in: never sees user-1's copy, which is deleted.
    const other = new QueryClient();
    await restorePersistedQueries(other, U2, now, learnerPersistencePolicy);
    expect(
      other.getQueryData(['learner', 'sequence', U1, 'c1'])
    ).toBeUndefined();
    expect(await has(own)).toBe(false);
    expect(await has(pub)).toBe(true);
  });
});

describe('per-academy isolation', () => {
  it('every academy gets its own database, distinct from the dashboard, even on one host', () => {
    const a = academyScope('alpha.atlas.test');
    const b = academyScope('beta.atlas.test');
    const devA = academyScope('alpha');
    expect(
      new Set([a.dbName, b.dbName, devA.dbName, PLATFORM_SCOPE.dbName]).size
    ).toBe(4);
    expect(a.dbName.startsWith('atlas-offline:academy:')).toBe(true);
  });

  it('the store follows the configured scope', () => {
    setOfflineStoreForTesting(null);
    const opened: string[] = [];
    vi.stubGlobal('indexedDB', {
      open: (name: string) => {
        opened.push(name);
        throw new Error('not in tests');
      },
    });
    configureOfflineScope(academyScope('alpha.atlas.test'));
    const first = offlineStore();
    expect(first).toBeInstanceOf(IndexedDbOfflineStore);
    void first.get('queries', 'x');
    configureOfflineScope(academyScope('beta.atlas.test'));
    const second = offlineStore();
    expect(second).not.toBe(first);
    void second.get('queries', 'x');
    expect(opened).toEqual([
      'atlas-offline:academy:alpha.atlas.test',
      'atlas-offline:academy:beta.atlas.test',
    ]);
    expect(currentOfflineScope().key).toBe('academy:beta.atlas.test');
  });
});

describe('offline lesson text', () => {
  it('keeps title and body only, when the server allowed it', async () => {
    expect(await saveOfflineLessonText(U1, grant())).toBe(true);
    const saved = await loadOfflineLessonText(U1, 'c1', 'l1');
    expect(saved).toMatchObject({
      title: 'Reading 1',
      bodyHtml: '<p>Body</p>',
    });
    const raw = JSON.stringify(await store.getAll('content'));
    expect(raw).not.toContain('SECRET');
    expect(raw).not.toContain('lease-1');
    expect(raw).not.toContain('resources');
  });

  it.each([
    ['no permission', { offlineReading: undefined }],
    ['permission refused', { offlineReading: { allowed: false, until: null } }],
    [
      'a video lesson',
      {
        kind: 'video' as const,
        video: {
          format: 'hls' as const,
          url: 'https://stream.test/x.m3u8?token=T',
          downloadable: false as const,
        },
      },
    ],
    ['a preview', { isPreview: true }],
    [
      'an expired permission',
      { offlineReading: { allowed: true, until: new Date(0).toISOString() } },
    ],
  ])('never for %s', async (_label, over) => {
    expect(await saveOfflineLessonText(U1, grant(over))).toBe(false);
    expect(await store.getAll('content')).toEqual([]);
  });

  it('is read back only for its owner and only until it expires', async () => {
    await saveOfflineLessonText(U1, grant());
    expect(await loadOfflineLessonText(U2, 'c1', 'l1')).toBeNull();
    const later = Date.now() + 73 * 3_600_000;
    expect(await loadOfflineLessonText(U1, 'c1', 'l1', later)).toBeNull();
    expect(await store.getAll('content')).toEqual([]);
  });
});

describe('revocation purge (from the server answer)', () => {
  const grantKey = ['learner', 'lesson-grant', U1, 'c1', 'l1'];

  async function refuse(client: QueryClient, key: unknown[], error: unknown) {
    await client
      .fetchQuery({
        queryKey: key,
        queryFn: () => Promise.reject(error),
        retry: false,
      })
      .catch(() => undefined);
  }

  it('saves permitted text from a live grant; an ended enrolment purges the whole course', async () => {
    const client = new QueryClient();
    const stop = startLearnerOfflineWatcher(client, () => U1);
    client.setQueryData(grantKey, grant());
    await vi.waitFor(async () =>
      expect(await loadOfflineLessonText(U1, 'c1', 'l1')).not.toBeNull()
    );
    await saveAssignmentDraft({
      userId: U1,
      courseId: 'c1',
      assignmentId: 'asg1',
      response: 'draft',
      baseDraftSavedAt: null,
      synced: false,
    });
    await store.put('queries', `${U1}|seq`, {
      userId: U1,
      queryHash: 'seq',
      queryKey: ['learner', 'sequence', U1, 'c1'],
      state: {},
      savedAt: Date.now(),
      bytes: 1,
      buster: BUSTER,
    });

    await refuse(
      client,
      grantKey,
      new ApiError(
        createApiError('forbidden', {
          status: 403,
          messageKey: 'errors.learning.accessEnded',
        })
      )
    );
    await vi.waitFor(async () => {
      expect(await loadOfflineLessonText(U1, 'c1', 'l1')).toBeNull();
      expect(await loadAssignmentDraft(U1, 'c1', 'asg1')).toBeNull();
      expect(await store.get('queries', `${U1}|seq`)).toBeUndefined();
    });
    stop();
  });

  it('a 404 purges that lesson; a network failure purges nothing', async () => {
    const client = new QueryClient();
    const stop = startLearnerOfflineWatcher(client, () => U1);
    await saveOfflineLessonText(U1, grant());
    await refuse(client, grantKey, new ApiError(createApiError('network')));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(await loadOfflineLessonText(U1, 'c1', 'l1')).not.toBeNull();

    await refuse(
      client,
      grantKey,
      new ApiError(createApiError('notFound', { status: 404 }))
    );
    await vi.waitFor(async () =>
      expect(await loadOfflineLessonText(U1, 'c1', 'l1')).toBeNull()
    );
    stop();
  });

  it('purgeOfflineCourse leaves other courses alone', async () => {
    await saveOfflineLessonText(U1, grant());
    await saveOfflineLessonText(U1, grant({ courseId: 'c2', lessonId: 'l9' }));
    await purgeOfflineCourse(U1, 'c1');
    expect(await loadOfflineLessonText(U1, 'c1', 'l1')).toBeNull();
    expect(await loadOfflineLessonText(U1, 'c2', 'l9')).not.toBeNull();
  });
});

describe('untimed quiz journal', () => {
  it('journals an untimed attempt and refuses a timed one', async () => {
    expect(
      await saveQuizJournal({
        userId: U1,
        attemptId: 'att1',
        answers: [{ questionId: 'q1', selectedOptionIds: ['o1'] }],
        baseRevision: 2,
        timed: false,
      })
    ).toBe(true);
    expect(
      await saveQuizJournal({
        userId: U1,
        attemptId: 'att2',
        answers: [],
        baseRevision: 1,
        timed: true,
      })
    ).toBe(false);
    expect((await loadQuizJournal(U1, 'att1'))?.baseRevision).toBe(2);
    expect(await loadQuizJournal(U1, 'att2')).toBeNull();
    expect(await loadQuizJournal(U2, 'att1')).toBeNull();
  });
});

describe('identity snapshot on an Academy website', () => {
  const user: CurrentUser = {
    id: U1,
    email: 'learner@example.test',
    name: 'Layla',
    roles: ['student'],
    permissions: ['course.read'],
    organizations: [
      {
        organizationId: 'o1',
        organizationName: 'Other Org',
        role: 'manager',
        permissions: ['x'],
        isPrimary: true,
        joinedAt: '2026-01-01',
      },
    ],
    organizationMemberships: [],
    principalKind: 'learner',
    academies: [{ academyId: 'a9', academyName: 'Another Academy' } as never],
    createdAt: '2026-01-01',
  };

  it('keeps only id and display name — no e-mail, memberships, permissions or other academies', async () => {
    await saveIdentitySnapshot(user, {
      id: 'o1',
      name: 'Other Org',
      role: 'manager',
      permissions: [],
    });
    const snapshot = await loadIdentitySnapshot();
    expect(snapshot?.user).toMatchObject({ id: U1, name: 'Layla', email: '' });
    expect(snapshot?.organization).toBeUndefined();
    const raw = JSON.stringify(await store.getAll('meta'));
    expect(raw).not.toContain('learner@example.test');
    expect(raw).not.toContain('Other Org');
    expect(raw).not.toContain('Another Academy');
    expect(raw).not.toContain('course.read');
  });

  it('is never used to resume a session on another surface', async () => {
    await saveIdentitySnapshot(user);
    configureOfflineScope(academyScope('beta.atlas.test'));
    expect(await loadIdentitySnapshot()).toBeNull();
    configureOfflineScope(PLATFORM_SCOPE);
    expect(await loadIdentitySnapshot()).toBeNull();
  });
});

describe('sign-out', () => {
  it('wipes every store of this scope and deletes the other Atlas databases of the origin', async () => {
    await saveOfflineLessonText(U1, grant());
    await store.put('queries', 'q', { any: 1 });
    await store.put('outbox', 'o', { any: 1 });
    await store.put('meta', 'identity', { any: 1 });
    const deleted: string[] = [];
    vi.stubGlobal('indexedDB', {
      databases: async () => [
        { name: 'atlas-offline' },
        { name: 'atlas-offline:academy:beta.atlas.test' },
        { name: 'atlas-offline:academy:alpha.atlas.test' },
        { name: 'someone-elses-db' },
      ],
      deleteDatabase: (name: string) => {
        deleted.push(name);
        const request: { onsuccess?: () => void } = {};
        setTimeout(() => request.onsuccess?.(), 0);
        return request;
      },
    });
    await clearOfflineData();
    for (const name of ['queries', 'outbox', 'meta', 'content'] as const) {
      expect(await store.getAll(name)).toEqual([]);
    }
    expect(deleted.sort()).toEqual([
      'atlas-offline',
      'atlas-offline:academy:beta.atlas.test',
    ]);
  });
});
