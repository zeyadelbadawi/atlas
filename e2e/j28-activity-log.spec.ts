/**
 * J28 — the Academy activity log (Task 3), Chromium against the real stack
 * and database.
 *
 *  - The owner renames a course through the course's own edit form, then
 *    opens Academy → Activity log: one readable sentence names the change
 *    and who made it, no email address appears anywhere on the page, and
 *    the details sheet shows the title's before/after.
 *  - Phone (390×844) in Arabic: RTL, the page title and the same entry as
 *    an Arabic sentence, and an Arabic details sheet.
 *  - The seeded Manager and Instructor are not offered the activity log in
 *    the sidebar, and its address lands on the permission state.
 *  - The Platform Owner's audit log shows the same event as a readable
 *    sentence (EN desktop, AR phone).
 *
 * The fixture course is created by this test through the API and deleted
 * again afterwards.
 */
import { test, expect as baseExpect, type Page } from '@playwright/test';
import {
  API_BASE,
  SEED,
  authHeader,
  requireSeed,
  seedCookieDecision,
  signInThroughDashboard,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import { PLATFORM_OWNER_EMAIL, createCourse } from './support/phase4';

// The shared stack also serves other suites; a cold Vite page can take
// tens of seconds, so waits are generous (assertions are unchanged).
test.describe.configure({ mode: 'serial', timeout: 240_000 });
const expect = baseExpect.configure({ timeout: 45_000 });

const PHONE = { width: 390, height: 844 };
/** Anything that looks like an email address. */
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const OWNER_NAME = 'Sarah Chen';

async function signIn(page: Page, email: string): Promise<void> {
  await clearAuthRateLimits();
  await seedCookieDecision(page);
  await signInThroughDashboard(page, email, SEED.password);
  await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
}

async function setLanguage(page: Page, language: 'en' | 'ar'): Promise<void> {
  await page.evaluate(
    (lang) => localStorage.setItem('atlas:language', JSON.stringify(lang)),
    language
  );
  await page.reload();
}

test.describe('J28 — activity log', () => {
  const stamp = `${Date.now()}`;
  const originalTitle = `J28 Course ${stamp}`;
  const renamedTitle = `J28 Renamed ${stamp}`;
  let academyId: string;
  let owner: Session;
  let courseId: string;

  test.beforeAll(async ({ request }) => {
    await clearAuthRateLimits();
    ({ academyId, owner } = await requireSeed(request));
    courseId = await createCourse(request, owner, academyId, {
      title: originalTitle,
      pricing: { type: 'free' },
      description: 'Playwright journey J28: an auditable rename.',
    });
  });

  test.afterAll(async ({ request }) => {
    if (courseId) {
      await request
        .delete(`${API_BASE}/academies/${academyId}/courses/${courseId}`, {
          headers: authHeader(owner),
        })
        .catch(() => undefined);
    }
  });

  test('owner (desktop, EN): renames a course in the UI → a readable sentence, no emails, before/after in the details', async ({
    page,
  }, testInfo) => {
    await signIn(page, SEED.owner);

    // The auditable change, through the product's own form.
    await page.goto(`/dashboard/academy/${academyId}/courses/${courseId}`);
    const title = page.getByLabel('Course Title');
    await expect(title).toHaveValue(originalTitle, { timeout: 90_000 });
    await title.fill(renamedTitle);
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(
      page.getByText('Course updated successfully').first()
    ).toBeVisible();

    // The sidebar offers the activity log to the owner.
    await expect(
      page.getByRole('link', { name: 'Activity log', exact: true }).first()
    ).toBeVisible();

    await page.goto(`/dashboard/academy/${academyId}/activity`);
    await expect(
      page.getByRole('heading', { name: 'Activity log', exact: true })
    ).toBeVisible({ timeout: 90_000 });
    const sentence = `${OWNER_NAME} updated the course “${renamedTitle}”`;
    const entry = page
      .getByTestId('audit-entry')
      .filter({ hasText: sentence })
      .first();
    await expect(entry).toBeVisible();
    // Nowhere on the page — rows, chips, filters — is an email address.
    expect(await page.locator('body').innerText()).not.toMatch(EMAIL);
    await page.screenshot({
      path: testInfo.outputPath('activity-en.png'),
      fullPage: true,
    });

    // Details: the before/after of the title.
    await entry.getByRole('button', { name: new RegExp(sentence) }).click();
    const details = page.getByTestId('audit-details');
    await expect(details).toBeVisible();
    await expect(details).toContainText(sentence);
    const changes = page.getByTestId('audit-changes-table');
    await expect(changes).toBeVisible();
    const titleRow = changes.locator('tr', {
      has: page.getByRole('rowheader', { name: 'Title', exact: true }),
    });
    await expect(titleRow).toContainText(originalTitle);
    await expect(titleRow).toContainText(renamedTitle);
    await expect(
      changes.getByRole('columnheader', { name: 'Before' })
    ).toBeVisible();
    await expect(
      changes.getByRole('columnheader', { name: 'After' })
    ).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(EMAIL);
    await page.screenshot({
      path: testInfo.outputPath('activity-details-en.png'),
    });
  });

  test('owner (phone, AR): the same change reads as an Arabic sentence, RTL', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(PHONE);
    await signIn(page, SEED.owner);
    await page.goto(`/dashboard/academy/${academyId}/activity`);
    await setLanguage(page, 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(
      page.getByRole('heading', { name: 'سجل النشاط', exact: true })
    ).toBeVisible({ timeout: 90_000 });
    const sentence = `${OWNER_NAME} حدّث الدورة «${renamedTitle}»`;
    const entry = page
      .getByTestId('audit-entry')
      .filter({ hasText: sentence })
      .first();
    await expect(entry).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(EMAIL);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      )
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: testInfo.outputPath('activity-ar-phone.png'),
      fullPage: true,
    });

    await entry.getByRole('button').first().click();
    const changes = page.getByTestId('audit-changes-table');
    await expect(changes).toBeVisible();
    await expect(
      changes.getByRole('columnheader', { name: 'قبل' })
    ).toBeVisible();
    await expect(
      changes.getByRole('columnheader', { name: 'بعد' })
    ).toBeVisible();
    await expect(changes).toContainText(originalTitle);
    await expect(changes).toContainText(renamedTitle);
    await page.screenshot({
      path: testInfo.outputPath('activity-details-ar-phone.png'),
    });
    await setLanguage(page, 'en');
  });

  for (const role of ['manager', 'instructor'] as const) {
    test(`${role}: no Activity log entry, and the address shows the permission state`, async ({
      page,
    }, testInfo) => {
      await signIn(page, SEED[role]);
      if (role === 'manager') {
        await page.goto(`/dashboard/academy/${academyId}`);
        // Wait for the sidebar's academy section before asserting an absence.
        await expect(
          page.getByRole('link', { name: 'Courses', exact: true }).first()
        ).toBeVisible({ timeout: 90_000 });
      } else {
        // The instructor's own workspace (the academy dashboard is not
        // theirs); wait for its sidebar before asserting an absence.
        await expect(
          page.getByRole('navigation').getByRole('link').first()
        ).toBeVisible({ timeout: 90_000 });
      }
      await page.screenshot({ path: testInfo.outputPath(`nav-${role}.png`) });
      await expect(
        page.getByRole('link', { name: 'Activity log', exact: true })
      ).toHaveCount(0);

      await page.goto(`/dashboard/academy/${academyId}/activity`);
      const guard = page.getByText('You do not have access');
      const pageState = page.getByText(
        'Only the academy owner can view the activity log'
      );
      await expect(guard.or(pageState)).toBeVisible({ timeout: 90_000 });
      await expect(page.getByTestId('audit-entry')).toHaveCount(0);
      await page.screenshot({
        path: testInfo.outputPath(`activity-${role}.png`),
      });
    });
  }

  test('platform owner: the audit log shows readable sentences (EN desktop, AR phone)', async ({
    page,
  }, testInfo) => {
    await signIn(page, PLATFORM_OWNER_EMAIL);
    await page.goto('/dashboard/platform/audit-log');
    await expect(
      page.getByRole('heading', { name: 'Audit log', exact: true })
    ).toBeVisible({ timeout: 90_000 });
    const entries = page.getByTestId('audit-entry');
    await expect(entries.first()).toBeVisible();

    // Every visible row is a sentence, not a raw action key or id.
    const sentences = await entries.evaluateAll((rows) =>
      rows
        .slice(0, 20)
        .map(
          (row) =>
            (row.querySelector('button, span') as HTMLElement | null)
              ?.innerText ?? ''
        )
    );
    expect(sentences.length).toBeGreaterThan(0);
    for (const text of sentences) {
      expect(text, `"${text}" reads as a sentence`).toMatch(/\s/);
      expect(text).not.toMatch(/^[a-z_]+(\.[a-z_]+)+$/);
      expect(text).not.toMatch(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
      );
    }

    // The owner's rename, found by its item.
    await page.locator('#platform-audit-search').fill(renamedTitle);
    const sentence = `${OWNER_NAME} updated the course “${renamedTitle}”`;
    await expect(entries.filter({ hasText: sentence }).first()).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('platform-audit-en.png'),
      fullPage: true,
    });

    await page.setViewportSize(PHONE);
    await setLanguage(page, 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(
      page.getByRole('heading', { name: 'سجل التدقيق', exact: true })
    ).toBeVisible({ timeout: 90_000 });
    await page.locator('#platform-audit-search').fill(renamedTitle);
    await expect(
      entries
        .filter({ hasText: `${OWNER_NAME} حدّث الدورة «${renamedTitle}»` })
        .first()
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('platform-audit-ar-phone.png'),
      fullPage: true,
    });
    await setLanguage(page, 'en');
  });
});
