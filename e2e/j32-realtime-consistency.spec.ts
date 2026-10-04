/**
 * J32 — cross-session consistency without a reload (Task 6), Chromium
 * against the real stack and database.
 *
 * THE PAIR (docs/STATE_CONSISTENCY_MATRIX.md): "Course create/edit/delete/
 * publish/unpublish → invalidateCourseCatalog (… dashboard overview,
 * academy stats …)" in the session that acts, and "Dashboard overview /
 * academy stats (others' activity) → live list (45 s poll, refetch on
 * focus)" in every OTHER session. The backend has no push channel, so a
 * second browser only learns of a change through that live list.
 *
 * The suggested FAQ / site-publish / branding pairs were not chosen: per
 * the matrix none of their screens is a live list (global
 * `refetchOnWindowFocus` is off and only `LIVE_LIST_QUERY_OPTIONS` hooks
 * poll), so another session sees those only after its 60 s stale time AND
 * a remount — by design, not something T6 promises.
 *
 *  1. Context A (the owner, desktop, English) CREATES a course through the
 *     Create Course form. Context B (a SECOND session of the same owner,
 *     phone 390×844, Arabic/RTL) sits on the organization dashboard
 *     (`useDashboardOverview`). After A creates, B is brought to the front
 *     and sent `visibilitychange` + `focus`; within 60 s its "Courses"
 *     card shows the new count — no navigation or reload (a marker on
 *     `window` survives).
 *  2. Context A PUBLISHES a course from Course Settings; Context B sits on
 *     the ACADEMY dashboard (`useAcademyStats`, also a live list) and its
 *     "Published courses" card must come to show the academy's real
 *     number of published courses.
 *
 * Other suites may create courses on the shared stack at the same time,
 * so B is compared with the API / database's CURRENT count, never with a
 * hard-coded number.
 */
import {
  test,
  expect as baseExpect,
  type Browser,
  type Page,
} from '@playwright/test';
import {
  API_BASE,
  SEED,
  apiGet,
  apiPost,
  authHeader,
  findCourseByTitle,
  requireSeed,
  seedCookieDecision,
  signInThroughDashboard,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import { createCourse } from './support/phase4';
import { adminQuery } from './support/admin-db';

test.describe.configure({ mode: 'serial', timeout: 300_000 });
const expect = baseExpect.configure({ timeout: 45_000 });

const PHONE = { width: 390, height: 844 };

async function signIn(page: Page): Promise<void> {
  await clearAuthRateLimits();
  await seedCookieDecision(page);
  await signInThroughDashboard(page, SEED.owner, SEED.password);
  await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
}

/** The big number of the metric card whose label is `label`. */
function metric(page: Page, label: string) {
  return page
    .locator('div.rounded-lg', {
      has: page.getByText(label, { exact: true }),
    })
    .locator('p[data-atlas-numeric="true"]');
}

async function readNumber(locator: ReturnType<typeof metric>): Promise<number> {
  return Number((await locator.innerText()).trim().replace(/[^\d]/g, ''));
}

/** B regains focus: what TanStack's focus manager listens to. */
async function refocus(page: Page): Promise<void> {
  await page.bringToFront();
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
}

async function markDocument(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __j32Marker: string }).__j32Marker = 'no-reload';
  });
}

async function expectSameDocument(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () => (window as unknown as { __j32Marker?: string }).__j32Marker
    )
  ).toBe('no-reload');
}

/** Context B: the owner's second session, phone, Arabic, at `path`. */
async function openSessionB(browser: Browser, path: string) {
  const context = await browser.newContext({ viewport: PHONE });
  const page = await context.newPage();
  await signIn(page);
  await page.goto(path);
  await page.evaluate(() =>
    localStorage.setItem('atlas:language', JSON.stringify('ar'))
  );
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  return { context, page };
}

