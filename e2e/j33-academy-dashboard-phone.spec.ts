/**
 * J33 — the Academy dashboard fits a phone (found by the J27–J32 sweep):
 * the welcome card's button row used to push the page to 442px at a
 * 390px viewport, in English and Arabic.
 */
import { test, expect } from '@playwright/test';
import {
  SEED,
  requireSeed,
  seedCookieDecision,
  signInThroughDashboard,
} from './support/atlas';
test('J33 — the academy dashboard has no sideways scroll at 390px (EN and AR)', async ({
  page,
  request,
}) => {
  const { academyId } = await requireSeed(request);
  await page.setViewportSize({ width: 390, height: 844 });
  await seedCookieDecision(page);
  await signInThroughDashboard(page, SEED.owner, SEED.password);
  await page.waitForURL(/dashboard/);
  for (const lang of ['en', 'ar']) {
    await page.goto(`/dashboard/academy/${academyId}`);
    await page.evaluate(
      (l) => localStorage.setItem('atlas:language', JSON.stringify(l)),
      lang
    );
    await page.reload();
    await expect(page.getByTestId('academy-website-status')).toBeVisible({
      timeout: 60_000,
    });
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(w).toBeLessThanOrEqual(390);
  }
  await page.evaluate(() =>
    localStorage.setItem('atlas:language', JSON.stringify('en'))
  );
});
