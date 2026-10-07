/**
 * Riwaq (Theme 4) quality gates (Reports/THEME_4_RIWAQ_PLAN.md §8, §9),
 * against the real minified build and the production CSP:
 *
 * - axe (WCAG 2.2 AA + best practice): ZERO violations on every Riwaq page,
 *   EN and AR, at 1440 and 390, new / rich / unpublished — asserted, not
 *   recorded;
 * - no horizontal overflow at 390 / 430 / 768 / 1024 / 1280 / 1440 / 1920;
 * - keyboard: the programme explorer, the bottom-sheet menu, the catalogue
 *   filter sheet and the FAQ disclosures work without a pointer, and focus
 *   stays visible;
 * - reduced motion: every window, column and figure is drawn in its final
 *   state (nothing hidden waiting for an animation); with motion allowed,
 *   the shutters open and the figures end on their real values.
 */
import AxeBuilder from '@axe-core/playwright';
import {
  LOCALES,
  RIWAQ_COMING_SOON,
  RIWAQ_PAGES,
  THEMED_PAGES,
  fixtureSlug,
  fixtureUrl,
  type BaselinePage,
  type DataState,
} from './matrix';
import {
  expect,
  expectNoIssues,
  openFixture,
  settleImages,
  test,
} from './support/baseline-test';
import type { Page } from '@playwright/test';

const AXE_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];

const HOME: BaselinePage = { name: 'home', path: '/' };
const COURSES: BaselinePage = { name: 'courses', path: '/courses' };
const FAQS: BaselinePage = { name: 'faqs', path: '/faqs' };
const DETAILS: BaselinePage = {
  name: 'course-details',
  path: '/courses/fx-course-1',
};

const CASES: { state: DataState; page: BaselinePage }[] = [
  ...THEMED_PAGES.new.map((page) => ({ state: 'new' as const, page })),
  ...THEMED_PAGES.rich.map((page) => ({ state: 'rich' as const, page })),
  ...RIWAQ_PAGES.map((page) => ({ state: 'rich' as const, page })),
  { state: RIWAQ_COMING_SOON.state, page: RIWAQ_COMING_SOON.page },
];

async function violations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return results.violations.map((violation) => ({
    id: violation.id,
    help: violation.help,
    targets: violation.nodes.slice(0, 3).map((node) => node.target.join(' ')),
  }));
}

async function overflow(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
}

test.describe('riwaq axe', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });
  test.slow();

  for (const viewport of [
    { name: '1440', width: 1440, height: 900 },
    { name: '390', width: 390, height: 844 },
  ]) {
    for (const { state, page } of CASES) {
      for (const locale of LOCALES) {
        test(`${state} ${page.name} ${locale} ${viewport.name}`, async ({
          page: browserPage,
          issues,
        }) => {
          await browserPage.setViewportSize(viewport);
          await openFixture(
            browserPage,
            fixtureUrl(page, locale, fixtureSlug('riwaq', state))
          );
          await settleImages(browserPage);
          expect(await violations(browserPage)).toEqual([]);
          expectNoIssues(issues);
        });
      }
    }
  }
});

test.describe('riwaq layout', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  for (const width of [390, 430, 768, 1024, 1280, 1440, 1920]) {
    for (const page of [HOME, COURSES, DETAILS, ...RIWAQ_PAGES]) {
      for (const locale of LOCALES) {
        test(`no horizontal overflow: ${page.name} ${locale} ${width}`, async ({
          page: browserPage,
          issues,
        }) => {
          await browserPage.setViewportSize({ width, height: 900 });
          await openFixture(
            browserPage,
            fixtureUrl(page, locale, fixtureSlug('riwaq', 'rich'))
          );
          expect(await overflow(browserPage)).toBe(0);
          expectNoIssues(issues);
        });
      }
    }
  }
});

