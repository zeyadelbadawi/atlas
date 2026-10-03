/**
 * J35 — Academy provisioning: honest progress, server-side branding,
 * resilience (W2).
 *
 * Against the real running stack, as the seeded Organization owner, at a
 * 390 px phone viewport:
 *
 *   J35a  logo + palette chosen in the setup form travel WITH the request:
 *         the status page shows the four real stages (no percentages), the
 *         brand stage completes from the server's branding step, the logo is
 *         attached inline, and a reload restores exactly the same state;
 *         the website brand and the Academy logo are really stored;
 *   J35b  two tabs asking for the same address: one request wins, the other
 *         is told (409) which request to follow — never a duplicate Academy;
 *   J35c  a request that stopped making progress is reported "stalled" with
 *         Retry, and Retry resumes it to ready;
 *   J35d  the same status page in Arabic: RTL, translated stages, no
 *         sideways scroll at 390 px.
 *
 * NEEDS THE INTEGRATED REBUILD: the brand/stall/stage contract and the
 * logo-attach endpoint are new backend code (W2).
 */
import { deflateSync, crc32 } from 'node:zlib';
import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { clearAuthRateLimits } from './support/global-setup';
import { adminSql } from './support/admin-db';
import {
  API_BASE,
  SEED,
  apiGet,
  apiPost,
  apiSignIn,
  seedCookieDecision,
  signInThroughDashboard,
  signOutInBrowser,
  type Session,
} from './support/atlas';

test.describe.configure({ mode: 'serial' });

const PHONE = { width: 390, height: 844 };

/** A 96×96 PNG: a solid brand-coloured disc on a transparent background. */
function logoPng([r, g, b]: readonly [number, number, number]): Buffer {
  const size = 96;
  const rows: Buffer[] = [];
  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x += 1) {
      const inside = (x - 47.5) ** 2 + (y - 47.5) ** 2 < 40 ** 2;
      row.set(inside ? [r, g, b, 255] : [0, 0, 0, 0], 1 + x * 4);
    }
    rows.push(row);
  }
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const TEAL: readonly [number, number, number] = [13, 148, 136];

let owner: Session;
let organizationId: string;
let readyRequestId: string;

