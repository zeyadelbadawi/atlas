/**
 * Playwright — P64 Phase 1 journeys J2 and J3 (master plan Phase 1 §P).
 *
 * These run against the REAL running stack: the Vite dev server on :3001
 * and the Nest API on :3000, with the real PostgreSQL behind it. Nothing
 * is mocked, because the whole point of these two journeys is the
 * behaviour that only exists when the guard, the database policies and
 * the router all run together — a mocked API would assert the mock.
 *
 * Chrome is used through `channel: 'chrome'` rather than a downloaded
 * Chromium: the surfaces under test are ordinary DOM and the machine
 * already has the browser the product is validated in, so this avoids a
 * multi-hundred-megabyte download for no added fidelity.
 *
 * Both servers must already be running (`npm run dev` here and in
 * atlas-backend). The config does not start them: they are long-lived
 * development servers shared with the rest of the work, and having the
 * test runner own their lifecycle would kill them out from under it.
 */
import { defineConfig, devices } from '@playwright/test';

const FRONTEND = process.env.E2E_BASE_URL ?? 'http://localhost:3001';

export default defineConfig({
  testDir: './e2e',
  // Clears the auth rate-limiter first; see the setup file's own comment.
  globalSetup: './e2e/support/global-setup.ts',
  // Each journey seeds its own accounts through the real API, so files can
  // run in parallel; tests WITHIN a file share the accounts they created
  // and run in order.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: FRONTEND,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
});