test.describe('riwaq keyboard', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('the programme explorer opens programmes from the keyboard', async ({
    page,
    issues,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openFixture(page, fixtureUrl(HOME, 'en', fixtureSlug('riwaq', 'rich')));
    const rows = page.locator('[data-explorer] .rwx-row');
    await expect(rows.first()).toHaveAttribute('aria-expanded', 'true');
    await rows.nth(1).focus();
    await page.keyboard.press('Enter');
    await expect(rows.nth(1)).toHaveAttribute('aria-expanded', 'true');
    await expect(rows.first()).toHaveAttribute('aria-expanded', 'false');
    // Side by side, the open programme stays open (one is always shown).
    await page.keyboard.press('Space');
    await expect(rows.nth(1)).toHaveAttribute('aria-expanded', 'true');
    const panelId = (await rows.nth(1).getAttribute('aria-controls')) ?? '';
    const panel = page.locator(`[id="${panelId}"]`);
    await expect(panel).toBeVisible();
    // The focused row draws a visible focus ring.
    const outline = await rows.nth(1).evaluate(
      (element) => getComputedStyle(element).outlineStyle
    );
    expect(outline).not.toBe('none');
    expectNoIssues(issues);
  });

  test('the phone menu is a bottom sheet that traps focus and returns it', async ({
    page,
    issues,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openFixture(page, fixtureUrl(HOME, 'en', fixtureSlug('riwaq', 'rich')));
    const trigger = page.getByRole('button', { name: /open menu/i });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const sheet = page.locator('[data-riwaq-menu]');
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();
    // Anchored to the bottom of the viewport, within thumb reach.
    expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(844);
    for (let i = 0; i < 12; i += 1) await page.keyboard.press('Tab');
    expect(
      await page.evaluate(() =>
        !!document.activeElement?.closest('[data-riwaq-menu]')
      )
    ).toBe(true);
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(trigger).toBeFocused();
    expectNoIssues(issues);
  });

  test('catalogue filters open as a sheet on phones and filter the list', async ({
    page,
    issues,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openFixture(page, fixtureUrl(COURSES, 'en', fixtureSlug('riwaq', 'rich')));
    await page.getByRole('button', { name: /^Filters/ }).click();
    const department = page
      .getByRole('dialog')
      .getByRole('button', { name: /Design/ })
      .first();
    await department.focus();
    await page.keyboard.press('Enter');
    await expect(department).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('button', { name: /Remove filter/ })).toBeVisible();
    expectNoIssues(issues);
  });

  test('FAQ questions open and close from the keyboard', async ({ page, issues }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openFixture(page, fixtureUrl(FAQS, 'en', fixtureSlug('riwaq', 'rich')));
    const trigger = page.locator('.rwq-trigger').first();
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expectNoIssues(issues);
  });
});

test.describe('riwaq motion', () => {
  test('reduced motion: everything is drawn in its final state', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await openFixture(page, fixtureUrl(HOME, 'en', fixtureSlug('riwaq', 'rich')));
    // Nothing waits for an entrance: no shutter is closed, no reveal pending.
    expect(await page.locator('[data-reveal="pending"]').count()).toBe(0);
    // The hero's columns are standing (no running animation).
    const animations = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((animation) => animation.playState === 'running').length
    );
    expect(animations).toBe(0);
    // The figures show their real values at once.
    const figures = await page.locator('.rwl-figure').allTextContents();
    expect(figures.length).toBeGreaterThan(1);
    for (const figure of figures) expect(figure).not.toBe('0');
    await context.close();
  });

  test('with motion: shutters open and figures end on their real values', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      reducedMotion: 'no-preference',
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await openFixture(page, fixtureUrl(HOME, 'en', fixtureSlug('riwaq', 'rich')));
    const sr = await page.locator('.rwl-figure-cell .rw-sr-only').allTextContents();
    await settleImages(page);
    await page.locator('.rwl-figures').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1600);
    expect(await page.locator('[data-reveal="pending"]').count()).toBe(0);
    const shown = await page.locator('.rwl-figure').allTextContents();
    expect(shown).toEqual(sr);
    await context.close();
  });
});
