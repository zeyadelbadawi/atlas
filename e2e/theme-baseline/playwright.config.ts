/**
 * Theme baseline (Theme 1 plan, Phase 0) — screenshot matrix, axe, and
 * palette-injection checks against the fixture server.
 *
 * Separate from the root `playwright.config.ts` on purpose: those journeys
 * run against the real stack (dev servers + PostgreSQL); this suite needs
 * no backend or database at all. It renders a real minified build through
 * the unmodified public runtime with fixture data (see
 * `server/fixture-server.mjs`).
 *
 *   pnpm theme-baseline:build        # once per code change
 *   pnpm test:theme-baseline         # compare against the committed baseline
 *   pnpm test:theme-baseline --update-snapshots   # re-record (review the diff!)
 *
 * Chromium: set THEME_BASELINE_CHROMIUM to a Chromium/Chrome executable, or
 * leave it unset to use Playwright's own browser.
 */
import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.THEME_BASELINE_PORT ?? 4173);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const executablePath = process.env.THEME_BASELINE_CHROMIUM || undefined;

export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.ts$/,
  outputDir: './.results/test-output',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI
    ? [['github'], ['list']]
    : [
        ['list'],
        ['html', { outputFolder: './.results/report', open: 'never' }],
      ],
  timeout: 60_000,
  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      // Anti-aliasing noise only; any real layout or colour change is far
      // larger than 0.1% of a full page.
      maxDiffPixelRatio: 0.001,
    },
  },
  use: {
    baseURL: BASE_URL,
    browserName: 'chromium',
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'UTC',
    launchOptions: executablePath ? { executablePath } : {},
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: {
    command: `node server/fixture-server.mjs --port ${PORT}`,
    cwd: '.',
    url: `${BASE_URL}/__fixture/report`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
