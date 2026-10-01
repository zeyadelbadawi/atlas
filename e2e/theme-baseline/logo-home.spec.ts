/**
 * Theme 1 — the Academy logo leads to the Academy's own Home page, and the
 * skip link lands past the header (audit F-7). In a real browser, on the
 * production build, at desktop and phone widths, in English and Arabic.
 *
 * The fixture Academy is addressed by the dev preview parameter instead
 * of a hostname; the public link renderer carries it on every link, the
 * same way a real hostname carries the Academy on production.
 */
import { fixtureSlug, fixtureUrl } from './matrix';
import {
  expect,
  expectNoIssues,
  openFixture,
  test,
} from './support/baseline-test';

const SLUG = fixtureSlug('modern-education', 'rich');
const COURSES = { name: 'courses', path: '/courses' };
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
] as const;
const HOME_NAME = {
  en: /^.+ home$/,
  ar: /^الصفحة الرئيسية لـ .+$/,
} as const;

for (const viewport of VIEWPORTS) {
  for (const locale of ['en', 'ar'] as const) {
    test.describe(`logo → Home, ${viewport.name}, ${locale}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
      });

      test('the logo is a visible link to this Academy’s Home', async ({
        page,
        issues,
      }) => {
        await openFixture(page, fixtureUrl(COURSES, locale, SLUG));
        const logo = page
          .locator('header')
          .getByRole('link', { name: HOME_NAME[locale] });
        await expect(logo).toBeVisible();

        // Placed at the reading start of the bar: left in English, right
        // in Arabic.
        const box = (await logo.boundingBox())!;
        const centre = box.x + box.width / 2;
        if (locale === 'en') expect(centre).toBeLessThan(viewport.width / 2);
        else expect(centre).toBeGreaterThan(viewport.width / 2);

        await logo.click();
        const url = new URL(page.url());
        expect(url.pathname).toBe(locale === 'en' ? '/' : '/ar');
        // Still this Academy (the fixture's identity rides on the URL).
        expect(url.searchParams.get('__atlas_academy_preview')).toBe(SLUG);
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.locator('html')).toHaveAttribute(
          'dir',
          locale === 'en' ? 'ltr' : 'rtl'
        );
        // Home has its one top-level heading.
        await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
        expectNoIssues(issues);
      });

      test('on Home, the logo marks itself current and clicking it keeps Home', async ({
        page,
        issues,
      }) => {
        await openFixture(
          page,
          fixtureUrl({ name: 'home', path: '/' }, locale, SLUG)
        );
        const logo = page
          .locator('header')
          .getByRole('link', { name: HOME_NAME[locale] });
        await expect(logo).toHaveAttribute('aria-current', 'page');
        await logo.click();
        expect(new URL(page.url()).pathname).toBe(
          locale === 'en' ? '/' : '/ar'
        );
        expectNoIssues(issues);
      });
    });
  }
}

test.describe('keyboard', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('skip link first, then the logo with a visible focus ring; the skip link lands on <main>', async ({
    page,
  }) => {
    await openFixture(page, fixtureUrl(COURSES, 'en', SLUG));

    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();

    await page.keyboard.press('Tab');
    const logo = page
      .locator('header')
      .getByRole('link', { name: HOME_NAME.en });
    await expect(logo).toBeFocused();
    const outline = await logo.evaluate(
      (element) => getComputedStyle(element).outlineStyle
    );
    expect(outline).not.toBe('none');

    // Back to the skip link, and follow it: focus lands past the header.
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Enter');
    await expect(page.locator('main#main-content')).toBeFocused();
  });
});
