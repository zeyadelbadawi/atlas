/**
 * J17 — the Academy's own favicon on its public website (2 Oct 2026),
 * Chromium against the real stack and database.
 *
 * Before: an Owner uploaded a favicon on the Branding page, it was saved,
 * and the public site kept the platform's `/favicon.svg` regardless. Here
 * the Owner uploads a PNG through the real page; the public site (English
 * and Arabic, RTL) links the Academy's favicon — one icon, no platform
 * icon beside it — and that URL serves exactly the uploaded bytes; a
 * second upload changes the URL on the very next visit; another Academy,
 * with no favicon of its own, gets its generated letter icon — never the
 * platform's icon (SEO pass, atlas#104 + backend#110, 7 Nov 2026). The
 * seed Academy's favicon is restored afterwards.
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

/**
 * `brandImageVersion(name, colour)`: FNV-1a (32-bit) of `name + "\0" +
 * colour`, as 8 hex digits — the `v` of the generated letter icon, as
 * `academy-brand-images.utils.ts` and the backend compute it.
 */
function brandImageVersion(name: string, color: string | undefined): string {
  const input = `${name}\u0000${color ?? ''}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
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
    // The favicon is saved with the rest of the visual identity, by its
    // one "Save visual identity" (Task G).
    const save = page.getByTestId('visual-identity-save');
    await expect(save).toBeEnabled();
    const saved = page.waitForResponse(
      (r) =>
        r.url().includes(`/academies/${academyId}/visual-identity`) &&
        r.request().method() === 'PUT'
    );
    await save.click();
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

  test('an Academy without a favicon gets its letter icon, not the platform default', async ({
    page,
    request,
  }) => {
    // The other seeded Academy has no favicon of its own: it resolves
    // without a version and its favicon read is a plain 404. Its site
    // links exactly one icon — the 96 px letter icon generated from its
    // name and brand colour — and the platform's icon is gone.
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
    const version = brandImageVersion(
      resolved.academyName,
      resolved.presentation?.brand?.primaryColor
    );
    await expect
      .poll(() => iconHrefs(page))
      .toEqual([
        `/api/v1/public/websites/${resolved.academyId}/icon.png?size=96&v=${version}`,
      ]);
    // …and that URL serves a real 96×96 PNG.
    const [href] = await iconHrefs(page);
    const icon = await servedIcon(page, href);
    expect(icon.status).toBe(200);
    expect(icon.type).toBe('image/png');
    expect(icon.body.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
    expect([icon.body.readUInt32BE(16), icon.body.readUInt32BE(20)]).toEqual([
      96, 96,
    ]);
  });
});