test.describe('J32 — a change in one session reaches another without a reload', () => {
  const stamp = `${Date.now()}`;
  const createdTitle = `J32 Created ${stamp}`;
  const publishTitle = `J32 Publish ${stamp}`;
  let academyId: string;
  let organizationId: string;
  let owner: Session;
  let publishCourseId: string;
  const toDelete: string[] = [];

  test.beforeAll(async ({ request }) => {
    await clearAuthRateLimits();
    ({ academyId, owner } = await requireSeed(request));
    organizationId = (
      await (await apiGet(request, owner, `/academies/${academyId}`)).json()
    ).organizationId;

    publishCourseId = await createCourse(request, owner, academyId, {
      title: publishTitle,
      pricing: { type: 'free' },
      description: 'Playwright journey J32: publish in one session.',
    });
    toDelete.push(publishCourseId);
    const section = await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses/${publishCourseId}/sections`,
      { title: 'J32 Unit' }
    );
    expect(section.status(), await section.text()).toBe(201);
    const lesson = await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses/${publishCourseId}/sections/${(await section.json()).id}/lessons`,
      { title: 'J32 Lesson', contentType: 'text', status: 'published' }
    );
    expect(lesson.status(), await lesson.text()).toBe(201);
  });

  test.afterAll(async ({ request }) => {
    for (const id of toDelete) {
      await request
        .delete(`${API_BASE}/academies/${academyId}/courses/${id}`, {
          headers: authHeader(owner),
        })
        .catch(() => undefined);
    }
  });

  test("A (desktop, EN) creates a course → B (phone, AR) sees the organization dashboard's course count change after focus, without reloading", async ({
    browser,
    request,
  }, testInfo) => {
    const coursesNow = async () => {
      const res = await apiGet(
        request,
        owner,
        `/organizations/${organizationId}/dashboard`
      );
      expect(res.ok(), await res.text()).toBeTruthy();
      return (await res.json()).counts.courses as number;
    };

    const b = await openSessionB(browser, '/dashboard');
    const contextA = await browser.newContext();
    try {
      const cardB = metric(b.page, 'الدورات');
      await expect(cardB).toBeVisible({ timeout: 120_000 });
      const before = await readNumber(cardB);
      // B shows the owning organization's numbers.
      expect(before).toBe(await coursesNow());
      await markDocument(b.page);
      await b.page.screenshot({
        path: testInfo.outputPath('b-dashboard-before-ar-phone.png'),
      });

      // A: Create Course, through the product's form.
      const a = await contextA.newPage();
      await signIn(a);
      await a.goto(`/dashboard/academy/${academyId}/courses/create`);
      await a
        .getByLabel('Course Title')
        .fill(createdTitle, { timeout: 120_000 });
      await a.getByRole('button', { name: 'Create Course' }).click();
      // W6 — Create Course is the guided wizard's first step: the draft
      // exists once the wizard moves on to Details.
      await a.waitForURL(/\/courses\/[^/]+\/setup\?step=details/);
      await expect(a.getByTestId('wizard-step-heading')).toHaveText(
        'Course details'
      );
      toDelete.push(
        (await findCourseByTitle(request, owner, academyId, createdTitle)).id
      );
      const after = await coursesNow();
      expect(after).toBeGreaterThan(before);

      // B regains focus; its live list refetches (or its 45 s poll fires).
      const createdAt = Date.now();
      await refocus(b.page);
      await expect
        .poll(
          async () => {
            const shown = await readNumber(cardB);
            return shown >= after ? 'updated' : `still ${shown}`;
          },
          { timeout: 60_000, intervals: [1_000, 2_000, 5_000] }
        )
        .toBe('updated');
      testInfo.annotations.push({
        type: 'B updated after',
        description: `${Math.round((Date.now() - createdAt) / 1000)}s`,
      });
      await expectSameDocument(b.page);
      expect(new URL(b.page.url()).pathname).toBe('/dashboard');
      await b.page.screenshot({
        path: testInfo.outputPath('b-dashboard-after-ar-phone.png'),
      });
    } finally {
      await contextA.close();
      await b.context.close();
    }
  });

  test("A (desktop, EN) publishes a course → B (phone, AR) academy dashboard shows the academy's real published-course count", async ({
    browser,
  }, testInfo) => {
    const publishedInDb = async () =>
      (
        await adminQuery<{ n: number }>(
          `select count(*)::int as n from courses where academy_id = :'a' and status = 'published'`,
          { a: academyId }
        )
      )[0].n;

    const b = await openSessionB(browser, `/dashboard/academy/${academyId}`);
    const contextA = await browser.newContext();
    try {
      const cardB = metric(b.page, 'الدورات المنشورة');
      await expect(cardB).toBeVisible({ timeout: 120_000 });
      await markDocument(b.page);
      await b.page.screenshot({
        path: testInfo.outputPath('b-academy-before-ar-phone.png'),
      });

      const a = await contextA.newPage();
      await signIn(a);
      await a.goto(
        `/dashboard/academy/${academyId}/courses/${publishCourseId}/settings`
      );
      await a
        .getByRole('button', { name: 'Publish Course' })
        .click({ timeout: 120_000 });
      const dialog = a.getByRole('alertdialog', {
        name: 'Publish this course?',
      });
      await expect(dialog).toBeVisible();
      await dialog
        .getByRole('button', { name: 'Publish', exact: true })
        .click();
      await expect(
        a.getByText('Course published successfully').first()
      ).toBeVisible();
      await a.screenshot({ path: testInfo.outputPath('a-published-en.png') });
      const published = await publishedInDb();
      expect(published).toBeGreaterThan(0);

      await refocus(b.page);
      await expect
        .poll(
          async () => {
            const shown = await readNumber(cardB);
            return shown >= published
              ? 'updated'
              : `card shows ${shown}, database has ${published} published`;
          },
          { timeout: 60_000, intervals: [1_000, 2_000, 5_000] }
        )
        .toBe('updated');
      await expectSameDocument(b.page);
    } finally {
      await b.page
        .screenshot({
          path: testInfo.outputPath('b-academy-after-ar-phone.png'),
        })
        .catch(() => undefined);
      await contextA.close();
      await b.context.close();
    }
  });
});
