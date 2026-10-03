/**
 * J22 — "My Learn" and the learner account menu (Task B), Chromium against
 * the real stack and database.
 *
 * A signed-out visitor follows "My Learn" from the Academy header, is
 * asked to sign in, and lands on My Learn. Signed in, their name opens the
 * account menu (My Learn, My Courses, Profile & settings, Sign out): it is
 * keyboard operable, closes on Escape and on an outside click, and Sign out
 * really ends the session. On a phone the side sheet and the bottom bar
 * both carry My Learn, in English and Arabic (RTL). A fresh learner
 * account is created through the website's own sign-up form for this run.
 */
import { test, expect } from '@playwright/test';
import {
  LEARNER_PASSWORD,
  academyPath,
  declineCookies,
  registerLearnerThroughWebsite,
  requireSeed,
  seedCookieDecision,
  uniqueLearnerEmail,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';

test.describe.configure({ mode: 'serial' });

const learnerEmail = uniqueLearnerEmail('j22');
const LEARNER_NAME = 'J22 Learner';

test.describe('J22 — My Learn and the account menu', () => {
  test.beforeAll(async ({ request }) => {
    await clearAuthRateLimits();
    await requireSeed(request);
  });

  test('signed out: My Learn → sign in → My Learn; the account menu works and Sign out ends the session', async ({
    page,
  }, testInfo) => {
    test.setTimeout(150_000);
    await seedCookieDecision(page);
    await registerLearnerThroughWebsite(page, learnerEmail, LEARNER_NAME);
    await expect(
      page
        .getByText(
          /check your (email|inbox)|account created|your account is ready|verify/i
        )
        .first()
    ).toBeVisible({ timeout: 20_000 });
    await page.context().clearCookies({ name: /^(__Host-)?atlas_session$/ });

    await page.goto(academyPath('/'));
    const header = page.locator('header').first();
    const myLearn = header.getByRole('link', { name: 'My Learn' });
    await expect(myLearn).toBeVisible({ timeout: 30_000 });
    await myLearn.click();
    await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fmy/);

    await declineCookies(page);
    await page.locator('input[type="email"]').fill(learnerEmail);
    await page.locator('input[type="password"]').fill(LEARNER_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    // Back where they meant to go.
    await expect(page).toHaveURL(/\/my(\?|$)/, { timeout: 30_000 });

    // The account menu, from the website home.
    await page.goto(academyPath('/'));
    const trigger = page.getByRole('button', {
      name: `Account menu for ${LEARNER_NAME}`,
    });
    await expect(trigger).toBeVisible({ timeout: 30_000 });
    await expect(header.getByRole('link', { name: 'Sign up' })).toHaveCount(0);

    await trigger.click();
    const menu = page.getByRole('menu');
    await expect(menu.getByRole('menuitem')).toHaveText([
      'My Learn',
      'My Courses',
      'Profile & settings',
      'Sign out',
    ]);
    // Opaque once its open animation has finished.
    await expect(menu).toHaveCSS('opacity', '1');
    await page.screenshot({
      path: testInfo.outputPath('account-menu-en.png'),
    });
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();

    // An outside click closes it too.
    await trigger.click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.mouse.click(5, 400);
    await expect(page.getByRole('menu')).toHaveCount(0);

    // Keyboard: open, arrow to My Courses, follow it.
    await trigger.focus();
    await page.keyboard.press('Enter');
    // Opened from the keyboard, the first entry takes focus.
    await expect(
      page.getByRole('menuitem', { name: 'My Learn' })
    ).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(
      page.getByRole('menuitem', { name: 'My Courses' })
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/my\/courses/, { timeout: 30_000 });

    // Sign out really ends the session.
    await page.goto(academyPath('/'));
    await page
      .getByRole('button', { name: `Account menu for ${LEARNER_NAME}` })
      .click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(header.getByRole('link', { name: 'Sign in' })).toBeVisible({
      timeout: 30_000,
    });
    await page.reload();
    await expect(
      page.locator('header').first().getByRole('link', { name: 'My Learn' })
    ).toHaveAttribute('href', /\/sign-in\?returnTo=%2Fmy/);
  });

  test('phone, English and Arabic: the side sheet and the bottom bar carry My Learn', async ({
    browser,
  }, testInfo) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      hasTouch: true,
    });
    const page = await context.newPage();
    await seedCookieDecision(page);
    for (const locale of ['en', 'ar'] as const) {
      const label = locale === 'en' ? 'My Learn' : 'تعلّمي';
      await page.goto(academyPath(locale === 'en' ? '/' : '/ar'));
      await expect(page.locator('html')).toHaveAttribute(
        'dir',
        locale === 'ar' ? 'rtl' : 'ltr'
      );
      const bottomBar = page.getByRole('navigation', {
        name: locale === 'en' ? 'Mobile navigation' : /./,
      });
      await expect(
        bottomBar.getByRole('link', { name: label }).first()
      ).toBeVisible({ timeout: 30_000 });

      await page.screenshot({
        path: testInfo.outputPath(`phone-bottom-bar-${locale}.png`),
      });
      await page
        .getByRole('button', {
          name: locale === 'en' ? 'Open menu' : 'فتح القائمة',
        })
        .tap();
      const sheet = page.getByRole('dialog');
      const sheetLink = sheet.getByRole('link', { name: label });
      await expect(sheetLink).toBeVisible();
      await expect(sheet).toHaveAttribute('data-state', 'open');
      await page.waitForTimeout(600); // the slide-in, for the screenshot only
      await expect(sheetLink).toHaveAttribute(
        'href',
        locale === 'en'
          ? /^\/sign-in\?returnTo=%2Fmy/
          : /^\/ar\/sign-in\?returnTo=%2Fmy/
      );
      await page.screenshot({
        path: testInfo.outputPath(`phone-sheet-${locale}.png`),
      });
      await sheetLink.tap();
      await expect(sheet).toHaveCount(0);
      await expect(page).toHaveURL(/sign-in\?returnTo=%2Fmy/);
    }
    await context.close();
  });
});