async function goInApp(page: Page, path: string): Promise<void> {
  await page.evaluate((target) => {
    window.history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForURL((url) => `${url.pathname}${url.search}` === path);
}

async function signIn(page: Page): Promise<void> {
  await signOutInBrowser(page);
  await signInThroughDashboard(page, SEED.owner, SEED.password);
  await page.waitForURL(/\/dashboard/);
}

async function noSidewaysScroll(page: Page): Promise<void> {
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(PHONE.width);
}

const stage = (page: Page, key: string) =>
  page.getByTestId(`provisioning-stage-${key}`);

async function getRequest(page: Page, requestId: string) {
  const response = await apiGet(
    page.request,
    owner,
    `/organizations/${organizationId}/provisioning-requests/${requestId}`
  );
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test.describe('J35 — provisioning progress', () => {
  test.beforeEach(async ({ page }) => {
    await seedCookieDecision(page);
    await page.setViewportSize(PHONE);
  });

  test.beforeAll(async ({ request }) => {
    await clearAuthRateLimits();
    owner = await apiSignIn(request, {
      email: SEED.owner,
      password: SEED.password,
    });
    const signIn = await request.post(`${API_BASE}/auth/sign-in`, {
      data: { email: SEED.owner, password: SEED.password },
    });
    const memberships = (await signIn.json()).user.organizations as Array<{
      organizationId: string;
      role: string;
    }>;
    organizationId = memberships.find(
      (entry) => entry.role === 'owner'
    )!.organizationId;
    expect(organizationId).toBeTruthy();
  });

  test('J35a: logo + palette travel with the request; real stages; a reload restores the same state', async ({
    page,
  }) => {
    await signIn(page);
    await goInApp(page, '/dashboard/provisioning/new');
    await page.getByLabel('Academy name').fill(`J35 Brand ${Date.now() % 1e7}`);

    // The default theme is pre-selected (a single-choice radio).
    await expect(
      page.getByRole('radio', { name: /Modern Education/ })
    ).toHaveAttribute('aria-checked', 'true');

    await page.getByText('Logo & colours (optional)').click();
    await page
      .locator('input[type="file"][accept*="image/png"]')
      .setInputFiles({
        name: 'logo.png',
        mimeType: 'image/png',
        buffer: logoPng(TEAL),
      });
    await page.getByRole('button', { name: 'Accept palette' }).click();
    await expect(
      page.getByRole('button', { name: 'Palette accepted' })
    ).toBeVisible();
    await noSidewaysScroll(page);

    const createdResponse = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/provisioning-requests$/.test(new URL(response.url()).pathname)
    );
    await page.getByRole('button', { name: 'Start provisioning' }).click();
    const created = await createdResponse;
    expect(created.status()).toBe(201);
    const sent = created.request().postDataJSON() as {
      selectedThemeKey: string;
      brand: { palette: { seeds: { primary: string } }; logoPending: boolean };
    };
    // The palette is in the request itself; the logo is never sent as data.
    expect(sent.selectedThemeKey).toBe('modern-education');
    expect(sent.brand.palette.seeds.primary).toMatch(/^\d+ \d+% \d+%$/);
    expect(sent.brand.logoPending).toBe(true);
    expect(JSON.stringify(sent)).not.toContain('data:');

    // Four real stages, in order — never the raw step rows, never a %.
    await expect(page.getByTestId('provisioning-progress')).toBeVisible();
    await expect(
      page.getByRole('list', { name: 'Setup progress' }).getByRole('listitem')
    ).toHaveCount(4);
    await expect(page.getByText('Connecting your custom domain')).toHaveCount(
      0
    );

    await expect(page.getByText('Your Academy is ready')).toBeVisible({
      timeout: 60_000,
    });
    await expect(stage(page, 'ready')).toHaveAttribute('data-state', 'done');
    // The logo is attached inline on the brand stage, then it completes.
    await expect(stage(page, 'brand')).toHaveAttribute('data-state', 'done', {
      timeout: 30_000,
    });
    expect(await page.locator('body').innerText()).not.toMatch(/\d+\s?%/);
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: /is ready\.$/ })
        .first()
    ).toBeAttached();
    await noSidewaysScroll(page);

    readyRequestId = new URL(page.url()).pathname.split('/').pop()!;
    const request = await getRequest(page, readyRequestId);
    expect(request.requestedBrand).toEqual({
      palette: true,
      logo: 'attached',
    });
    expect(
      request.steps.find((s: { key: string }) => s.key === 'branding').status
    ).toBe('completed');

    // Survives a reload: the same state, rebuilt from the server alone.
    await page.reload();
    await expect(page.getByText('Your Academy is ready')).toBeVisible({
      timeout: 30_000,
    });
    await expect(stage(page, 'brand')).toHaveAttribute('data-state', 'done');

    const configuration = await (
      await apiGet(
        page.request,
        owner,
        `/academies/${request.academyId}/website/configuration`
      )
    ).json();
    expect(configuration.brand.palette).toMatchObject({ status: 'confirmed' });
    const academy = await (
      await apiGet(page.request, owner, `/academies/${request.academyId}`)
    ).json();
    expect(academy.logo ?? academy.logoUrl).toBeTruthy();
  });

  test('J35b: two tabs, one address — one request wins, the other is told which to follow', async ({
    request,
  }) => {
    const subdomain = `j35-race-${Date.now() % 1e8}`;
    const body = (tab: string) => ({
      academyName: `J35 Race ${tab} ${Date.now() % 1e7}`,
      requestedSubdomain: subdomain,
      selectedThemeKey: 'modern-education',
      websiteSetupMode: 'complete',
      idempotencyKey: `j35-${subdomain}-${tab}`,
    });
    const path = `/organizations/${organizationId}/provisioning-requests`;
    const [a, b] = await Promise.all([
      apiPost(request, owner, path, body('a')),
      apiPost(request, owner, path, body('b')),
    ]);
    expect([a.status(), b.status()].sort()).toEqual([201, 409]);
    const winner = a.status() === 201 ? a : b;
    const loser = a.status() === 201 ? b : a;
    const winnerId = (await winner.json()).id as string;
    const refusal = (await loser.json()).error;
    expect(refusal.messageKey).toBe(
      'errors.provisioning.subdomainRequestInProgress'
    );
    expect(refusal.details).toEqual({ requestId: winnerId });
  });

  test('J35c: a stalled request says so and Retry resumes it to ready', async ({
    page,
  }) => {
    // A request nothing is driving (no queued job), last progress 10 min ago.
    const requestId = randomUUID();
    const subdomain = `j35-stall-${Date.now() % 1e8}`;
    const ownerId = (
      await adminSql(`SELECT id FROM users WHERE email = :'email'`, {
        email: SEED.owner,
      })
    ).trim();
    await adminSql(
      `INSERT INTO provisioning_requests
         (id, organization_id, requested_by_user_id, status, current_step_key,
          requested_academy_name, requested_subdomain, selected_theme_key,
          website_setup_mode, idempotency_key, started_at, last_progress_at,
          created_at, updated_at)
       VALUES (:'id', :'org', :'owner', 'payment_success', 'tenant', :'name',
               :'sub', 'modern-education', 'complete', :'key',
               now() - interval '10 minutes', now() - interval '10 minutes',
               now() - interval '10 minutes', now());
       INSERT INTO provisioning_steps (id, provisioning_request_id, key)
       SELECT gen_random_uuid()::text, :'id', k::provisioning_step_key
       FROM unnest(ARRAY['tenant','academy','theme','branding','subdomain','domain','finalization']) AS k;`,
      {
        id: requestId,
        org: organizationId,
        owner: ownerId,
        name: `J35 Stalled ${Date.now() % 1e7}`,
        sub: subdomain,
        key: `j35-stall-${requestId}`,
      }
    );

    await signIn(page);
    await goInApp(page, `/dashboard/provisioning/${requestId}`);
    const notice = page.getByTestId('provisioning-stalled');
    await expect(notice).toBeVisible({ timeout: 30_000 });
    await expect(notice).toContainText("hasn't made progress");
    await noSidewaysScroll(page);
    await notice.getByRole('button', { name: 'Retry' }).click();

    await expect(page.getByText('Your Academy is ready')).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId('provisioning-stalled')).toHaveCount(0);
    expect((await getRequest(page, requestId)).stalled).toBe(false);
  });

  test('J35d: the status page in Arabic — RTL, translated stages, no sideways scroll', async ({
    page,
  }) => {
    test.skip(!readyRequestId, 'needs the J35a request');
    await signIn(page);
    await page.evaluate(() =>
      localStorage.setItem('atlas:language', JSON.stringify('ar'))
    );
    await page.goto(`/dashboard/provisioning/${readyRequestId}`);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByText('أكاديميتك جاهزة')).toBeVisible({
      timeout: 30_000,
    });
    await expect(stage(page, 'academy')).toContainText(
      'إنشاء أكاديميتك وحجز عنوانها'
    );
    await expect(stage(page, 'brand')).toContainText('تطبيق شعارك وألوانك');
    await noSidewaysScroll(page);
    await page.evaluate(() =>
      localStorage.setItem('atlas:language', JSON.stringify('en'))
    );
  });
});
