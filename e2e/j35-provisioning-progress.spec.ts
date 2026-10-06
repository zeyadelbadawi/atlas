/**
 * J35 — Academy provisioning: honest progress, server-side branding,
 * resilience (W2).
 *
 * Against the real running stack, as a NEW Organization owner on a Growth
 * trial (5 Academies) created for this run — never the seeded organization,
 * whose Academy allowance other suites use up — at a 390 px phone viewport:
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
 *         sideways scroll at 390 px;
 *   J35e  the status page in EN and AR, on a desktop and a phone (evidence);
 *   J35f  the seeded Manager and Instructor are not offered provisioning,
 *         and the API refuses them (403);
 *   J35g  Theme 2: every selectable theme is offered with live previews of the real
 *         site; Atelier is chosen with the keyboard, sent as
 *         `selectedThemeKey`, and the Academy's website is built in it;
 *   J35h  Theme 3: the three themes are offered; Manara is reached with
 *         the keyboard (two arrow presses from Modern Education), sent as
 *         `selectedThemeKey`, the website is built in it and renders
 *         Manara's own header.
 *
 * NEEDS THE INTEGRATED REBUILD: the brand/stall/stage contract and the
 * logo-attach endpoint are new backend code (W2).
 */
import { deflateSync, crc32 } from 'node:zlib';
import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { clearAuthRateLimits } from './support/global-setup';
import { adminSql } from './support/admin-db';
import { createTrialOrganizationOwner } from './support/trial-owner';
import {
  ACADEMY_PREVIEW_PARAM,
  API_BASE,
  SEED,
  apiGet,
  apiPost,
  apiSignIn,
  LEARNER_PASSWORD,
  seedCookieDecision,
  signInThroughDashboard,
  signOutInBrowser,
  type Session,
} from './support/atlas';
import {
  VARIANTS,
  applyVariant,
  captureEvidence,
  expectNoSidewaysScroll,
  setStoredLanguage,
} from './support/evidence';

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

