/**
 * J39 — academy switching isolation (W5), Chromium against the real stack.
 *
 * The URL is the single source of truth for the active academy. Two
 * accounts from the seed:
 *   - the Organization Owner (Sarah Chen), who owns two academies in one
 *     organization — Web Development Academy (A, has courses) and Data
 *     Science Academy (B, has none);
 *   - the seeded Manager (Nora Haddad), staff of academy A ONLY.
 *
 * Covered:
 *   1. Switching A -> B never shows A's data in B (watched on every DOM
 *      mutation, not just after load), lands on the same screen in B, and
 *      the sidebar's links follow.
 *   2. Back/Forward replay the switch (the switcher pushes history).
 *   3. An unsaved form prompts before the switch; Stay keeps the edit,
 *      Leave switches and the form shows B's values.
 *   4. The manager of A is not offered B, and a direct URL to B is refused
 *      with a clear message and a redirect to an academy she can open.
 *   5. Revoked mid-session (her academy membership flipped to inactive):
 *      the next academy request is refused, the cached academy data is
 *      gone, and she lands on the empty state with the explanation. Her
 *      membership is restored afterwards.
 *   6. Phone (390 px), Arabic: the academy bar shows the current academy
 *      and role, opens with the keyboard, and the page does not scroll
 *      sideways.
 *   7. The seeded Instructor (staff of A only) is not offered B, and a
 *      direct URL to B is refused.
 *   8. The owner's academy bar, open, in EN and AR on a desktop and a
 *      phone: both academies listed, translated role, no sideways scroll.
 *
 * NEEDS THE INTEGRATED BUILD: the API must serve W5's backend (the academy
 * scope guard, the filtered `GET /academies`, `GET /academies/:id/me`).
 * Against an older API, cases 4 and 5 cannot pass (the old guard admitted
 * any organization member).
 */
