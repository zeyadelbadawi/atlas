/**
 * J49 — the platform host's holding page (owner decision D6), Chromium.
 *
 * The legacy marketing site is retired. On the platform host (the plain
 * dashboard origin, no academy preview selector):
 *
 *  - `/` (English) and `/ar` (Arabic, RTL) show the holding page: the
 *    product name, one factual sentence and exactly four links — sign in,
 *    contact (sales topic), Privacy Policy, Terms — plus the language
 *    switch; `noindex, follow`; title "Atlas"; no sign-up call to action,
 *    prices, "free" or testimonials; no sideways scroll on a phone;
 *  - the retired marketing addresses (`/features`, `/pricing`, their
 *    `/ar/` twins) and the old `/#contact` anchor forward, replacing the
 *    history entry, and never loop;
 *  - the kept pages still render: contact, privacy policy, terms, sign-in,
 *    and their header no longer links to a marketing page.
 *
 * Read-only: nothing is submitted and no account is created.
 */
import { test, expect, type Page } from '@playwright/test';
import { seedCookieDecision } from './support/atlas';

const PHONE = { width: 360, height: 780 };

async function openFresh(page: Page, path: string): Promise<void> {
  await seedCookieDecision(page);
  await page.goto(path);
  await expect(page.getByTestId('holding-page')).toBeVisible({
    timeout: 60_000,
  });
}

async function holdingLinks(page: Page): Promise<string[]> {
  return page
    .getByTestId('holding-page')
    .locator('a')
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute('href') ?? '')
    );
}

test.describe('J49 — platform holding page (D6)', () => {
  for (const { path, lang, dir, sentence, other } of [
    {
      path: '/',
      lang: 'en',
      dir: 'ltr',
      sentence: 'Atlas is a platform for running an online academy.',
      other: '/ar',
    },
    {
      path: '/ar',
      lang: 'ar',
      dir: 'rtl',
      sentence: 'أطلس منصة لإدارة أكاديمية عبر الإنترنت.',
      other: '/',
    },
  ]) {
    test(`${path}: only the allowed links, noindex, ${dir}`, async ({
      page,
    }) => {
      await page.setViewportSize(PHONE);
      await openFresh(page, path);
      const holding = page.getByTestId('holding-page');
      await expect(holding).toHaveAttribute('lang', lang);
      await expect(page.locator('html')).toHaveAttribute('dir', dir);
      await expect(holding).toContainText(sentence);
      await expect(page).toHaveTitle('Atlas');
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex, follow'
      );
      expect((await holdingLinks(page)).sort()).toEqual(
        [
          other,
          '/auth/sign-in',
          '/contact?topic=sales',
          '/privacy-policy',
          '/terms',
        ].sort()
      );
      const text = await holding.innerText();
      expect(text).not.toMatch(/free|pricing|testimonial|get started/i);
      expect(text).not.toMatch(/مجان|ابدأ الآن|الأسعار/);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test('the language switch moves between / and /ar', async ({ page }) => {
    await openFresh(page, '/');
    await page.getByRole('link', { name: 'العربية' }).click();
    await expect(page).toHaveURL(/\/ar$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.getByRole('link', { name: 'English' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });

  for (const [from, to] of [
    ['/features', /\/$/],
    ['/pricing', /\/$/],
    ['/ar/features', /\/ar$/],
    ['/ar/pricing', /\/ar$/],
    ['/#contact', /\/contact$/],
    ['/ar/contact', /\/contact$/],
  ] as const) {
    test(`${from} forwards without a 404 or a loop`, async ({ page }) => {
      await seedCookieDecision(page);
      await page.goto('about:blank');
      await page.goto(from);
      await expect(page).toHaveURL(to, { timeout: 60_000 });
      // Replaced, not pushed: Back leaves the site instead of bouncing.
      await page.goBack();
      await expect(page).toHaveURL('about:blank');
    });
  }

  test('the kept pages still render, and their header links no marketing page', async ({
    page,
  }) => {
    await seedCookieDecision(page);
    await page.goto('/contact');
    await expect(page.locator('#contact form')).toBeVisible({
      timeout: 60_000,
    });
    const headerLinks = await page
      .locator('header a, footer a')
      .evaluateAll((links) =>
        links.map((link) => link.getAttribute('href') ?? '')
      );
    expect(headerLinks).not.toContain('/features');
    expect(headerLinks).not.toContain('/pricing');
    expect(headerLinks).not.toContain('/auth/register');
    await page.goto('/privacy-policy');
    await expect(page.locator('article').first()).toBeVisible({
      timeout: 60_000,
    });
    await page.goto('/terms');
    await expect(page.locator('#trials')).toBeVisible({ timeout: 60_000 });
    await page.goto('/auth/sign-in');
    await expect(page.locator('input[type="email"]')).toBeVisible({
      timeout: 60_000,
    });
  });
});
