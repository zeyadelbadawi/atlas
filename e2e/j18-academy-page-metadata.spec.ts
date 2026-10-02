/**
 * J18 — every public page of an Academy's site is titled and described as
 * that Academy, never as "Atlas" (2 Oct 2026). Chromium against the real
 * stack and database.
 *
 * Before: Coming Soon, sign-in and the learner area kept `<title>Atlas</title>`;
 * a page without a configured site title read just "Home"; Atlas's own
 * marketing description stayed in the head beside the Academy's. Here:
 * the published site in English and Arabic (RTL), its sign-in page, its
 * Coming Soon page in English and Arabic (the second seeded Academy is
 * unpublished for the test and published again afterwards), and moving
 * from one Academy's site to another's in the same tab — nothing of the
 * first is left behind.
 */
import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import {
  ACADEMY_PREVIEW_PARAM,
  SEED,
  apiPost,
  apiSignIn,
  resolveAcademy,
  seedCookieDecision,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';

test.describe.configure({ mode: 'serial' });

const ATLAS_DESCRIPTION = 'The operating system for education businesses.';
const SECOND_SLUG = 'language-learning-hub';
const SECOND_NAME = 'Language Learning Hub';
const SECOND_OWNER = 'omar.hassan@nextgen-learning.dev';

const at = (slug: string, path: string) =>
  `${path}${path.includes('?') ? '&' : '?'}${ACADEMY_PREVIEW_PARAM}=${slug}`;

async function head(page: Page) {
  return page.evaluate(() => ({
    title: document.title,
    descriptions: Array.from(
      document.head.querySelectorAll('meta[name="description"]')
    ).map((m) => m.getAttribute('content')),
    ogTitles: Array.from(
      document.head.querySelectorAll('meta[property="og:title"]')
    ).map((m) => m.getAttribute('content')),
  }));
}

test.describe('J18 — Academy page titles and descriptions', () => {
  let firstName: string;
  let secondOwner: Session;
  let secondId: string;

  test.beforeAll(async ({ request }) => {
    await clearAuthRateLimits();
    firstName = (await resolveAcademy(request)).name;
    const second = await (
      await request.get(
        `${process.env.E2E_API_BASE_URL ?? 'http://localhost:3000/api/v1'}/public/websites/resolve?hostname=${SECOND_SLUG}`
      )
    ).json();
    secondId = second.academyId;
    secondOwner = await apiSignIn(request, {
      email: SECOND_OWNER,
      password: SEED.password,
      surface: 'management',
    });
  });

  test.afterAll(async ({ request }: { request: APIRequestContext }) => {
    // Leave the seed as found: the second Academy's site published.
    await apiPost(
      request,
      secondOwner,
      `/academies/${secondId}/website/publish`
    );
  });

  test("published pages: page · Academy, the Academy's description, in English and Arabic", async ({
    page,
  }) => {
    await seedCookieDecision(page);
    for (const path of ['/', '/ar', '/faqs', '/ar/faqs']) {
      await page.goto(at('web-development-academy', path));
      await expect(page.locator('main')).toBeVisible({ timeout: 30_000 });
      await expect
        .poll(async () => (await head(page)).title)
        .toContain(firstName);
      const h = await head(page);
      expect(h.title).not.toBe('Atlas');
      expect(h.descriptions).toHaveLength(1);
      expect(h.descriptions[0]).not.toBe(ATLAS_DESCRIPTION);
      expect(h.ogTitles).not.toContain('Atlas');
      await expect(page.locator('html')).toHaveAttribute(
        'dir',
        path.startsWith('/ar') ? 'rtl' : 'ltr'
      );
    }
  });

  test('the sign-in page is titled for the Academy', async ({ page }) => {
    await seedCookieDecision(page);
    await page.goto(at('web-development-academy', '/sign-in'));
    await expect(page.locator('input[type="password"]').first()).toBeVisible({
      timeout: 30_000,
    });
    const h = await head(page);
    expect(h.title).toContain(firstName);
    expect(h.title).not.toBe('Atlas');
    expect(h.descriptions).not.toContain(ATLAS_DESCRIPTION);
  });

  test("Coming Soon: the Academy's name and description, in English and Arabic", async ({
    page,
    request,
  }, testInfo) => {
    const unpublished = await apiPost(
      request,
      secondOwner,
      `/academies/${secondId}/website/unpublish`
    );
    expect(unpublished.status(), await unpublished.text()).toBeLessThan(300);

    await seedCookieDecision(page);
    for (const [path, comingSoon] of [
      ['/', 'Coming soon'],
      ['/ar', 'قريبًا'],
    ] as const) {
      await page.goto(at(SECOND_SLUG, path));
      await expect(page.getByText(SECOND_NAME).first()).toBeVisible({
        timeout: 30_000,
      });
      await expect
        .poll(async () => (await head(page)).title)
        .toBe(`${comingSoon} · ${SECOND_NAME}`);
      const h = await head(page);
      expect(h.descriptions).toHaveLength(1);
      expect(h.descriptions[0]).toContain(SECOND_NAME);
      expect(h.ogTitles).toEqual([SECOND_NAME]);
      await page.screenshot({
        path: testInfo.outputPath(
          `coming-soon-${path === '/' ? 'en' : 'ar'}.png`
        ),
      });
    }
  });

  test("moving from one Academy's site to another's leaves nothing of the first", async ({
    page,
  }) => {
    await seedCookieDecision(page);
    await page.goto(at('web-development-academy', '/'));
    await expect
      .poll(async () => (await head(page)).title)
      .toContain(firstName);
    await page.goto(at(SECOND_SLUG, '/'));
    await expect
      .poll(async () => (await head(page)).title)
      .toBe(`Coming soon · ${SECOND_NAME}`);
    const h = await head(page);
    expect(h.title).not.toContain(firstName);
    expect(h.descriptions.join(' ')).not.toContain(firstName);
  });
});
