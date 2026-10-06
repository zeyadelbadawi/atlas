/**
 * Shared Playwright setup for the theme baseline.
 *
 * DETERMINISM. A baseline is only useful if the same code renders the same
 * pixels on every run, so everything outside the fixture server is pinned:
 *   - Google Fonts (the app's real `@import` in `index.css`) is served from
 *     a committed cache (`fixtures/fonts/`, OFL-licensed files) instead of
 *     the network. A cache miss fails the page loudly; re-record with
 *     `THEME_BASELINE_RECORD_FONTS=1` (needs network access).
 *   - Every other off-origin request is aborted and reported.
 *   - The cookie-consent decision is pre-seeded, so the banner (a real
 *     first-visit surface, captured separately in `shared/first-visit`)
 *     doesn't cover every page.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as base, expect, type Page } from '@playwright/test';

const FONT_CACHE = join(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/fonts'
);
const RECORD_FONTS = process.env.THEME_BASELINE_RECORD_FONTS === '1';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

function fontCachePath(url: string): string {
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 16);
  const extension = url.includes('fonts.googleapis.com') ? 'css' : 'woff2';
  return join(FONT_CACHE, `${hash}.${extension}`);
}

const CONSENT = JSON.stringify({
  version: 1,
  necessary: true,
  preferences: false,
  decidedAt: '2026-09-01T09:00:00.000Z',
});

export interface BaselineOptions {
  /** Seed the cookie-consent decision before the page loads. */
  readonly seedConsent: boolean;
}

/** Everything a page did that a baseline run must not depend on or hide. */
export interface PageIssues {
  /** Off-origin requests that were blocked (anything but cached fonts). */
  readonly offOrigin: string[];
  /** API calls the fixture server has no fixture for. */
  readonly unmockedApi: string[];
  /** `securitypolicyviolation` events under the production CSP. */
  readonly cspViolations: string[];
  /** Uncaught page errors. */
  readonly pageErrors: string[];
}

export const test = base.extend<BaselineOptions & { issues: PageIssues }>({
  seedConsent: [true, { option: true }],
  issues: async ({}, use) => {
    await use({
      offOrigin: [],
      unmockedApi: [],
      cspViolations: [],
      pageErrors: [],
    });
  },
  page: async ({ page, seedConsent, issues, baseURL }, use) => {
    const origin = new URL(baseURL!).origin;
    const offOriginRequests = issues.offOrigin;

    page.on('pageerror', (error) => issues.pageErrors.push(error.message));
    page.on('response', (response) => {
      if (response.headers()['x-fixture-unmocked']) {
        issues.unmockedApi.push(
          `${response.request().method()} ${new URL(response.url()).pathname}`
        );
      }
    });
    await page.exposeFunction('__reportCspViolation', (detail: string) => {
      issues.cspViolations.push(detail);
    });
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (event) => {
        (
          window as unknown as { __reportCspViolation: (d: string) => void }
        ).__reportCspViolation(
          `${event.violatedDirective} ${event.blockedURI}`
        );
      });
    });

    if (seedConsent) {
      await page.addInitScript((consent) => {
        window.localStorage.setItem('atlas:cookie-consent', consent);
      }, CONSENT);
    }

    await page.route(
      (url) => url.origin !== origin,
      async (route) => {
        const url = route.request().url();
        const host = new URL(url).hostname;
        if (!FONT_HOSTS.includes(host)) {
          offOriginRequests.push(url);
          await route.abort('blockedbyclient');
          return;
        }
        const file = fontCachePath(url);
        if (existsSync(file)) {
          await route.fulfill({
            status: 200,
            contentType: file.endsWith('.css') ? 'text/css' : 'font/woff2',
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: readFileSync(file),
          });
          return;
        }
        if (!RECORD_FONTS) {
          offOriginRequests.push(`font cache miss: ${url}`);
          await route.abort('blockedbyclient');
          return;
        }
        const response = await route.fetch();
        mkdirSync(FONT_CACHE, { recursive: true });
        writeFileSync(file, await response.body());
        await route.fulfill({ response });
      }
    );

    await use(page);
  },
});

export { expect };

/**
 * Opens a fixture URL and waits until it has settled: network idle, web
 * fonts loaded, and the public runtime past its loading state.
 */
export async function openFixture(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('body')).not.toHaveAttribute('aria-busy', 'true');
  // Two animation frames so layout driven by `ResizeObserver`/state updates
  // after the last response has been painted.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
}

/**
 * Loads, decodes and paints every image before a full-page screenshot. A
 * full-page capture grows the viewport, which starts the lazy images below
 * the fold mid-shot: the capture then lands on the LQIP, or on the quick
 * lower-quality scale the compositor paints before upgrading a freshly
 * decoded photograph, both of which differ run to run. Scroll through the
 * page slowly enough for each lazy image to start loading and be painted at
 * its final scale, wait until every rendered image is complete and decoded,
 * and repeat until a pass finds nothing new; then return to the top.
 */
export async function settleImages(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const frame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const wait = (ms: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, ms));
    // Only images that take part in layout: a lazy image inside a hidden
    // container (the auth side plate on phones) never starts loading, and
    // `decode()` on it would never settle.
    const rendered = () =>
      Array.from(document.images).filter(
        (image) => image.getClientRects().length > 0
      );
    // Decode synchronously at paint time: with `decoding="async"` an image
    // whose decoded pixels were dropped while off screen paints blank on
    // the first frame of a beyond-viewport capture, and the LQIP shows.
    for (const image of Array.from(document.images)) image.decoding = 'sync';
    const step = Math.max(1, Math.floor(window.innerHeight / 2));
    const bottom = () =>
      Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const deadline = performance.now() + 20_000;
    let settled = '';
    for (let round = 0; round < 6 && performance.now() < deadline; round++) {
      for (let y = 0; y <= bottom(); y += step) {
        window.scrollTo(0, y);
        await frame();
        await frame();
        await wait(40);
      }
      window.scrollTo(0, bottom());
      await frame();
      await frame();
      await wait(40);
      // Lazy images start loading a frame or two after they scroll in.
      while (
        performance.now() < deadline &&
        rendered().some((image) => !image.complete)
      ) {
        await wait(50);
      }
      await Promise.all(
        rendered().map((image) =>
          Promise.race([image.decode().catch(() => undefined), wait(2_000)])
        )
      );
      const signature = rendered()
        .map((image) => `${image.currentSrc}:${image.complete ? 1 : 0}`)
        .join('|');
      if (signature === settled) break;
      settled = signature;
    }
    window.scrollTo(0, 0);
    const broken = rendered()
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src);
    if (broken.length > 0) {
      throw new Error(`images failed to load: ${broken.join(', ')}`);
    }
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
}

/** Asserts the page rendered without depending on anything outside the fixture. */
export function expectNoIssues(issues: PageIssues): void {
  expect(issues.unmockedApi, 'API calls with no fixture').toEqual([]);
  expect(issues.cspViolations, 'CSP violations').toEqual([]);
  expect(issues.offOrigin, 'blocked off-origin requests').toEqual([]);
  expect(issues.pageErrors, 'uncaught page errors').toEqual([]);
}
