/**
 * J17 — the Academy's own favicon on its public website (2 Oct 2026),
 * Chromium against the real stack and database.
 *
 * Before: an Owner uploaded a favicon on the Branding page, it was saved,
 * and the public site kept the platform's `/favicon.svg` regardless. Here
 * the Owner uploads a PNG through the real page; the public site (English
 * and Arabic, RTL) links the Academy's favicon — one icon, no platform
 * icon beside it — and that URL serves exactly the uploaded bytes; a
 * second upload changes the URL on the very next visit; another Academy
 * keeps the default. The seed Academy's favicon is restored afterwards.
 */
import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import {
  ACADEMY_PREVIEW_PARAM,
  API_BASE,
  SEED,
  academyPath,
  apiGet,
  apiPatch,
  requireSeed,
  seedCookieDecision,
  signInThroughDashboard,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';

test.describe.configure({ mode: 'serial' });

/** Two real 1×1 PNGs that differ in their pixel. */
const PNG_A = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64'
);
const PNG_B = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==',
  'base64'
);

async function iconHrefs(page: Page): Promise<string[]> {
  return page
    .locator('head link[rel~="icon"]')
    .evaluateAll((links) => links.map((l) => l.getAttribute('href') ?? ''));
}

/** The icon the page links, fetched as the browser would (same origin). */
async function servedIcon(page: Page, href: string) {
  const response = await page.request.get(new URL(href, page.url()).toString());
  return {
    status: response.status(),
    type: response.headers()['content-type'],
    body: await response.body(),
  };
}

test.describe('J17 — the Academy favicon', () => {
  let academyId: string;
  let owner: Session;
  let originalFavicon: string | null;

  test.beforeAll(async ({ request }) => {
    await clearAuthRateLimits();
    ({ academyId, owner } = await requireSeed(request));
    const academy = await (
      await apiGet(request, owner, `/academies/${academyId}`)
    ).json();
    originalFavicon = academy.favicon ?? null;
  });

  test.afterAll(async ({ request }: { request: APIRequestContext }) => {
    await apiPatch(request, owner, `/academies/${academyId}/branding`, {
      favicon: originalFavicon ?? '',
    });
  });

  async function uploadOnBrandingPage(page: Page, png: Buffer) {
    await page.goto(`/dashboard/academy/${academyId}/branding`);
    const trigger = page
      .getByRole('button', { name: /Upload Favicon|Change Favicon/ })
      .first();
    await expect(trigger).toBeVisible({ timeout: 30_000 });
    const chooser = page.waitForEvent('filechooser');
    await trigger.click();
    await (
      await chooser
    ).setFiles({
      name: 'favicon.png',
      mimeType: 'image/png',
      buffer: png,
    });
    await expect(page.getByAltText('Academy favicon')).toBeVisible();
    const saved = page.waitForResponse(
      (r) =>
        r.url().includes(`/academies/${academyId}/branding`) &&
        r.request().method() === 'PATCH'
    );
    await page.getByRole('button', { name: 'Save Branding' }).click();
    expect((await saved).status()).toBe(200);
  }

  test("an uploaded favicon is the public site's icon, in English and Arabic", async ({
    page,
    browser,
  }, testInfo) => {
    test.setTimeout(150_000);
    await seedCookieDecision(page);
    await signInThroughDashboard(page, SEED.owner, SEED.password);
    await page.waitForURL(/dashboard/, { timeout: 30_000 });
    await uploadOnBrandingPage(page, PNG_A);

    const visitor = await browser.newPage();
    await seedCookieDecision(visitor);
    for (const path of ['/', '/ar']) {
      await visitor.goto(academyPath(path));
      await expect(visitor.locator('main')).toBeVisible({ timeout: 30_000 });
      await expect(visitor.locator('html')).toHaveAttribute(
        'dir',
        path === '/ar' ? 'rtl' : 'ltr'
      );
      await expect
        .poll(() => iconHrefs(visitor))
        .toEqual([
          expect.stringMatching(
            /\/public\/websites\/[^/]+\/favicon\?v=[0-9a-f]{16}$/
          ),
        ]);
      const [href] = await iconHrefs(visitor);
      expect(href).toContain(academyId);
      const icon = await servedIcon(visitor, href);
      expect(icon.status).toBe(200);
      expect(icon.type).toBe('image/png');
      expect(Buffer.compare(icon.body, PNG_A)).toBe(0);
    }
    await visitor.screenshot({ path: testInfo.outputPath('public-ar.png') });
    await visitor.close();
  });

  test('a new upload replaces it on the next visit', async ({
    page,
    browser,
  }) => {
    test.setTimeout(150_000);
    const before = await browser.newPage();
    await seedCookieDecision(before);
    await before.goto(academyPath('/'));
    await expect.poll(() => iconHrefs(before)).toHaveLength(1);
    const [oldHref] = await iconHrefs(before);
    await before.close();

    await seedCookieDecision(page);
    await signInThroughDashboard(page, SEED.owner, SEED.password);
    await page.waitForURL(/dashboard/, { timeout: 30_000 });
    await uploadOnBrandingPage(page, PNG_B);

    const after = await browser.newPage();
    await seedCookieDecision(after);
    await after.goto(academyPath('/'));
    await expect
      .poll(() => iconHrefs(after))
      .toEqual([
        expect.not.stringMatching(
          new RegExp(`^${oldHref.replace(/[?.]/g, '\\$&')}$`)
        ),
      ]);
    const [newHref] = await iconHrefs(after);
    expect(newHref).not.toBe(oldHref);
    const icon = await servedIcon(after, newHref);
    expect(Buffer.compare(icon.body, PNG_B)).toBe(0);
    await after.close();
  });

  test('an Academy without a favicon keeps the platform default', async ({
    page,
    request,
  }) => {
    // The other seeded Academy has no favicon of its own: it resolves
    // without a version, its favicon read is a plain 404, and its site
    // keeps the platform icon.
    const slug = 'language-learning-hub';
    const resolved = await (
      await request.get(`${API_BASE}/public/websites/resolve?hostname=${slug}`)
    ).json();
    expect(resolved.faviconVersion).toBeUndefined();
    expect(
      (
        await request.get(
          `${API_BASE}/public/websites/${resolved.academyId}/favicon`
        )
      ).status()
    ).toBe(404);
    await seedCookieDecision(page);
    await page.goto(`/?${ACADEMY_PREVIEW_PARAM}=${slug}`);
    await expect(page.locator('main')).toBeVisible({ timeout: 30_000 });
    expect(await iconHrefs(page)).toEqual(['/favicon.svg']);
  });
});