/** This run's own Organization owner (password `LEARNER_PASSWORD`). */
let ownerEmail: string;
let owner: Session;
let organizationId: string;
/** The seeded organization, for the Manager/Instructor refusal (J35f). */
let seedOrganizationId: string;
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
  await signInThroughDashboard(page, ownerEmail, LEARNER_PASSWORD);
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
    // The seeded organization (for J35f only).
    const seeded = await request.post(`${API_BASE}/auth/sign-in`, {
      data: { email: SEED.owner, password: SEED.password },
    });
    const memberships = (await seeded.json()).user.organizations as Array<{
      organizationId: string;
      role: string;
    }>;
    seedOrganizationId = memberships.find(
      (entry) => entry.role === 'owner'
    )!.organizationId;
    expect(seedOrganizationId).toBeTruthy();

    // This run's own owner and organization, on a Growth trial: J35 creates
    // up to four Academies per run.
    const trialOwner = await createTrialOrganizationOwner(request, 'j35');
    ownerEmail = trialOwner.email;
    owner = trialOwner.session;
    organizationId = trialOwner.organizationId;
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
    // The palette is suggested from the logo asynchronously; accepting
    // before the suggestion lands would accept the theme default, which the
    // suggestion then replaces (and un-accepts).
    await expect(
      page.getByText('We suggested a palette from your logo', { exact: false })
    ).toBeVisible();
    await page.getByRole('button', { name: 'Accept palette' }).click();
    await expect(
      page.getByRole('button', { name: 'Palette accepted' })
    ).toBeVisible();
    await noSidewaysScroll(page);
    await captureEvidence(page, 'provisioning-start-palette-en-phone', {
      fullPage: true,
    });

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

  test('J35g: Atelier chosen in the setup form — live previews, keyboard selection, the website is built in it', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signIn(page);
    await goInApp(page, '/dashboard/provisioning/new');
    await page
      .getByLabel('Academy name')
      .fill(`J35 Atelier ${Date.now() % 1e7}`);

    const group = page.getByRole('radiogroup', { name: 'Theme' });
    const modern = group.getByRole('radio', { name: /Modern Education/ });
    const atelier = group.getByRole('radio', { name: /Atelier/ });
    // Three selectable themes since Theme 3 (Manara); Atelier is the second.
    await expect(group.getByRole('radio')).toHaveCount(3);
    await expect(modern).toHaveAttribute('aria-checked', 'true');
    await expect(atelier).toHaveAttribute('aria-checked', 'false');

    // Each option previews the real site in its own theme — a picture,
    // hidden from assistive tech, rendered once the group is in view.
    await group.scrollIntoViewIfNeeded();
    const previews = page.getByTestId('setup-theme-preview');
    await expect(previews).toHaveCount(3);
    await expect(
      previews.nth(0).locator('[data-theme-pack="modern-education"]')
    ).toBeAttached();
    await expect(
      previews.nth(1).locator('[data-theme-pack="atelier"]')
    ).toBeAttached();
    await expect(previews.nth(1)).toHaveAttribute('aria-hidden', 'true');

    // The radio-group keyboard pattern: arrows move AND select.
    await modern.focus();
    await page.keyboard.press('ArrowRight');
    await expect(atelier).toHaveAttribute('aria-checked', 'true');
    await expect(atelier).toBeFocused();
    await expect(modern).toHaveAttribute('aria-checked', 'false');
    await noSidewaysScroll(page);
    await captureEvidence(page, 'provisioning-start-theme-atelier-en-phone', {
      fullPage: true,
    });

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
    };
    expect(sent.selectedThemeKey).toBe('atelier');

    await expect(page.getByText('Your Academy is ready')).toBeVisible({
      timeout: 60_000,
    });
    const requestId = new URL(page.url()).pathname.split('/').pop()!;
    const request = await getRequest(page, requestId);
    const configuration = await (
      await apiGet(
        page.request,
        owner,
        `/academies/${request.academyId}/website/configuration`
      )
    ).json();
    expect(configuration.themeKey).toBe('atelier');
  });

  test('J35h: Manara chosen in the setup form — three live previews, keyboard selection, the website is built in it', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signIn(page);
    await goInApp(page, '/dashboard/provisioning/new');
    await page
      .getByLabel('Academy name')
      .fill(`J35 Manara ${Date.now() % 1e7}`);

    const group = page.getByRole('radiogroup', { name: 'Theme' });
    const modern = group.getByRole('radio', { name: /Modern Education/ });
    const atelier = group.getByRole('radio', { name: /Atelier/ });
    const manara = group.getByRole('radio', { name: /Manara/ });
    await expect(group.getByRole('radio')).toHaveCount(3);
    await expect(modern).toHaveAttribute('aria-checked', 'true');
    await expect(atelier).toHaveAttribute('aria-checked', 'false');
    await expect(manara).toHaveAttribute('aria-checked', 'false');

    // Each option previews the real site in its own theme — a picture,
    // hidden from assistive tech, rendered once the group is in view.
    await group.scrollIntoViewIfNeeded();
    const previews = page.getByTestId('setup-theme-preview');
    await expect(previews).toHaveCount(3);
    await expect(
      previews.nth(0).locator('[data-theme-pack="modern-education"]')
    ).toBeAttached();
    await expect(
      previews.nth(1).locator('[data-theme-pack="atelier"]')
    ).toBeAttached();
    await expect(
      previews.nth(2).locator('[data-theme-pack="manara"]')
    ).toBeAttached();
    await expect(previews.nth(2)).toHaveAttribute('aria-hidden', 'true');

    // The radio-group keyboard pattern: arrows move AND select; the third
    // option is two presses from the first.
    await modern.focus();
    await page.keyboard.press('ArrowRight');
    await expect(atelier).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowRight');
    await expect(manara).toHaveAttribute('aria-checked', 'true');
    await expect(manara).toBeFocused();
    await expect(modern).toHaveAttribute('aria-checked', 'false');
    await expect(atelier).toHaveAttribute('aria-checked', 'false');
    await noSidewaysScroll(page);
    await captureEvidence(page, 'provisioning-start-theme-manara-en-phone', {
      fullPage: true,
    });
    const slug = await page.getByLabel('Atlas address').inputValue();

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
    };
    expect(sent.selectedThemeKey).toBe('manara');

    await expect(page.getByText('Your Academy is ready')).toBeVisible({
      timeout: 60_000,
    });
    const requestId = new URL(page.url()).pathname.split('/').pop()!;
    const request = await getRequest(page, requestId);
    const configuration = await (
      await apiGet(
        page.request,
        owner,
        `/academies/${request.academyId}/website/configuration`
      )
    ).json();
    expect(configuration.themeKey).toBe('manara');

    // Published, the provisioned site really renders through Manara's
    // pack: its own header, not the base chrome.
    await apiPost(
      page.request,
      owner,
      `/academies/${request.academyId}/website/publish`
    );
    await page.goto(`/?${ACADEMY_PREVIEW_PARAM}=${slug}`);
    await expect(page.locator('[data-manara-header]')).toBeVisible({
      timeout: 30_000,
    });
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
        email: ownerEmail,
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

  test('J35e: the status page in EN and AR, desktop and phone — heading, direction, no sideways scroll', async ({
    page,
  }) => {
    test.skip(!readyRequestId, 'needs the J35a request');
    test.setTimeout(180_000);
    await signIn(page);
    await page.goto(`/dashboard/provisioning/${readyRequestId}`);
    try {
      for (const variant of VARIANTS) {
        await applyVariant(page, variant);
        await expect(
          page.getByText(
            variant.language === 'ar'
              ? 'أكاديميتك جاهزة'
              : 'Your Academy is ready'
          )
        ).toBeVisible({ timeout: 30_000 });
        await expect(stage(page, 'brand')).toHaveAttribute(
          'data-state',
          'done'
        );
        await expectNoSidewaysScroll(page);
        await captureEvidence(page, `provisioning-status-${variant.name}`);
      }
    } finally {
      await setStoredLanguage(page, 'en');
    }
  });

  test('J35f: the Manager and the Instructor are not offered provisioning; the API refuses them', async ({
    page,
    request,
  }) => {
    test.setTimeout(150_000);
    for (const email of [SEED.manager, SEED.instructor]) {
      await clearAuthRateLimits();
      const session = await apiSignIn(request, {
        email,
        password: SEED.password,
        surface: 'management',
      });
      const refused = await apiPost(
        request,
        session,
        `/organizations/${seedOrganizationId}/provisioning-requests`,
        {
          academyName: `J35 Refused ${Date.now() % 1e7}`,
          requestedSubdomain: `j35-refused-${Date.now() % 1e8}`,
          selectedThemeKey: 'modern-education',
          websiteSetupMode: 'complete',
          idempotencyKey: `j35-refused-${randomUUID()}`,
        }
      );
      expect(refused.status(), email).toBe(403);

      await signOutInBrowser(page);
      await signInThroughDashboard(page, email, SEED.password);
      await page.waitForURL(/\/dashboard/);
      await page.goto('/dashboard/provisioning/new');
      // The route guard sends them away; the form never renders.
      await expect(page).not.toHaveURL(/\/dashboard\/provisioning\/new/, {
        timeout: 30_000,
      });
      await expect(page.getByLabel('Academy name')).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: 'Start provisioning' })
      ).toHaveCount(0);
    }
  });
});
