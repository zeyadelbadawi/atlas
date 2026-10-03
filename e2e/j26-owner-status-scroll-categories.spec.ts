/**
 * J26 — the owner's simpler dashboard (Tasks 1, 5, 9), Chromium against the
 * real stack and database.
 *
 *  - Task 1: the Academy dashboard shows the WEBSITE's publish state; the
 *    Academy's internal lifecycle status is gone from the dashboard and
 *    from Settings (and the API refuses suspend/archive by PATCH).
 *  - Task 9: no category column/filter in the course list, no Select
 *    Category on create or edit.
 *  - Task 5: after Create Course (submitted from the bottom of a long
 *    form) the success view starts at the top; the builder opens at the
 *    top; Back restores the list offset; a query-only change keeps it.
 * Desktop and phone; English and Arabic.
 */
import { test, expect, type Page } from '@playwright/test';
import {
  API_BASE,
  SEED,
  authHeader,
  requireSeed,
  seedCookieDecision,
  signInThroughDashboard,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';

test.describe.configure({ mode: 'serial' });

const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));

test.describe('J26 — website status, no categories, scroll', () => {
  let academyId: string;

  test.beforeAll(async ({ request }) => {
    await clearAuthRateLimits();
    ({ academyId } = await requireSeed(request));
  });

  async function signIn(page: Page) {
    await seedCookieDecision(page);
    await signInThroughDashboard(page, SEED.owner, SEED.password);
    await page.waitForURL(/dashboard/, { timeout: 30_000 });
  }

  test('Task 1: the dashboard shows the website status; Settings offers no lifecycle status', async ({
    page,
    request,
  }, testInfo) => {
    await signIn(page);
    await page.goto(`/dashboard/academy?academyId=${academyId}`);
    const status = page.getByTestId('academy-website-status');
    await expect(status).toBeVisible({ timeout: 30_000 });
    await expect(status).toContainText('Website');
    await expect(status).toContainText(
      /Published|Draft|Publishing|Publish failed/
    );
    await page.screenshot({ path: testInfo.outputPath('dashboard-en.png') });

    await page.goto(`/dashboard/academy/${academyId}/settings`);
    await expect(page.getByLabel('Academy Name')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Academy Status')).toHaveCount(0);

    // Arabic, RTL.
    await page.goto(`/dashboard/academy?academyId=${academyId}`);
    await page.evaluate(() =>
      localStorage.setItem('atlas:language', JSON.stringify('ar'))
    );
    await page.reload();
    await expect(page.getByTestId('academy-website-status')).toContainText(
      'الموقع الإلكتروني',
      { timeout: 30_000 }
    );
    await page.screenshot({ path: testInfo.outputPath('dashboard-ar.png') });
    await page.evaluate(() =>
      localStorage.setItem('atlas:language', JSON.stringify('en'))
    );

    // The API refuses suspend/archive from the owner (server-side, not UI).
    const token = await page.evaluate(async () => {
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      return res.ok
        ? ((await res.json()) as { accessToken: string }).accessToken
        : null;
    });
    expect(token).toBeTruthy();
    const headers = authHeader({ accessToken: token!, userId: '' });
    const refused = await request.patch(`${API_BASE}/academies/${academyId}`, {
      headers,
      data: { status: 'suspended' },
    });
    if (refused.ok()) {
      // A server without the fix applied it: put the seed back before failing.
      await request.patch(`${API_BASE}/academies/${academyId}`, {
        headers,
        data: { status: 'active' },
      });
    }
    expect(refused.status()).toBe(400);
  });

  test('Tasks 5 and 9: create from the bottom of the form → success at the top, builder at the top, no category anywhere', async ({
    page,
  }, testInfo) => {
    await signIn(page);
    await page.goto(`/dashboard/academy/${academyId}/courses/create`);
    await expect(page.getByLabel('Course Title')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Category', { exact: true })).toHaveCount(0);
    await page.getByLabel('Course Title').fill(`J26 Course ${Date.now()}`);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    expect(await scrollY(page)).toBeGreaterThan(300);
    await page.getByRole('button', { name: 'Create Course' }).click();
    const cont = page.getByRole('button', {
      name: 'Continue to Course Builder',
    });
    await expect(cont).toBeInViewport({ timeout: 30_000 });
    expect(await scrollY(page)).toBe(0);
    await page.screenshot({ path: testInfo.outputPath('created.png') });
    await cont.click();
    await page.waitForURL(/\/builder/);
    await expect.poll(() => scrollY(page)).toBe(0);
    const builderUrl = page.url();

    // Edit: no Select Category.
    // The Edit page is the course detail address (`academyCourseDetail`).
    await page.goto(builderUrl.replace(/\/builder$/, ''));
    await expect(page.getByLabel('Course Title')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Category', { exact: true })).toHaveCount(0);

    // List: no Category column or filter.
    await page.goto(`/dashboard/academy/${academyId}/courses`);
    await expect(page.getByRole('table')).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole('columnheader', { name: 'Category' })
    ).toHaveCount(0);
    await expect(page.getByText('All categories')).toHaveCount(0);
  });

  test('Task 5: a tab switch (query only) keeps the offset; Back restores it (phone)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 640 });
    await signIn(page);
    await page.goto(`/dashboard/academy/${academyId}/members`);
    const studentsTab = page.getByRole('tab', { name: /students/i });
    await expect(studentsTab).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState('networkidle');
    // Scroll so the tabs are still on screen but the page is not at the top.
    await studentsTab.evaluate((el) => {
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 80);
    });
    const before = await scrollY(page);
    expect(before).toBeGreaterThan(50);

    // Same page, only `?tab=` changes (setSearchParams replace): the app
    // does not move the scroll. The browser may still CLAMP it if the page
    // is briefly shorter (the new tab's loading skeleton, or shorter
    // content), so the expected offset is bounded by the shortest the
    // page got during the switch — sampled every frame.
    await page.evaluate(() => {
      const w = window as unknown as { __minMax: number; __sample: boolean };
      w.__minMax = Infinity;
      w.__sample = true;
      const tick = () => {
        w.__minMax = Math.min(
          w.__minMax,
          document.documentElement.scrollHeight - window.innerHeight
        );
        if (w.__sample) requestAnimationFrame(tick);
      };
      tick();
    });
    await studentsTab.click();
    await expect(page).toHaveURL(/tab=students/);
    await page.waitForLoadState('networkidle');
    const minMax = await page.evaluate(() => {
      const w = window as unknown as { __minMax: number; __sample: boolean };
      w.__sample = false;
      return w.__minMax;
    });
    const afterTab = await scrollY(page);
    expect(Math.abs(afterTab - Math.min(before, minMax))).toBeLessThan(5);
    expect(afterTab).toBeGreaterThan(50);

    // A new page opens at the top; Back returns to the previous offset.
    await page.goto(`/dashboard/academy/${academyId}/courses`);
    await expect.poll(() => scrollY(page)).toBe(0);
    await page.goBack();
    await expect(page).toHaveURL(/members\?tab=students/);
    await expect
      .poll(() => scrollY(page), { timeout: 5_000 })
      .toBeGreaterThan(afterTab - 5);
  });
});
