/**
 * J45 — local-first dashboard, Chromium against the real API and a
 * PRODUCTION build of the app (the app-shell worker only exists there):
 *
 *   E2E_BASE_URL=http://localhost:3002  (vite build && vite preview --port 3002)
 *
 * Covered:
 *   1. Online once: the shell worker installs and the allowlisted reads are
 *      saved for THIS user only.
 *   2. Offline, then RELOAD: the dashboard still opens (shell from the
 *      worker, data from the saved copies, session resumed read-only) and
 *      the banner says offline.
 *   3. Offline: marking a notification read updates the badge at once and
 *      is queued durably; back online, it reaches the server — and only
 *      that notification, not the other unread one.
 *   4. Sign-out while offline: this tab signs out at once and the saved
 *      copies are wiped; the server session stays valid until the next
 *      online start, which revokes it FIRST and restores nothing.
 *   5. Another person signing in on the same browser never sees the first
 *      person's saved copies (every saved record is theirs).
 *   6. A browser without IndexedDB: sign-in and the dashboard work as before
 *      (offline support simply degrades).
 * Notifications created here are deleted afterwards.
 */
import { expect, test, type Page } from '@playwright/test';
import { adminQuery, adminSql } from './support/admin-db';
import {
  SEED,
  seedCookieDecision,
  signInThroughDashboard,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';

test.describe.configure({ mode: 'serial', timeout: 300_000 });

const TAG = `J45-${Date.now()}`;

/** The saved query records, WITHOUT creating the database if it is absent. */
function savedRecords(page: Page) {
  return page.evaluate(async () => {
    const dbs = (await indexedDB.databases?.()) ?? [];
    if (!dbs.some((db) => db.name === 'atlas-offline')) return null;
    return new Promise<{
      queries: { userId: string; key: unknown }[];
      outbox: { kind: string; userId: string }[];
    }>((resolve) => {
      const open = indexedDB.open('atlas-offline');
      open.onsuccess = () => {
        const db = open.result;
        const read = <T>(store: string) =>
          new Promise<T[]>((res) => {
            if (!db.objectStoreNames.contains(store)) return res([]);
            const request = db.transaction(store).objectStore(store).getAll();
            request.onsuccess = () => res(request.result as T[]);
            request.onerror = () => res([]);
          });
        void Promise.all([
          read<{ userId: string; queryKey: unknown }>('queries'),
          read<{ kind: string; userId: string }>('outbox'),
        ]).then(([queries, outbox]) => {
          db.close();
          resolve({
            queries: queries.map((q) => ({
              userId: q.userId,
              key: q.queryKey,
            })),
            outbox: outbox.map((o) => ({ kind: o.kind, userId: o.userId })),
          });
        });
      };
      open.onerror = () => resolve({ queries: [], outbox: [] });
    });
  });
}

async function userId(email: string): Promise<string> {
  const [row] = await adminQuery<{ id: string }>(
    `select id from users where email = :'e'`,
    { e: email }
  );
  return row.id;
}

async function signIn(page: Page, email: string) {
  await clearAuthRateLimits();
  await signInThroughDashboard(page, email, SEED.password);
  await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
}

const banner = (page: Page) => page.locator('[data-connectivity]');
const bell = (page: Page) =>
  page.getByRole('button', { name: /notification/i }).first();

test.describe('J45 — offline dashboard', () => {
  let ownerId: string;
  const ids: Record<'first' | 'second', string> = { first: '', second: '' };

  test.beforeAll(async () => {
    ownerId = await userId(SEED.owner);
    for (const [slot, minutesAgo] of [
      ['first', 2],
      ['second', 1],
    ] as const) {
      await adminSql(
        `insert into notifications
           (id, user_id, type, priority, title_key, message_key, values,
            context, created_at, updated_at)
         values (gen_random_uuid(), :'u', 'system', 'medium',
           'notifications:events.provisioningCompleted.title',
           'notifications:events.provisioningCompleted.message',
           jsonb_build_object('academyName', :'name'),
           'management', now() - (:'m' || ' minutes')::interval, now())`,
        { u: ownerId, name: `${TAG}-${slot}`, m: String(minutesAgo) }
      );
      const [row] = await adminQuery<{ id: string }>(
        `select id from notifications where values->>'academyName' = :'name'`,
        { name: `${TAG}-${slot}` }
      );
      ids[slot] = row.id;
    }
  });

  test.afterAll(async () => {
    await adminSql(
      `delete from notifications where values->>'academyName' like :'p'`,
      { p: `${TAG}-%` }
    );
  });

  test('offline reload, queued read, offline sign-out, account isolation', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await seedCookieDecision(page);
    const startedAt = new Date().toISOString();

    // 1. Online once.
    await signIn(page, SEED.owner);
    await page.waitForFunction(
      async () => !!(await navigator.serviceWorker.ready).active,
      undefined,
      { timeout: 60_000 }
    );
    await expect(bell(page)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('notification-bell-badge')).toBeVisible();
    await expect
      .poll(async () => (await savedRecords(page))?.queries.length ?? 0, {
        timeout: 30_000,
      })
      .toBeGreaterThan(0);
    const online = await savedRecords(page);
    expect(new Set(online!.queries.map((q) => q.userId))).toEqual(
      new Set([ownerId])
    );
    // Nothing outside the allowlist is ever written.
    for (const { key } of online!.queries) {
      expect([
        'academy',
        'course',
        'dashboard',
        'notification',
        'organizations',
        'website',
      ]).toContain((key as unknown[])[0]);
    }
    // Open the bell once online, so its list is saved too.
    await bell(page).click();
    await expect(
      page.getByRole('listitem').filter({ hasText: `${TAG}-first` })
    ).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1_500); // the save is debounced by 1 s
    const badgeOnline = Number(
      await page.getByTestId('notification-bell-badge').textContent()
    );
    expect(badgeOnline).toBeGreaterThanOrEqual(2);

    // 2. Offline + reload.
    await context.setOffline(true);
    await page.reload();
    await expect(banner(page)).toHaveAttribute('data-connectivity', 'offline', {
      timeout: 30_000,
    });
    await expect(bell(page)).toBeVisible();
    await expect(page.getByTestId('notification-bell-badge')).toHaveText(
      String(badgeOnline)
    );

    // 3. Mark one notification read offline.
    await bell(page).click();
    const firstTitle = `Mark "Your academy is ready" as read`;
    const row = page.getByRole('listitem').filter({ hasText: `${TAG}-first` });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: firstTitle }).click();
    await expect(page.getByTestId('notification-bell-badge')).toHaveText(
      String(badgeOnline - 1)
    );
    await expect
      .poll(async () => (await savedRecords(page))?.outbox ?? [])
      .toEqual([{ kind: 'notification.read', userId: ownerId }]);
    await page.keyboard.press('Escape');
    // Still unread on the server while offline.
    const readState = async () =>
      Object.fromEntries(
        (
          await adminQuery<{ id: string; is_read: boolean }>(
            `select id, is_read from notifications where id in (:'a', :'b')`,
            { a: ids.first, b: ids.second }
          )
        ).map((r) => [r.id, r.is_read])
      );
    expect(await readState()).toEqual({
      [ids.first]: false,
      [ids.second]: false,
    });

    // Back online: the queued change syncs (after the reconnect jitter).
    await context.setOffline(false);
    await expect
      .poll(readState, { timeout: 60_000, intervals: [1_000] })
      .toEqual({ [ids.first]: true, [ids.second]: false });
    await expect
      .poll(async () => (await savedRecords(page))?.outbox.length ?? -1)
      .toBe(0);

    // 4. Sign out while offline.
    await context.setOffline(true);
    await page
      .getByRole('button', { name: /welcome/i })
      .first()
      .click();
    await page.getByRole('menuitem', { name: /sign out/i }).click();
    await page.waitForURL(/\/auth\/sign-in/, { timeout: 30_000 });
    expect(
      await page.evaluate(() =>
        window.localStorage.getItem('atlas:pending-sign-out')
      )
    ).not.toBeNull();
    expect((await savedRecords(page))?.queries ?? []).toEqual([]);
    const liveTokens = () =>
      adminQuery<{ n: number }>(
        `select count(*)::int as n from refresh_tokens
          where user_id = :'u' and created_at >= :'t' and revoked_at is null`,
        { u: ownerId, t: startedAt }
      ).then(([r]) => r.n);
    // The server could not be told yet: the session is still live there.
    expect(await liveTokens()).toBeGreaterThan(0);

    await context.setOffline(false);
    await page.reload();
    await expect.poll(liveTokens, { timeout: 30_000 }).toBe(0);
    expect(
      await page.evaluate(() =>
        window.localStorage.getItem('atlas:pending-sign-out')
      )
    ).toBeNull();
    await page.goto('/dashboard');
    await page.waitForURL(/\/auth\/sign-in/, { timeout: 30_000 });

    // 5. Another person on the same browser.
    const managerId = await userId(SEED.manager);
    await signIn(page, SEED.manager);
    await expect(bell(page)).toBeVisible({ timeout: 60_000 });
    await expect
      .poll(async () => (await savedRecords(page))?.queries.length ?? 0, {
        timeout: 30_000,
      })
      .toBeGreaterThan(0);
    const managerRecords = await savedRecords(page);
    expect(new Set(managerRecords!.queries.map((q) => q.userId))).toEqual(
      new Set([managerId])
    );
    await context.close();
  });

  test('without IndexedDB the dashboard works online as before', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    await context.addInitScript(() => {
      Object.defineProperty(window, 'indexedDB', {
        configurable: true,
        get: () => undefined,
      });
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await seedCookieDecision(page);
    await signIn(page, SEED.owner);
    await expect(bell(page)).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('main')).toBeVisible();
    expect(errors).toEqual([]);
    await context.close();
  });
});
