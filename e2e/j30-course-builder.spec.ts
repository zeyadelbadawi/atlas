/**
 * J30 — Course builder reordering and state consistency (Tasks 8 and 6),
 * Chromium against the real stack and database.
 *
 *  - The owner's course (created through the API) has two sections; the
 *    first holds three lessons.
 *  - KEYBOARD reorder on the drag handle (focus, Space, ArrowDown, Space):
 *    the new order shows at once, the pending state ("Saving order…",
 *    `aria-busy`) appears and clears, and the order survives a reload and
 *    matches the API.
 *  - The Move down button does the same; sections are reordered with
 *    their own Move down button and that survives a reload too.
 *  - Adding a lesson in the builder: the unit lists it at once (no
 *    reload), and the Course Settings curriculum summary counts it when
 *    reached through the in-app tab.
 *  - A real mouse drag (page.mouse down → stepped moves → up) on the
 *    handle.
 *  - Phone (390×844) in Arabic: RTL, translated controls, a reorder with
 *    the Arabic-labelled Move down button.
 *
 * PENDING STATE. A local reorder answers in milliseconds, too fast to
 * observe; the reorder request is therefore HELD for 1.5 s by
 * `page.route` before it continues unchanged to the real API. Nothing is
 * mocked — the response is the server's.
 */
