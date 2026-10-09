/**
 * J48 — forensic watermark, end to end (backend docs/FORENSIC_WATERMARK.md).
 *
 * The leak-investigation journey, with nothing mocked:
 *   1. a learner opens a video lesson on the academy website and the player
 *      draws their personal code over it;
 *   2. the code is read off the screen — exactly what an operator does with
 *      a leaked recording;
 *   3. a Platform Owner looks it up in the dashboard and sees who was
 *      watching, what, and on which session — and the lookup is audited;
 *   4. a misread symbol is caught before any request, and an academy owner
 *      cannot use the page at all.
 */
import { test, expect, type Page } from '@playwright/test';
import {
  API_BASE,
  LEARNER_PASSWORD,
  SEED,
  academyPath,
  apiPost,
  apiSignIn,
  registerLearnerThroughWebsite,
  requireSeed,
  seedCookieDecision,
  signInThroughDashboard,
  uniqueLearnerEmail,
  uniqueLearnerName,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import { PLATFORM_OWNER_EMAIL, signInOnWebsite } from './support/phase4';
import { adminQuery } from './support/admin-db';
import { setStoredLanguage } from './support/evidence';

test.describe.configure({ mode: 'serial' });

const CODE = /^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/;

test.describe('J48 — forensic watermark: learner code → Platform Owner lookup', () => {
  const stamp = `${Date.now()}`;
  const learnerEmail = uniqueLearnerEmail('j48');
  const learnerName = uniqueLearnerName('J48 Learner');
  const lessonTitle = `J48 Lesson ${stamp}`;
  const courseTitle = `J48 Watermark Course ${stamp}`;
  let owner: Session;
  let academyId = '';
  let courseId = '';
  let lessonId = '';
  let code = '';

  test.beforeAll(async ({ request }) => {
    test.setTimeout(180_000);
    await clearAuthRateLimits();
    ({ owner, academyId } = await requireSeed(request));
    const post = async (path: string, data?: unknown) => {
      const response = await apiPost(request, owner, path, data);
      expect(response.status(), await response.text()).toBeLessThan(300);
      return response.json();
    };
    const created = await post(`/academies/${academyId}/courses`, {
      title: courseTitle,
      slug: courseTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      shortDescription: 'Playwright journey J48.',
      pricing: { type: 'free' },
      visibility: 'public',
    });
    const section = await post(
      `/academies/${academyId}/courses/${created.id}/sections`,
      { title: 'Unit 1' }
    );
    const lesson = await post(
      `/academies/${academyId}/courses/${created.id}/sections/${section.id}/lessons`,
      {
        title: lessonTitle,
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        status: 'published',
        completionRule: 'manual',
      }
    );
    await post(`/academies/${academyId}/courses/${created.id}/publish`);
    courseId = created.id;
    lessonId = lesson.id;
  });

  test('the learner sees their own code over the lesson video', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(150_000);
    const context = await browser.newContext();
    const page = await context.newPage();
    await seedCookieDecision(page);
    // YouTube is not reachable from the test environment; a stub embed
    // stands in, so only Atlas's own frame is under test.
    await page.route('https://www.youtube-nocookie.com/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><body style="background:#123">stub embed</body>',
      })
    );
    await registerLearnerThroughWebsite(page, learnerEmail, learnerName);
    await expect(
      page
        .getByText(
          /check your (email|inbox)|account created|your account is ready|verify/i
        )
        .first()
    ).toBeVisible({ timeout: 20_000 });
    const learner = await apiSignIn(request, {
      email: learnerEmail,
      password: LEARNER_PASSWORD,
      surface: 'academy',
      academyId,
    });
    const enrolled = await apiPost(
      request,
      owner,
      `/academies/${academyId}/students/${learner.userId}/enrollments`,
      { courseId }
    );
    expect(enrolled.status(), await enrolled.text()).toBeLessThan(300);
    await signInOnWebsite(page, learnerEmail);

    await page.goto(academyPath(`/my/courses/${courseId}/learn/${lessonId}`));
    const label = page.getByTestId('forensic-watermark-label');
    await expect(label).toBeVisible({ timeout: 30_000 });
    const text = (await label.textContent()) ?? '';
    const [shown, masked] = text.split(' · ');
    expect(shown).toMatch(CODE);
    // A masked hint of the learner's own email — never the whole address.
    expect(masked).toContain('•••@');
    expect(masked).not.toBe(learnerEmail);
    code = shown;

    // The caption explains it, in words, with the same code.
    const caption = page.getByTestId('forensic-watermark-caption');
    await expect(caption).toContainText('Personal watermark');
    await expect(caption).toContainText(code);
    await page.screenshot({
      path: testInfo.outputPath('learner-watermark.png'),
    });
    await context.close();
  });

  async function openLookup(page: Page): Promise<void> {
    await signInThroughDashboard(page, PLATFORM_OWNER_EMAIL, SEED.password);
    await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
    await page.goto('/dashboard/platform/watermarks');
    await expect(
      page.getByRole('heading', { name: 'Watermark lookup', level: 1 })
    ).toBeVisible({ timeout: 30_000 });
  }

  test('a Platform Owner reads the code off the screen and finds the viewer — audited', async ({
    browser,
  }, testInfo) => {
    test.setTimeout(150_000);
    expect(code, 'the previous step read a code').toMatch(CODE);
    const context = await browser.newContext();
    const page = await context.newPage();
    await openLookup(page);

    const field = page.getByRole('textbox', { name: 'Watermark code' });
    // Typed the way someone reads a screen: lower case, no dash.
    await field.fill(code.replace('-', '').toLowerCase());
    await expect(page.getByTestId('watermark-code-feedback')).toContainText(
      'Valid code'
    );
    await page.getByRole('button', { name: 'Look up' }).click();

    await expect(page).toHaveURL(new RegExp(`code=${code}`));
    const main = page.getByRole('main');
    await expect(main).toContainText(learnerEmail, { timeout: 30_000 });
    await expect(main).toContainText(learnerName);
    await expect(main).toContainText(lessonTitle);
    await expect(main).toContainText(courseTitle);
    await expect(main).toContainText('Lesson video');
    await expect(main).toContainText('Active');
    await page.screenshot({
      path: testInfo.outputPath('lookup-result.png'),
      fullPage: true,
    });

    // Every lookup is in the audit log — and no part of the audit row
    // carries the identity it revealed.
    await expect
      .poll(
        async () =>
          (
            await adminQuery<{ n: number }>(
              `select count(*)::int as n from audit_log_entries a
                where a.action = 'platform.watermark.looked_up'
                  and a.occurred_at > (now() at time zone 'utc') - interval '5 minutes'
                  and row_to_json(a)::text not like '%' || :'e' || '%'`,
              { e: learnerEmail }
            )
          )[0].n,
        { timeout: 20_000 }
      )
      .toBeGreaterThan(0);

    // A single misread symbol is caught before any request is sent.
    const misread = code.slice(0, -1) + (code.endsWith('0') ? '1' : '0');
    let requested = false;
    page.on('request', (r) => {
      if (r.url().includes(`/platform/watermarks/${misread}`)) requested = true;
    });
    await field.fill(misread);
    await expect(page.getByTestId('watermark-code-feedback')).toContainText(
      'misread'
    );
    expect(requested).toBe(false);

    // Arabic: the page reads right to left, the code stays left to right.
    await page.goto(`/dashboard/platform/watermarks?code=${code}`);
    await setStoredLanguage(page, 'ar');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl', {
      timeout: 30_000,
    });
    await expect(page.getByRole('main')).toContainText(learnerEmail, {
      timeout: 30_000,
    });
    await page.screenshot({
      path: testInfo.outputPath('lookup-result-ar.png'),
      fullPage: true,
    });
    await context.close();
  });

  test('an academy owner cannot use the lookup', async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);
    // The API refuses outright.
    const refused = await request.get(
      `${API_BASE}/platform/watermarks/${code.replace('-', '')}`,
      { headers: { Authorization: `Bearer ${owner.accessToken}` } }
    );
    expect(refused.status()).toBe(403);

    // And the dashboard never shows the page to them.
    const context = await browser.newContext();
    const page = await context.newPage();
    await signInThroughDashboard(page, SEED.owner, SEED.password);
    await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
    await page.goto('/dashboard/platform/watermarks');
    await expect(
      page.getByRole('heading', { name: 'Watermark lookup', level: 1 })
    ).toHaveCount(0, { timeout: 15_000 });
    await context.close();
  });
});
