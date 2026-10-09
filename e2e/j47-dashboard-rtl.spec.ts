/**
 * J47 — the management dashboard is right-to-left everywhere in Arabic.
 *
 * Radix primitives do not read the document's `dir`; without a
 * `DirectionProvider` several of them (Tabs, Toggle Group, Radio Group,
 * Scroll Area, menus…) write `dir="ltr"` onto their own root, which turned
 * everything inside a tab — whole profile pages, the members table — LTR in
 * Arabic. This journey crawls the dashboard as the Organization Owner and as
 * the Platform Owner, in Arabic: every sidebar destination, and every tab on
 * each page, must contain no element forced to `ltr` except fields whose
 * content is inherently left-to-right (email, URL, phone, code).
 *
 * It also checks the shared Switch: its "on" thumb must stay inside the track
 * in Arabic (it used to be pushed out of it).
 */
import { expect, test, type Page } from '@playwright/test';
import {
  SEED,
  seedCookieDecision,
  signInThroughDashboard,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import { setStoredLanguage } from './support/evidence';
import { PLATFORM_OWNER_EMAIL } from './support/phase4';

test.describe.configure({ timeout: 1_500_000 });

/** Elements whose own `dir="ltr"` is legitimate (inherently LTR content). */
const ALLOWED_LTR = [
  'input[type="email"]',
  'input[type="url"]',
  'input[type="tel"]',
  'input[type="password"]',
  // The English half of a bilingual content field.
  'input[lang="en"]',
  'textarea[lang="en"]',
  'code',
  'pre',
  'kbd',
  '[data-ltr-content]',
].join(',');

async function signInArabic(page: Page, email: string) {
  await clearAuthRateLimits();
  await seedCookieDecision(page);
  await signInThroughDashboard(page, email, SEED.password);
  await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
  // The helper drives the English sign-in form; switch to Arabic after.
  await setStoredLanguage(page, 'ar');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl', {
    timeout: 30_000,
  });
}

/** Every element forced to LTR inside the page body, minus the allowed ones. */
async function ltrLeaks(page: Page): Promise<string[]> {
  return page.evaluate((allowed) => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll('[dir="ltr"]'))) {
      if (el.matches(allowed) || el.closest(allowed)) continue;
      // Inside main content or a portalled layer (dialog, popover).
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute('role') ?? '';
      const text = (el.textContent ?? '').trim().slice(0, 40);
      out.push(`${tag}${role ? `[role=${role}]` : ''} "${text}"`);
    }
    return out;
  }, ALLOWED_LTR);
}

async function sidebarDestinations(page: Page): Promise<string[]> {
  const hrefs = await page
    .locator('aside a[href^="/dashboard"], nav a[href^="/dashboard"]')
    .evaluateAll((links) =>
      links.map(
        (link) => (link as HTMLAnchorElement).getAttribute('href') ?? ''
      )
    );
  return [...new Set(hrefs.filter(Boolean))];
}

async function auditPage(
  page: Page,
  path: string,
  leaks: Record<string, string[]>
) {
  const started = Date.now();
  console.log(`[j47] → ${path}`);
  await page.goto(path);
  // Full-screen pages (wizards, editors) have no <main>; audit the body then.
  await page
    .locator('main')
    .first()
    .waitFor({ timeout: 20_000 })
    .catch(() => undefined);
  await page
    .waitForLoadState('networkidle', { timeout: 10_000 })
    .catch(() => undefined);
  const found = new Set(await ltrLeaks(page));
  // Every tab on the page (its panel is only rendered when selected).
  const tabs = page.locator('[role="tab"]');
  const count = await tabs.count();
  for (let index = 0; index < count; index += 1) {
    const tab = tabs.nth(index);
    if (!(await tab.isVisible()) || (await tab.isDisabled())) continue;
    const clicked = await tab
      .click({ timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (!clicked) continue;
    await page.waitForTimeout(300);
    for (const leak of await ltrLeaks(page)) found.add(leak);
  }
  if (found.size > 0) leaks[path] = [...found];
  console.log(`[j47] ${path} ${Date.now() - started}ms ${found.size} leak(s)`);
}

for (const [label, email] of [
  ['Organization Owner', SEED.owner],
  ['Platform Owner', PLATFORM_OWNER_EMAIL],
] as const) {
  test(`${label}: no left-to-right leak anywhere in the Arabic dashboard`, async ({
    page,
  }) => {
    await signInArabic(page, email);
    const visited = new Set<string>();
    const queue = await sidebarDestinations(page);
    // The account pages reached from the header menu.
    queue.push('/dashboard/profile', '/dashboard/notifications');
    const leaks: Record<string, string[]> = {};
    while (queue.length > 0) {
      const path = queue.shift()!;
      if (visited.has(path)) continue;
      visited.add(path);
      await auditPage(page, path, leaks);
      // Academy pages reveal their own sidebar section once opened.
      for (const next of await sidebarDestinations(page)) {
        if (!visited.has(next) && !queue.includes(next)) queue.push(next);
      }
    }
    test.info().annotations.push({
      type: 'pages',
      description: `${visited.size} pages audited`,
    });
    expect(visited.size).toBeGreaterThan(5);
    expect(leaks).toEqual({});
  });
}

test('the Switch thumb stays inside its track in Arabic and in English', async ({
  page,
}) => {
  await signInArabic(page, SEED.owner);
  // Website → Pages lists every page with a visibility switch.
  const academyLink = page.locator('a[href^="/dashboard/academy/"]').first();
  await academyLink.waitFor({ timeout: 60_000 });
  const href = (await academyLink.getAttribute('href', { timeout: 10_000 }))!;
  const academyId = href.split('/')[3];

  for (const language of ['ar', 'en'] as const) {
    await setStoredLanguage(page, language);
    await page.goto(`/dashboard/academy/${academyId}/website/pages`);
    const switches = page.locator('main button[role="switch"]');
    await expect(switches.first()).toBeVisible({ timeout: 60_000 });
    const n = await switches.count();
    for (let index = 0; index < n; index += 1) {
      const box = await switches.nth(index).evaluate((track) => {
        const thumb = track.querySelector('span');
        const t = track.getBoundingClientRect();
        const h = thumb!.getBoundingClientRect();
        return {
          inside: h.left >= t.left - 0.5 && h.right <= t.right + 0.5,
          checked: track.getAttribute('data-state') === 'checked',
        };
      });
      expect(box, `switch ${index} (${language})`).toMatchObject({
        inside: true,
      });
    }
    await page.screenshot({
      path: `test-results/j47-switches-${language}.png`,
      fullPage: true,
    });
  }
});
