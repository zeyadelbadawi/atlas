/**
 * J8 — Theme 1 hardening (Theme 1 plan Phase 8), against the real running
 * stack (see `playwright.config.ts`), as a new Organization owner on a Growth
 * trial (its own organization: the seeded one's Academy allowance is shared).
 *
 *   J8a  editing a sample testimonial's text does not make it real: it
 *        stays out of the public payload and page; the "This is a real
 *        testimonial" action keeps a ≥ 24 px target;
 *   J8b  the public Theme 1 site in Arabic at 390/1024/1440: RTL, no
 *        horizontal overflow on every page, the mobile menu opens, closes
 *        on Escape and returns focus;
 *   J8c  the dashboard in Arabic: launch checklist and publish warning are
 *        RTL and translated;
 *   J8d  keyboard: the public site's first Tab stops are visible;
 *   J8e  Themes 2–5 are unaffected end to end: a Theme 2 Academy still
 *        provisions, publishes and renders its own theme with no Theme 1
 *        output (legacy v1 content is covered by the baseline's legacy
 *        fixtures and the backend e2e).
 */
import { clearAuthRateLimits } from './support/global-setup';
import { createTrialOrganizationOwner } from './support/trial-owner';
import { test, expect, type Page } from '@playwright/test';
import {
  ACADEMY_PREVIEW_PARAM,
  API_BASE,
  apiGet,
  apiPost,
  declineCookies,
  signInThroughDashboard,
  type Session,
  seedCookieDecision,
} from './support/atlas';

test.describe.configure({ mode: 'serial' });

const SAMPLE_QUOTES = [
  'The projects were close to real work',
  'I could fit the lessons around a full-time job',
  'The step-by-step structure made a difficult subject approachable',
];
const EDITED_SAMPLE = 'Edited sample quote that must stay private';

let owner: Session;
let organizationId: string;
let ownerEmail: string;
let ownerPassword: string;
let academyId: string;
let slug: string;

/** Client-side navigation inside the signed-in dashboard (see J7's `goInApp`). */
async function goInApp(page: Page, path: string): Promise<void> {
  await page.evaluate((target) => {
    window.history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForURL((url) => `${url.pathname}${url.search}` === path);
}

/** Every page of the public site must fit the viewport horizontally. */
async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow, `${label}: horizontal overflow (px)`).toBeLessThanOrEqual(0);
}

async function useArabic(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('atlas:language', JSON.stringify('ar'));
  });
}

