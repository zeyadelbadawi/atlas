/**
 * J10 — real-user monitoring (P6), in Chromium against the real stack.
 *
 * Needs the stack started with RUM on: the app with VITE_RUM_SAMPLE_RATE=1,
 * the API with RUM_ENABLED=true and a local METRICS_SCRAPE_TOKEN whose
 * value is in the file E2E_METRICS_TOKEN_FILE (to read /metrics back).
 * Without that the suite is skipped and says why.
 *
 * Proves: a visit sends LCP/CLS (and INP after an interaction) with only
 * the page template and device class — no URL, slug, query or id; the
 * API records them as histograms; a visitor sending Global Privacy
 * Control is not measured; a hostile beacon cannot create labels.
 */
import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { academyPath, seedCookieDecision } from './support/atlas';

const TOKEN_FILE = process.env.E2E_METRICS_TOKEN_FILE;
const API_ORIGIN = new URL(process.env.E2E_API_BASE_URL ?? 'http://localhost:3000/api/v1').origin;

test.skip(!TOKEN_FILE, 'RUM journeys need the stack started with RUM on (see the file header).');

async function metricsText(request: import('@playwright/test').APIRequestContext) {
  const token = readFileSync(TOKEN_FILE!, 'utf8').trim();
  const response = await request.get(`${API_ORIGIN}/metrics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status()).toBe(200);
  return response.text();
}

function sampleCount(text: string, metric: string, route: string, device: string): number {
  const line = text
    .split('\n')
    .find((l) => l.startsWith(`${metric}_count{`) && l.includes(`route="${route}"`) && l.includes(`device="${device}"`));
  return line ? Number(line.split(' ').pop()) : 0;
}

/** Visits a page, interacts once, then leaves it; returns the beacon bodies sent. */
async function visitAndLeave(page: Page, path: string): Promise<string[]> {
  const beacons: string[] = [];
  // Intercepted (then passed on unchanged): a beacon's body is visible to
  // the route handler, not to a plain request listener.
  await page.route('**/rum/vitals', async (route) => {
    beacons.push(route.request().postDataBuffer()?.toString('utf8') ?? '');
    await route.continue();
  });
  await seedCookieDecision(page);
  await page.goto(academyPath(path));
  await page.waitForLoadState('networkidle');
  // One interaction, so INP has something to measure.
  await page.locator('main').click({ position: { x: 5, y: 5 } });
  await page.waitForTimeout(500);
  // Leaving the page is when final values are reported.
  await page.goto('about:blank');
  await expect.poll(() => beacons.length, { timeout: 10_000 }).toBeGreaterThan(0);
  return beacons;
}

test.describe('J10 — real-user monitoring', () => {
  test('desktop visit: LCP/CLS/INP with the page template only, recorded by the API', async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const count = (text: string, metric: string) => sampleCount(text, metric, 'public:courses', 'desktop');
    const before = await metricsText(request);
    const beacons = await visitAndLeave(page, '/courses');
    // What the browser sent (LCP is final at the first interaction, so it is
    // caught here; CLS/INP leave as the page unloads, when the interceptor
    // has detached — the API below is the witness for those).
    const samples = beacons.flatMap((b) => (JSON.parse(b) as { samples: Record<string, unknown>[] }).samples);
    expect(samples.map((s) => s.metric)).toContain('LCP');
    for (const sample of samples) {
      expect(Object.keys(sample).sort()).toEqual(['device', 'metric', 'route', 'value']);
      expect(sample).toMatchObject({ route: 'public:courses', device: 'desktop' });
    }
    expect(beacons.join('')).not.toMatch(/__atlas_academy_preview|courses\?|http/);

    // What the API recorded: one more of each for this page template.
    for (const metric of ['atlas_rum_lcp_seconds', 'atlas_rum_cls', 'atlas_rum_inp_seconds']) {
      await expect
        .poll(async () => count(await metricsText(request), metric), { message: metric })
        .toBe(count(before, metric) + 1);
    }
  });

  test('phone-sized visit is labelled mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const beacons = await visitAndLeave(page, '/');
    const [first] = (JSON.parse(beacons[0]) as { samples: Record<string, unknown>[] }).samples;
    expect(first).toMatchObject({ route: 'public:home', device: 'mobile' });
  });

  test('Global Privacy Control: nothing is measured or sent', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true });
    });
    const beacons: string[] = [];
    let libraryLoaded = false;
    page.on('request', (request) => {
      if (request.url().includes('/rum/vitals')) beacons.push(request.url());
      if (request.url().includes('web-vitals')) libraryLoaded = true;
    });
    await seedCookieDecision(page);
    await page.goto(academyPath('/'));
    await page.waitForLoadState('networkidle');
    await page.goto('about:blank');
    await page.waitForTimeout(1_500);
    expect(beacons).toEqual([]);
    expect(libraryLoaded).toBe(false);
  });

  test('a hostile beacon cannot create labels or carry data', async ({ request }) => {
    const response = await request.post(`${API_ORIGIN}/api/v1/rum/vitals`, {
      data: {
        samples: [
          { metric: 'LCP', value: 1234, route: '/my/courses/123?email=victim@example.com', device: 'desktop', userId: 'u1' },
          { metric: 'EVIL', value: 1, route: 'public:home', device: 'desktop' },
          { metric: 'INP', value: 1e9, route: 'public:home', device: 'desktop' },
        ],
      },
    });
    expect(response.status()).toBe(204);
    const rumLines = (await metricsText(request))
      .split('\n')
      .filter((line) => line.startsWith('atlas_rum_'));
    expect(rumLines.join('\n')).not.toMatch(/victim|email|EVIL|\/my\/courses|userId/);
    const routes = new Set(rumLines.map((line) => /route="([^"]*)"/.exec(line)?.[1]).filter(Boolean));
    for (const route of routes) expect(route).toMatch(/^(public|app):[a-z]+$/);
  });
});