import {
  test,
  expect as baseExpect,
  type APIRequestContext,
  type Locator,
  type Page,
} from '@playwright/test';
import {
  API_BASE,
  SEED,
  apiGet,
  apiPost,
  authHeader,
  requireSeed,
  seedCookieDecision,
  signInThroughDashboard,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import { createCourse } from './support/phase4';

// The shared stack also serves other suites; a cold Vite page can take
// tens of seconds, so waits are generous (assertions are unchanged).
test.describe.configure({ mode: 'serial', timeout: 240_000 });
const expect = baseExpect.configure({ timeout: 45_000 });

const PHONE = { width: 390, height: 844 };
const HOLD_MS = 1_500;

async function signIn(page: Page): Promise<void> {
  await clearAuthRateLimits();
  await seedCookieDecision(page);
  await signInThroughDashboard(page, SEED.owner, SEED.password);
  await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
}

async function setLanguage(page: Page, language: 'en' | 'ar'): Promise<void> {
  await page.evaluate(
    (lang) => localStorage.setItem('atlas:language', JSON.stringify(lang)),
    language
  );
  await page.reload();
}

/** Holds every reorder PATCH briefly, then lets it through to the real API. */
async function holdReorders(page: Page): Promise<void> {
  await page.route(
    /\/api\/v1\/academies\/.+\/(items|sections)\/order$/,
    async (route) => {
      if (route.request().method() === 'PATCH') {
        await new Promise((resolve) => setTimeout(resolve, HOLD_MS));
      }
      await route.continue();
    }
  );
}

/** Ids of the rows of a sortable list, in on-screen order. */
function rowIds(list: Locator): Promise<string[]> {
  return list.evaluate((ol) =>
    Array.from(ol.querySelectorAll(':scope > li[data-sortable-id]')).map(
      (li) => li.getAttribute('data-sortable-id') ?? ''
    )
  );
}

test.describe('J30 — course builder', () => {
  const stamp = `${Date.now()}`;
  const courseTitle = `J30 Course ${stamp}`;
  const unitA = `Unit A ${stamp}`;
  const unitB = `Unit B ${stamp}`;
  const lessonTitles = ['Lesson One', 'Lesson Two', 'Lesson Three'];
  const addedLesson = `Lesson Four ${stamp}`;
  let academyId: string;
  let owner: Session;
  let courseId: string;
  let sectionA: string;
  let sectionB: string;
  const lessonIds: string[] = [];

  const builderPath = () =>
    `/dashboard/academy/${academyId}/courses/${courseId}/builder`;

  async function apiUnitOrder(request: APIRequestContext): Promise<string[]> {
    const res = await apiGet(
      request,
      owner,
      `/academies/${academyId}/courses/${courseId}/sections/${sectionA}/items`
    );
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    const items: { id: string }[] = body.items ?? body;
    return items.map((i) => i.id);
  }

  async function apiSectionOrder(
    request: APIRequestContext
  ): Promise<string[]> {
    const res = await apiGet(
      request,
      owner,
      `/academies/${academyId}/courses/${courseId}/sections`
    );
    const body = await res.json();
    const items: { id: string; order: number }[] = body.items ?? body;
    return [...items].sort((a, b) => a.order - b.order).map((s) => s.id);
  }

  test.beforeAll(async ({ request }) => {
    await clearAuthRateLimits();
    ({ academyId, owner } = await requireSeed(request));
    courseId = await createCourse(request, owner, academyId, {
      title: courseTitle,
      pricing: { type: 'free' },
      description: 'Playwright journey J30: reorder the curriculum.',
    });
    for (const [title, assign] of [
      [unitA, (id: string) => (sectionA = id)],
      [unitB, (id: string) => (sectionB = id)],
    ] as const) {
      const res = await apiPost(
        request,
        owner,
        `/academies/${academyId}/courses/${courseId}/sections`,
        { title }
      );
      expect(res.status(), await res.text()).toBe(201);
      assign((await res.json()).id);
    }
    for (const title of lessonTitles) {
      const res = await apiPost(
        request,
        owner,
        `/academies/${academyId}/courses/${courseId}/sections/${sectionA}/lessons`,
        { title, contentType: 'text', status: 'draft' }
      );
      expect(res.status(), await res.text()).toBe(201);
      lessonIds.push((await res.json()).id);
    }
    expect(await apiUnitOrder(request)).toEqual(lessonIds);
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

  test('desktop (EN): keyboard reorder — immediate, pending state appears and clears, persists after reload', async ({
    page,
    request,
  }, testInfo) => {
    const [one, two, three] = lessonIds;
    await signIn(page);
    await holdReorders(page);
    await page.goto(builderPath());
    const unit = page.getByRole('list', { name: unitA, exact: true });
    await expect(unit).toBeVisible({ timeout: 90_000 });
    expect(await rowIds(unit)).toEqual([one, two, three]);

    // Focus the handle, Space, ArrowDown, Space.
    const handle = page.getByRole('button', { name: 'Reorder Lesson One' });
    await handle.focus();
    await expect(handle).toBeFocused();
    await page.keyboard.press('Space');
    await page.waitForTimeout(250);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(250);
    await page.keyboard.press('Space');

    // Immediately (the request is still held): new order + pending state.
    await expect
      .poll(() => rowIds(unit), { timeout: 1_000 })
      .toEqual([two, one, three]);
    const saving = unit.getByText('Saving order…');
    await expect(saving).toBeVisible({ timeout: 1_000 });
    await expect(unit).toHaveAttribute('aria-busy', 'true');
    await page.screenshot({
      path: testInfo.outputPath('keyboard-pending.png'),
    });
    // …and it clears once the server answers.
    await expect(saving).toBeHidden({ timeout: 15_000 });
    await expect(unit).not.toHaveAttribute('aria-busy', 'true');
    await expect(
      page.getByRole('status').filter({ hasText: 'Order saved' }).first()
    ).toBeAttached();
    expect(await rowIds(unit)).toEqual([two, one, three]);
    // Focus stays on the moved row's handle.
    await expect(handle).toBeFocused();

    expect(await apiUnitOrder(request)).toEqual([two, one, three]);
    await page.reload();
    await expect(unit).toBeVisible({ timeout: 90_000 });
    expect(await rowIds(unit)).toEqual([two, one, three]);
    await expect(unit.locator(':scope > li').first()).toContainText(
      '1. Lesson Two'
    );
    await page.screenshot({
      path: testInfo.outputPath('keyboard-after-reload.png'),
    });
  });

  test('desktop (EN): Move down buttons for an item and for a section; both persist', async ({
    page,
    request,
  }, testInfo) => {
    const [one, two, three] = lessonIds;
    await signIn(page);
    await holdReorders(page);
    await page.goto(builderPath());
    const unit = page.getByRole('list', { name: unitA, exact: true });
    await expect(unit).toBeVisible({ timeout: 90_000 });
    expect(await rowIds(unit)).toEqual([two, one, three]);

    await page.getByRole('button', { name: 'Move "Lesson One" down' }).click();
    await expect
      .poll(() => rowIds(unit), { timeout: 1_000 })
      .toEqual([two, three, one]);
    await expect(unit.getByText('Saving order…')).toBeVisible({
      timeout: 1_000,
    });
    await expect(unit.getByText('Saving order…')).toBeHidden({
      timeout: 15_000,
    });
    expect(await apiUnitOrder(request)).toEqual([two, three, one]);

    // Sections.
    const sections = page.getByRole('list', {
      name: 'Course Builder',
      exact: true,
    });
    expect(await rowIds(sections)).toEqual([sectionA, sectionB]);
    await page
      .getByRole('button', { name: `Move section "${unitA}" down` })
      .click();
    await expect
      .poll(() => rowIds(sections), { timeout: 1_000 })
      .toEqual([sectionB, sectionA]);
    await expect(sections.getByText('Saving order…')).toBeVisible({
      timeout: 1_000,
    });
    await expect(sections.getByText('Saving order…')).toBeHidden({
      timeout: 15_000,
    });
    await expect(sections.locator(':scope > li').first()).toContainText(
      `1. ${unitB}`
    );
    expect(await apiSectionOrder(request)).toEqual([sectionB, sectionA]);

    await page.reload();
    await expect(sections).toBeVisible({ timeout: 90_000 });
    expect(await rowIds(sections)).toEqual([sectionB, sectionA]);
    expect(
      await rowIds(page.getByRole('list', { name: unitA, exact: true }))
    ).toEqual([two, three, one]);
    await page.screenshot({
      path: testInfo.outputPath('buttons-after-reload.png'),
      fullPage: true,
    });
  });

  test('desktop (EN): adding a lesson updates the unit and the curriculum summary without a reload', async ({
    page,
  }, testInfo) => {
    await signIn(page);
    await page.goto(builderPath());
    const unit = page.getByRole('list', { name: unitA, exact: true });
    await expect(unit).toBeVisible({ timeout: 90_000 });
    const unitCard = page.locator('li[data-sortable-id="' + sectionA + '"]');
    await unitCard.getByRole('button', { name: 'Add content' }).click();
    await page.getByRole('menuitem', { name: 'Add Lesson' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add Lesson' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Lesson Title').fill(addedLesson);
    await dialog.getByRole('button', { name: 'Save Lesson' }).click();
    await expect(page.getByText('Lesson added').first()).toBeVisible();
    await expect(dialog).toBeHidden();
    // In the unit at once, numbered last.
    await expect(unit.locator(':scope > li')).toHaveCount(4);
    await expect(unit.locator(':scope > li').last()).toContainText(
      `4. ${addedLesson}`
    );
    await page.screenshot({
      path: testInfo.outputPath('lesson-added.png'),
      fullPage: true,
    });

    // Course Settings, reached through the in-app tab (no reload).
    await page.getByRole('link', { name: 'Course Settings' }).click();
    await page.waitForURL(/\/settings$/);
    await expect(page.getByText('2 sections, 4 lessons')).toBeVisible();

    // The course list (in-app breadcrumb) still lists the course.
    await page.goto(builderPath());
    await page
      .getByRole('navigation', { name: /breadcrumb/i })
      .getByRole('link', { name: 'Courses' })
      .click();
    await page.waitForURL(new RegExp(`/academy/${academyId}/courses$`));
    await expect(
      page.locator('tbody tr', { hasText: courseTitle })
    ).toBeVisible();
  });

  test('desktop (EN): a real mouse drag on the handle reorders the unit', async ({
    page,
    request,
  }, testInfo) => {
    await signIn(page);
    await page.goto(builderPath());
    const unit = page.getByRole('list', { name: unitA, exact: true });
    await expect(unit).toBeVisible({ timeout: 90_000 });
    const before = await rowIds(unit);
    expect(before.length).toBe(4);

    // Drag the LAST row's handle onto the FIRST row.
    const lastId = before[3];
    const handle = unit
      .locator(`li[data-sortable-id="${lastId}"]`)
      .getByRole('button', {
        name: /^Reorder /,
      });
    const target = unit.locator(`li[data-sortable-id="${before[0]}"]`);
    await handle.scrollIntoViewIfNeeded();
    const from = (await handle.boundingBox())!;
    const to = (await target.boundingBox())!;
    const startX = from.x + from.width / 2;
    const startY = from.y + from.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Past the 6 px activation distance first, then in steps to the target.
    await page.mouse.move(startX, startY - 10, { steps: 5 });
    await page.mouse.move(startX, to.y + to.height / 4, { steps: 25 });
    await page.waitForTimeout(200);
    await page.mouse.up();

    const expected = [lastId, ...before.slice(0, 3)];
    await expect.poll(() => rowIds(unit), { timeout: 5_000 }).toEqual(expected);
    await expect(unit.getByText('Saving order…')).toBeHidden({
      timeout: 15_000,
    });
    await expect.poll(() => apiUnitOrder(request)).toEqual(expected);
    await page.screenshot({
      path: testInfo.outputPath('mouse-drag.png'),
      fullPage: true,
    });
  });

  test('phone (AR): RTL, translated controls, Move down reorders and persists', async ({
    page,
    request,
  }, testInfo) => {
    await page.setViewportSize(PHONE);
    await signIn(page);
    await page.goto(builderPath());
    await setLanguage(page, 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('button', { name: 'إضافة قسم' })).toBeVisible({
      timeout: 90_000,
    });
    const unit = page.getByRole('list', { name: unitA, exact: true });
    await expect(unit).toBeVisible();
    const before = await rowIds(unit);
    const firstTitle = (await unit.locator(':scope > li').first().innerText())
      .split('\n')
      .find((line) => /^1\. /.test(line.trim()))!
      .trim()
      .replace(/^1\. /, '');
    await page
      .getByRole('button', { name: `نقل «${firstTitle}» لأسفل` })
      .click();
    const expected = [before[1], before[0], ...before.slice(2)];
    await expect.poll(() => rowIds(unit), { timeout: 2_000 }).toEqual(expected);
    await expect(unit.getByText('جارٍ حفظ الترتيب…')).toBeHidden({
      timeout: 15_000,
    });
    await expect.poll(() => apiUnitOrder(request)).toEqual(expected);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      )
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: testInfo.outputPath('builder-ar-phone.png'),
      fullPage: true,
    });
    await setLanguage(page, 'en');
  });
});