import { test, expect as baseExpect, type Page } from '@playwright/test';
import {
  SEED,
  seedCookieDecision,
  signInThroughDashboard,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import { adminQuery, adminSql } from './support/admin-db';
import {
  VARIANTS,
  applyVariant,
  captureEvidence,
  expectNoSidewaysScroll,
  setStoredLanguage,
} from './support/evidence';

test.describe.configure({ mode: 'serial', timeout: 240_000 });
const expect = baseExpect.configure({ timeout: 45_000 });

const ACADEMY_A_NAME = SEED.academyName; // Web Development Academy
const ACADEMY_B_NAME = 'Data Science Academy';

async function signIn(page: Page, email: string): Promise<void> {
  await clearAuthRateLimits();
  await seedCookieDecision(page);
  await signInThroughDashboard(page, email, SEED.password);
  await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
}

async function academyIdByName(name: string): Promise<string> {
  const [row] = await adminQuery<{ id: string }>(
    `select a.id from academies a
       join organizations o on o.id = a.organization_id
       join organization_memberships m on m.organization_id = o.id and m.role = 'owner'
       join users u on u.id = m.user_id
      where u.email = :'owner' and a.name = :'name'
      order by a.created_at
      limit 1`,
    { owner: SEED.owner, name }
  );
  expect(row, `the seeded academy "${name}" exists`).toBeTruthy();
  return row.id;
}

async function openSwitcherAndPick(
  page: Page,
  academyId: string
): Promise<void> {
  await page.getByTestId('academy-switcher').first().click();
  await page.getByTestId(`academy-switcher-option-${academyId}`).click();
}

const main = (page: Page) => page.locator('main');

/** Every course title of academy A — none of them may ever render in B. */
let aTitles: string[] = [];

/** Waits for A's course list and checks its first row is one of A's courses. */
async function waitForACourses(page: Page): Promise<void> {
  const firstCell = main(page).getByRole('cell').first();
  await expect(firstCell).toBeVisible({ timeout: 120_000 });
  const title = (await firstCell.textContent())?.trim() ?? '';
  expect(aTitles, `"${title}" is one of academy A's courses`).toContain(title);
}

/** `true` when any of A's course titles is in the main content right now. */
function showsAnyACourse(page: Page): Promise<boolean> {
  return page.evaluate((titles) => {
    const text = document.querySelector('main')?.textContent ?? '';
    return titles.some((title) => text.includes(title));
  }, aTitles);
}

test.describe('J39 — academy switching', () => {
  let academyA: string;
  let academyB: string;
  let managerMembershipId: string;

  test.beforeAll(async () => {
    academyA = await academyIdByName(ACADEMY_A_NAME);
    academyB = await academyIdByName(ACADEMY_B_NAME);
    const [row] = await adminQuery<{ id: string }>(
      `select am.id from academy_members am join users u on u.id = am.user_id
        where u.email = :'email' and am.academy_id = :'academy'`,
      { email: SEED.manager, academy: academyA }
    );
    expect(row, 'the seeded manager staffs academy A').toBeTruthy();
    managerMembershipId = row.id;
    aTitles = (
      await adminQuery<{ title: string }>(
        `select title from courses where academy_id = :'academy'`,
        { academy: academyA }
      )
    ).map((course) => course.title);
    expect(aTitles.length, 'academy A has courses').toBeGreaterThan(0);
    const [{ n }] = await adminQuery<{ n: number }>(
      `select count(*)::int as n from courses where academy_id = :'academy'`,
      { academy: academyB }
    );
    expect(
      n,
      'academy B has no courses, so any course title in B is a leak'
    ).toBe(0);
  });

  test.afterAll(async () => {
    // Whatever happened, the seeded manager's membership is active again.
    if (managerMembershipId) {
      await adminSql(
        `update academy_members set status = 'active' where id = :'id';`,
        { id: managerMembershipId }
      );
    }
  });

  test('owner: switching A -> B shows no data from A, on the same screen in B', async ({
    page,
  }) => {
    await signIn(page, SEED.owner);
    await page.goto(`/dashboard/academy/${academyA}/courses`);
    await waitForACourses(page);
    await expect(
      page.getByTestId('academy-switcher-current').first()
    ).toHaveText(ACADEMY_A_NAME);

    // Watch EVERY DOM change from here on: if any of A's courses ever
    // renders while the URL is B's, the switch leaked.
    await page.evaluate(
      ({ b, titles }) => {
        const w = window as unknown as { __staleSeen: boolean };
        w.__staleSeen = false;
        new MutationObserver(() => {
          const text = document.querySelector('main')?.textContent ?? '';
          if (
            location.pathname.includes(b) &&
            titles.some((title) => text.includes(title))
          ) {
            w.__staleSeen = true;
          }
        }).observe(document.body, {
          subtree: true,
          childList: true,
          characterData: true,
        });
      },
      { b: academyB, titles: aTitles }
    );

    await openSwitcherAndPick(page, academyB);
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/academy/${academyB}/courses$`)
    );
    await expect(
      page.getByTestId('academy-switcher-current').first()
    ).toHaveText(ACADEMY_B_NAME);
    // B's own (empty) course list has loaded…
    await expect(page.getByTestId('academy-switching-overlay')).toHaveCount(0);
    await expect(main(page).getByRole('heading', { level: 1 })).toBeVisible();
    expect(await showsAnyACourse(page)).toBe(false);
    // …and A's data never appeared, not even for a frame.
    expect(
      await page.evaluate(
        () => (window as unknown as { __staleSeen: boolean }).__staleSeen
      )
    ).toBe(false);

    // The sidebar's academy links follow the URL.
    const coursesLink = page
      .getByRole('navigation')
      .first()
      .getByRole('link', { name: 'Courses', exact: true });
    await expect(coursesLink).toHaveAttribute(
      'href',
      `/dashboard/academy/${academyB}/courses`
    );
  });

  test('owner: Back and Forward replay the switch coherently', async ({
    page,
  }) => {
    await signIn(page, SEED.owner);
    await page.goto(`/dashboard/academy/${academyA}/courses`);
    await waitForACourses(page);
    await openSwitcherAndPick(page, academyB);
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/academy/${academyB}/courses$`)
    );

    await page.goBack();
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/academy/${academyA}/courses$`)
    );
    await waitForACourses(page);
    await expect(
      page.getByTestId('academy-switcher-current').first()
    ).toHaveText(ACADEMY_A_NAME);

    await page.goForward();
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/academy/${academyB}/courses$`)
    );
    await expect(
      page.getByTestId('academy-switcher-current').first()
    ).toHaveText(ACADEMY_B_NAME);
    expect(await showsAnyACourse(page)).toBe(false);
  });

  test('owner: an unsaved form prompts before the switch', async ({ page }) => {
    await signIn(page, SEED.owner);
    await page.goto(`/dashboard/academy/${academyA}/settings`);
    const name = page.getByLabel('Academy Name');
    await expect(name).toHaveValue(ACADEMY_A_NAME, { timeout: 120_000 });
    await name.fill(`${ACADEMY_A_NAME} (unsaved edit)`);

    await openSwitcherAndPick(page, academyB);
    await expect(page.getByTestId('unsaved-stay')).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/academy/${academyA}/settings$`)
    );

    await page.getByTestId('unsaved-stay').click();
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/academy/${academyA}/settings$`)
    );
    await expect(name).toHaveValue(`${ACADEMY_A_NAME} (unsaved edit)`);

    await openSwitcherAndPick(page, academyB);
    await page.getByTestId('unsaved-leave').click();
    await expect(page).toHaveURL(
      new RegExp(`/dashboard/academy/${academyB}/settings$`)
    );
    // A fresh form for B — nothing typed in A carried over.
    await expect(page.getByLabel('Academy Name')).toHaveValue(ACADEMY_B_NAME);
  });

  test('manager of A: B is not offered, and a direct URL to B is refused', async ({
    page,
  }) => {
    await signIn(page, SEED.manager);
    await page.goto(`/dashboard/academy/${academyA}/courses`);
    await waitForACourses(page);
    await page.getByTestId('academy-switcher').first().click();
    await expect(
      page.getByTestId(`academy-switcher-option-${academyA}`)
    ).toBeVisible();
    await expect(
      page.getByTestId(`academy-switcher-option-${academyB}`)
    ).toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.goto(`/dashboard/academy/${academyB}/courses`);
    await expect(page.getByTestId('academy-access-lost')).toBeVisible();
    // Redirected to the academy she CAN open.
    await expect(page).toHaveURL(new RegExp(`/dashboard/academy/${academyA}$`));
  });

  test('manager of A: access revoked mid-session redirects, and A is gone from view', async ({
    page,
  }) => {
    await signIn(page, SEED.manager);
    await page.goto(`/dashboard/academy/${academyA}/courses`);
    await waitForACourses(page);

    try {
      await adminSql(
        `update academy_members set status = 'inactive' where id = :'id';`,
        { id: managerMembershipId }
      );

      // Her next request in the academy (an ordinary in-app navigation)
      // is refused, and the app leaves the academy.
      await page
        .getByRole('navigation')
        .first()
        .getByRole('link', { name: 'Members', exact: true })
        .click();
      await expect(page).toHaveURL(/\/dashboard\/academy$/);
      await expect(page.getByTestId('academy-access-lost')).toBeVisible();
      expect(await showsAnyACourse(page)).toBe(false);
      // She staffs no academy any more: no switcher, the empty state.
      await expect(page.getByTestId('academy-switcher')).toHaveCount(0);

      // Back does not return to a page that can only refuse.
      await page.goBack();
      expect(await showsAnyACourse(page)).toBe(false);
    } finally {
      await adminSql(
        `update academy_members set status = 'active' where id = :'id';`,
        { id: managerMembershipId }
      );
    }
  });

  test('phone, Arabic: the academy bar shows academy and role, works with the keyboard, no sideways scroll', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, SEED.owner);
    await page.goto(`/dashboard/academy/${academyA}`);
    await page.evaluate(() =>
      localStorage.setItem('atlas:language', JSON.stringify('ar'))
    );
    await page.reload();
    try {
      const trigger = page.getByTestId('academy-switcher').first();
      await expect(trigger).toBeVisible({ timeout: 120_000 });
      await expect(trigger).toContainText(ACADEMY_A_NAME);
      await expect(trigger.getByTestId('academy-role-badge')).toHaveText(
        'المالك'
      );
      expect(await page.evaluate(() => document.documentElement.dir)).toBe(
        'rtl'
      );

      await trigger.focus();
      await page.keyboard.press('Enter');
      await expect(
        page.getByTestId(`academy-switcher-option-${academyB}`)
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(
        page.getByTestId(`academy-switcher-option-${academyB}`)
      ).toHaveCount(0);

      const width = await page.evaluate(
        () => document.documentElement.scrollWidth
      );
      expect(width).toBeLessThanOrEqual(390);
    } finally {
      await page.evaluate(() =>
        localStorage.setItem('atlas:language', JSON.stringify('en'))
      );
    }
  });

  test('instructor of A: B is not offered, and a direct URL to B is refused', async ({
    page,
  }) => {
    await signIn(page, SEED.instructor);
    await page.goto(`/dashboard/academy/${academyA}`);
    await expect(
      page.getByTestId('academy-switcher-current').first()
    ).toHaveText(ACADEMY_A_NAME, { timeout: 120_000 });
    await page.getByTestId('academy-switcher').first().click();
    await expect(
      page.getByTestId(`academy-switcher-option-${academyA}`)
    ).toBeVisible();
    await expect(
      page.getByTestId(`academy-switcher-option-${academyB}`)
    ).toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.goto(`/dashboard/academy/${academyB}/courses`);
    await expect(page.getByTestId('academy-access-lost')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/dashboard/academy/${academyA}$`));
  });

  test('owner: the academy bar, open, in EN and AR on a desktop and a phone', async ({
    page,
  }) => {
    await signIn(page, SEED.owner);
    await page.goto(`/dashboard/academy/${academyA}`);
    try {
      for (const variant of VARIANTS) {
        await applyVariant(page, variant);
        const trigger = page.getByTestId('academy-switcher').first();
        await expect(trigger).toBeVisible({ timeout: 120_000 });
        await expect(trigger.getByTestId('academy-role-badge')).toHaveText(
          variant.language === 'ar' ? 'المالك' : 'Owner'
        );
        await trigger.click();
        await expect(
          page.getByTestId(`academy-switcher-option-${academyA}`)
        ).toBeVisible();
        await expect(
          page.getByTestId(`academy-switcher-option-${academyB}`)
        ).toBeVisible();
        await expectNoSidewaysScroll(page);
        await captureEvidence(page, `academy-switcher-${variant.name}`);
        await page.keyboard.press('Escape');
      }
    } finally {
      await setStoredLanguage(page, 'en');
    }
  });
});