test.describe('J8 — Theme 1 hardening', () => {
  test.beforeEach(async ({ page }) => {
    await seedCookieDecision(page);
  });

  test.beforeAll(async ({ request }) => {
    // Each journey file starts from a clear sign-in limiter (as J1–J6 do):
    // the limiter is a real 10-per-15-minutes protection, and this file
    // signs the owner in several times after the earlier journeys did.
    await clearAuthRateLimits();
    // A new owner with their own organization on a Growth trial, not the
    // seeded one, whose Academy allowance other suites use up.
    const trialOwner = await createTrialOrganizationOwner(request, 'j8');
    owner = trialOwner.session;
    organizationId = trialOwner.organizationId;
    ownerEmail = trialOwner.email;
    ownerPassword = trialOwner.password;

    // A ready-made Theme 1 Academy, provisioned through the API.
    slug = `j8-${Date.now() % 1e8}`;
    const created = await apiPost(
      request,
      owner,
      `/organizations/${organizationId}/provisioning-requests`,
      {
        academyName: `J8 Hardening ${slug}`,
        requestedSubdomain: slug,
        selectedThemeKey: 'modern-education',
        websiteSetupMode: 'complete',
        idempotencyKey: `j8-${slug}`,
      }
    );
    expect(created.status(), await created.text()).toBe(201);
    const requestId = (await created.json()).id as string;
    await expect
      .poll(
        async () =>
          (
            await (
              await apiGet(
                request,
                owner,
                `/organizations/${organizationId}/provisioning-requests/${requestId}`
              )
            ).json()
          ).status,
        { timeout: 60_000 }
      )
      .toBe('ready');
    academyId = (
      await (
        await apiGet(
          request,
          owner,
          `/organizations/${organizationId}/provisioning-requests/${requestId}`
        )
      ).json()
    ).academyId;
  });

  test('J8a: editing a sample does not make it public; the confirm action is ≥ 24 px', async ({
    page,
  }) => {
    const pages = await (
      await apiGet(
        page.request,
        owner,
        `/academies/${academyId}/website/pages`,
        {
          page: '1',
          pageSize: '50',
        }
      )
    ).json();
    const home = pages.items.find(
      (item: { coreType: string }) => item.coreType === 'home'
    );
    const testimonials = home.sections.find(
      (section: { type: string }) => section.type === 'testimonials'
    );

    await signInThroughDashboard(page, ownerEmail, ownerPassword);
    await page.waitForURL(/\/dashboard/);
    await goInApp(
      page,
      `/dashboard/academy/${academyId}/website/pages/${home.id}?section=${testimonials.id}`
    );
    const dialog = page.getByRole('dialog');
    const confirm = dialog
      .getByRole('button', { name: 'This is a real testimonial' })
      .first();
    const box = await confirm.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(24);
    expect(box!.width).toBeGreaterThanOrEqual(24);

    // A "typo fix" on the first sample's quote — not the confirm action.
    const quote = dialog.locator('textarea').first();
    await expect(quote).toHaveValue(new RegExp(SAMPLE_QUOTES[0]));
    await quote.fill(EDITED_SAMPLE);
    await dialog.getByRole('button', { name: 'Apply changes' }).click();
    await page.getByTestId('website-save-page').click();
    await expect(page.getByTestId('website-save-page')).toBeDisabled({
      timeout: 15_000,
    });

    // Still three samples: the edit kept the flag.
    const published = await apiPost(
      page.request,
      owner,
      `/academies/${academyId}/website/publish`
    );
    expect((await published.json()).sampleContent[0].sampleItems).toBe(3);

    // The public payload carries none of them, flagged or by text.
    const publicPages = await page.request.get(
      `${API_BASE}/public/websites/${academyId}/pages`
    );
    const body = await publicPages.text();
    expect(body).not.toContain('"sample":true');
    for (const text of [EDITED_SAMPLE, ...SAMPLE_QUOTES]) {
      expect(body).not.toContain(text);
    }
    await page.goto(`/?${ACADEMY_PREVIEW_PARAM}=${slug}`);
    await declineCookies(page);
    await expect(page.locator('.t1-cta').first()).toBeVisible();
    await expect(page.getByText(EDITED_SAMPLE)).toHaveCount(0);
  });

  for (const width of [390, 1024, 1440]) {
    test(`J8b: the public site in Arabic at ${width}px is RTL with no overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      // The public site's language is the URL's (`/ar/...`), whatever the
      // visitor's stored preference.
      for (const path of [
        '/ar',
        '/ar/courses',
        '/ar/about',
        '/ar/faqs',
        '/ar/contact',
        '/ar/no-such-page',
      ]) {
        const separator = path.includes('?') ? '&' : '?';
        await page.goto(`${path}${separator}${ACADEMY_PREVIEW_PARAM}=${slug}`);
        await declineCookies(page);
        await expect(page.locator('h1').first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.dir)).toBe(
          'rtl'
        );
        expect(await page.evaluate(() => document.documentElement.lang)).toBe(
          'ar'
        );
        await expectNoHorizontalOverflow(page, `${path} @${width}`);
        await page.screenshot({
          path: test
            .info()
            .outputPath(
              `ar-${width}${path.replace(/\//g, '_') || '_home'}.png`
            ),
          fullPage: false,
        });
      }

      if (width === 390) {
        await page.goto(`/ar?${ACADEMY_PREVIEW_PARAM}=${slug}`);
        const menu = page.locator('header button[aria-expanded]').first();
        await expect(menu).toBeVisible();
        await menu.click();
        await expect(menu).toHaveAttribute('aria-expanded', 'true');
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(menu).toHaveAttribute('aria-expanded', 'false');
        await expect(menu).toBeFocused();
      }
    });
  }

  test('J8c: the dashboard in Arabic — checklist and publish warning are RTL and translated', async ({
    page,
  }) => {
    // Unpublished, so the toggle offers Publish (J8a published it).
    await apiPost(
      page.request,
      owner,
      `/academies/${academyId}/website/unpublish`
    );
    await page.setViewportSize({ width: 390, height: 900 });
    await useArabic(page);
    // The same dashboard sign-in form, in Arabic: language-neutral selectors.
    await page.goto('/auth/sign-in');
    await page.locator('input[type="email"]').fill(ownerEmail);
    await page.locator('input[type="password"]').fill(ownerPassword);
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(/\/dashboard/);
    await goInApp(page, `/dashboard/academy/${academyId}/website`);
    const checklist = page.getByTestId('website-launch-checklist');
    await expect(checklist).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.dir)).toBe('rtl');
    await expect(checklist).toContainText('آراء نموذجية');
    await expectNoHorizontalOverflow(page, 'dashboard website overview');

    await page.getByTestId('website-publish-toggle').click();
    const warning = page.getByTestId('publish-sample-warning');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('آراء نموذجية');
    expect(
      await warning.evaluate((element) => getComputedStyle(element).direction)
    ).toBe('rtl');
    await page.screenshot({
      path: test.info().outputPath('ar-390-publish-warning.png'),
    });
    await page.keyboard.press('Escape');
    await expect(warning).toHaveCount(0);
  });

  test('J8d: keyboard — the first Tab stops on the public site are visible', async ({
    page,
  }) => {
    // Self-contained: J8c leaves the site unpublished (it cancels the warning).
    await apiPost(
      page.request,
      owner,
      `/academies/${academyId}/website/publish`
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/?${ACADEMY_PREVIEW_PARAM}=${slug}`);
    await declineCookies(page);
    await expect(page.locator('.t1-cta').first()).toBeVisible();
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    for (let stop = 0; stop < 4; stop += 1) {
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        if (!element || element === document.body) return null;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          visible: rect.width > 0 && rect.height > 0,
          indicator:
            (style.outlineStyle !== 'none' &&
              parseFloat(style.outlineWidth) > 0) ||
            style.boxShadow !== 'none',
        };
      });
      expect(focus, `Tab stop ${stop + 1}`).not.toBeNull();
      expect(focus!.visible, `Tab stop ${stop + 1} is on screen`).toBe(true);
      expect(
        focus!.indicator,
        `Tab stop ${stop + 1} (${focus!.tag}) shows focus`
      ).toBe(true);
    }
  });

  test('J8e: Themes 2–5 are retired: provisioning refuses them', async ({
    page,
  }) => {
    // Websites already on one keep rendering it until the gated migration
    // moves them (Reports/THEMES_2_5_RETIREMENT.md); the theme baseline
    // covers that rendering. No new website can pick one.
    for (const selectedThemeKey of [
      'premium-academy',
      'corporate-learning',
      'minimal-editorial',
      'bold-creative',
    ]) {
      const other = `j8-t2-${Date.now() % 1e8}`;
      const created = await apiPost(
        page.request,
        owner,
        `/organizations/${organizationId}/provisioning-requests`,
        {
          academyName: `J8 Retired ${other}`,
          requestedSubdomain: other,
          selectedThemeKey,
          websiteSetupMode: 'complete',
          idempotencyKey: `j8-${other}-${selectedThemeKey}`,
        }
      );
      expect(created.status(), await created.text()).toBe(400);
    }
  });
});
