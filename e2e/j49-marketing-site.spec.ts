/**
 * J49 — the platform host's static marketing site (B1 / M1a, DL-50),
 * Chromium. Replaces the D6 holding-page journey.
 *
 * Needs the static build: run against `pnpm build && pnpm exec vite preview
 * --port 3002` (E2E_BASE_URL=http://localhost:3002), whose server routes
 * exactly as the Caddyfile does (src/marketing/prerender/routing.ts) —
 * hence `@production-build`, like J45. The dev server renders the same
 * pages live, so it passes there too, but the build is what ships.
 *
 *  - `/`, `/ar`, `/pricing`, `/ar/pricing` are complete without JavaScript:
 *    200 HTML, `lang`/`dir`, a title naming Atlas, one H1, self canonical,
 *    the hreflang trio, and indexable (no robots noindex, meta or header);
 *  - a trailing slash is one 301; planned feature pages and `/blog` are a
 *    real 404 with the branded page (Arabic under `/ar`);
 *  - app routes are still the single-page app, and a marketing page reached
 *    INSIDE the app reloads once into the static page;
 *  - robots.txt, llms.txt and pricing.md are served as text.
 *
 * Read-only: nothing is submitted and no account is created.
 */
import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/', lang: 'en', dir: 'ltr', brand: 'Atlas' },
  { path: '/ar', lang: 'ar', dir: 'rtl', brand: 'أطلس' },
  { path: '/pricing', lang: 'en', dir: 'ltr', brand: 'Atlas' },
  { path: '/ar/pricing', lang: 'ar', dir: 'rtl', brand: 'أطلس' },
] as const;

test.describe('J49 — static marketing site @production-build', () => {
  for (const { path, lang, dir, brand } of PAGES) {
    test(`${path} is complete, indexable HTML without JavaScript`, async ({
      browser,
    }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      expect(response?.headers()['content-type']).toContain('text/html');
      expect(response?.headers()['x-robots-tag'] ?? '').not.toMatch(/noindex/);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page.locator('html')).toHaveAttribute('dir', dir);
      await expect(page).toHaveTitle(new RegExp(brand));
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('#root')).toHaveCount(0);
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
      const canonical = await page
        .locator('link[rel="canonical"]')
        .getAttribute('href');
      expect(new URL(canonical ?? '').pathname).toBe(path);
      const hreflangs = await page
        .locator('link[rel="alternate"][hreflang]')
        .evaluateAll((links) => links.map((l) => l.getAttribute('hreflang')));
      expect(hreflangs).toEqual(['en', 'ar', 'x-default']);
      // CSP `script-src 'self'`: external scripts and JSON-LD data only.
      const inline = await page
        .locator('script:not([src]):not([type="application/ld+json"])')
        .count();
      expect(inline).toBe(0);
      await context.close();
    });
  }

  test('a trailing slash is one 301 to the slash-less URL', async ({
    request,
  }) => {
    for (const [from, to] of [
      ['/ar/', '/ar'],
      ['/pricing/?utm_source=x', '/pricing?utm_source=x'],
    ]) {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status(), from).toBe(301);
      expect(
        new URL(response.headers().location, 'http://x').pathname +
          new URL(response.headers().location, 'http://x').search
      ).toBe(to);
    }
  });

  test('planned pages and the blog are a real, branded 404', async ({
    request,
  }) => {
    for (const [path, lang] of [
      ['/features/payments', 'en'],
      ['/features/academy-website', 'en'],
      ['/blog', 'en'],
      ['/ar/features/payments', 'ar'],
      ['/ar/does-not-exist', 'ar'],
    ]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(404);
      const html = await response.text();
      expect(html, path).toContain(`<html lang="${lang}"`);
      expect(html, path).toMatch(
        /<meta name="robots" content="noindex, follow">/
      );
    }
  });

  test('app routes are still the single-page app', async ({ request }) => {
    for (const path of [
      '/dashboard',
      '/auth/sign-in',
      '/auth/register?plan=starter',
      '/index.html',
    ]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(await response.text(), path).toContain('id="root"');
    }
  });

  test('a marketing page reached inside the app reloads once into the static page', async ({
    page,
  }) => {
    await page.goto('/auth/sign-in');
    await expect(page.locator('input[type="email"]')).toBeVisible({
      timeout: 60_000,
    });
    // An in-app navigation to `/` (as the logo link does).
    await Promise.all([
      page.waitForEvent('load'),
      page.evaluate(() => {
        window.history.pushState({}, '', '/pricing');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }),
    ]);
    await expect(page).toHaveURL(/\/pricing$/);
    await expect(page.locator('body.mk')).toHaveCount(1);
    await expect(page.locator('#root')).toHaveCount(0);
  });

  test('robots.txt, llms.txt and pricing.md are text', async ({ request }) => {
    const robots = await request.get('/robots.txt');
    expect(robots.headers()['content-type']).toContain('text/plain');
    expect(await robots.text()).toMatch(
      /^Sitemap: https:\/\/.+\/sitemap\.xml$/m
    );
    const llms = await request.get('/llms.txt');
    expect(llms.status()).toBe(200);
    expect(await llms.text()).toMatch(/^# /);
    const pricing = await request.get('/pricing.md');
    expect(pricing.headers()['content-type']).toContain('text/markdown');
    expect(await pricing.text()).toContain(
      '| Plan | Monthly | Yearly | Trial |'
    );
  });
});
