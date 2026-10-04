/**
 * Atelier (Theme 2) — the Home's cinematic scenes in a real browser, on the
 * production build (Reports/THEME_2_ATELIER_PLAN.md §4,
 * `src/features/website/atelier/atelier-cinematic.css`).
 *
 * Desktop, motion allowed: each pinned scene (opening, method, ink) holds
 * its stage still while its scroll range plays, and the scrubbed state
 * actually moves (mirrored in Arabic). The page never scrolls sideways, a
 * focused control inside a scene is on screen and not covered, and every
 * scene's content is there and readable where it comes to rest.
 *
 * Reduced motion and phones: the scenes are their static chapters — no
 * pinning, no scroll-driven animation, no extra scroll height.
 *
 * Each test states the motion preference it needs through
 * `contextOptions` (Playwright has no top-level `reducedMotion` test
 * option, so the suite config's `use.reducedMotion` does not reach the
 * browser).
 */
import type { Page } from '@playwright/test';
import { fixtureSlug, fixtureUrl } from './matrix';
import {
  expect,
  expectNoIssues,
  openFixture,
  test,
} from './support/baseline-test';

const HOME = { name: 'home', path: '/' };
const SLUG = fixtureSlug('atelier', 'rich');
const PINNED = ['opening', 'method', 'ink'] as const;

async function scrollToY(page: Page, y: number): Promise<void> {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
}

/** A scene's document offset and height, and the sticky header's height. */
async function sceneBox(page: Page, name: string) {
  return page.evaluate((scene) => {
    const el = document.querySelector(`[data-at-cinematic="${scene}"]`)!;
    const header = document.querySelector('[data-atelier-header]')!;
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top + window.scrollY,
      height: rect.height,
      header: header.getBoundingClientRect().height,
      viewport: window.innerHeight,
    };
  }, name);
}

async function stageTop(page: Page, name: string): Promise<number> {
  return page.evaluate(
    (scene) =>
      document
        .querySelector(`[data-at-cinematic="${scene}"] > .at-chapter`)!
        .getBoundingClientRect().top,
    name
  );
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
}

const DESKTOPS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '1024', width: 1024, height: 768 },
] as const;

for (const viewport of DESKTOPS) {
  for (const locale of ['en', 'ar'] as const) {
    test.describe(`Atelier scenes, ${viewport.name}, ${locale}`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        contextOptions: { reducedMotion: 'no-preference' },
      });

      test('each pinned scene holds its stage still across its scroll range', async ({
        page,
        issues,
      }) => {
        await openFixture(page, fixtureUrl(HOME, locale, SLUG));
        for (const name of PINNED) {
          const box = await sceneBox(page, name);
          // The contain range: from the scene's top at the header's foot
          // to its end at the viewport's foot.
          const start = Math.max(0, box.top - box.header);
          const end = box.top + box.height - box.viewport;
          expect(end - start, `${name} has a runway`).toBeGreaterThan(
            box.viewport * 0.5
          );
          for (const t of [0, 0.25, 0.5, 0.75, 1]) {
            await scrollToY(page, Math.round(start + (end - start) * t));
            expect(
              Math.abs((await stageTop(page, name)) - box.header),
              `${name} stage at ${t}`
            ).toBeLessThanOrEqual(1.5);
            expect(await horizontalOverflow(page)).toBe(0);
          }
        }
        expectNoIssues(issues);
      });

      test('the scenes scrub: the window opens, the syllabus travels with the reading direction, the ink fills', async ({
        page,
      }) => {
        await openFixture(page, fixtureUrl(HOME, locale, SLUG));

        // Opening: the arch at rest, then the full window.
        const frame = page.locator('.ath-hero-media');
        const atRest = (await frame.boundingBox())!;
        expect(atRest.width).toBeLessThan(viewport.width / 2);
        const opening = await sceneBox(page, 'opening');
        await scrollToY(
          page,
          Math.round((opening.height - opening.viewport + opening.header) * 0.5)
        );
        const open = (await frame.boundingBox())!;
        expect(open.x).toBeLessThanOrEqual(1);
        expect(open.x + open.width).toBeGreaterThanOrEqual(viewport.width - 1);
        expect(open.y).toBeLessThanOrEqual(opening.header);
        expect(open.y + open.height).toBeGreaterThanOrEqual(viewport.height);

        // Method: the track moves against the reading direction.
        const method = await sceneBox(page, 'method');
        await scrollToY(page, method.top - method.header);
        const trackStart = (await page.locator('.atc-track').boundingBox())!;
        await scrollToY(page, method.top + method.height - method.viewport);
        const trackEnd = (await page.locator('.atc-track').boundingBox())!;
        const travel = trackEnd.x - trackStart.x;
        if (locale === 'en') expect(travel).toBeLessThan(-40);
        else expect(travel).toBeGreaterThan(40);
        // Every knot is filled once the thread has reached the last step.
        const knots = await page
          .locator('.ath-syllabus-knot')
          .evaluateAll((nodes) =>
            nodes.map((node) => getComputedStyle(node, '::after').transform)
          );
        expect(knots.length).toBeGreaterThanOrEqual(3);
        for (const transform of knots)
          expect(transform).toBe('matrix(1, 0, 0, 1, 0, 0)');

        // Ink: the window covers the stage and the figures are in place.
        const ink = await sceneBox(page, 'ink');
        await scrollToY(page, ink.top + ink.height - ink.viewport);
        const stats = page.locator('[data-at-cinematic="ink"] .ath-stat');
        const count = await stats.count();
        expect(count).toBeGreaterThanOrEqual(2);
        for (let i = 0; i < count; i++) {
          await expect(stats.nth(i)).toBeVisible();
          expect(
            await stats
              .nth(i)
              .evaluate((node) => getComputedStyle(node).opacity)
          ).toBe('1');
        }
        const covered = await page.evaluate(() => {
          const layer = document.querySelector('.atc-ink-window')!;
          const x = window.innerWidth / 2;
          const header = document
            .querySelector('[data-atelier-header]')!
            .getBoundingClientRect().height;
          // Just under the header, near both edges and in the middle.
          return [8, x, window.innerWidth - 8].every((px) =>
            document
              .elementsFromPoint(px, header + 6)
              .some((node) => node === layer)
          );
        });
        expect(covered).toBe(true);
      });

      test('the first frame is the hero spread, fully readable, its image shown', async ({
        page,
      }) => {
        await openFixture(page, fixtureUrl(HOME, locale, SLUG));
        const heading = page.getByRole('heading', { level: 1 });
        await expect(heading).toHaveCount(1);
        await expect(heading).toBeInViewport();
        const opacities = await page
          .locator('.ath-hero-copy, .ath-hero-media')
          .evaluateAll((nodes) =>
            nodes.map((n) => getComputedStyle(n).opacity)
          );
        expect(opacities).toEqual(['1', '1']);
        const cta = page.locator('.ath-hero-copy a').first();
        await expect(cta).toBeInViewport({ ratio: 1 });
        await expect(page.locator('.ath-hero-media img')).toHaveAttribute(
          'fetchpriority',
          'high'
        );
      });

      test('a control focused inside the opening is on screen and not covered', async ({
        page,
      }) => {
        await openFixture(page, fixtureUrl(HOME, locale, SLUG));
        const opening = await sceneBox(page, 'opening');
        const cta = page.locator('.ath-hero-copy a').first();
        const unobscured = () =>
          cta.evaluate((node) => {
            const rect = node.getBoundingClientRect();
            const hit = document.elementFromPoint(
              rect.left + rect.width / 2,
              rect.top + rect.height / 2
            );
            return (
              rect.top >= 0 &&
              rect.bottom <= window.innerHeight &&
              !!hit &&
              (hit === node || node.contains(hit))
            );
          });
        // Mid-way through the window opening, and while Chapter I covers it.
        for (const t of [0.3, 0.85]) {
          await scrollToY(
            page,
            Math.round((opening.height - opening.viewport + opening.header) * t)
          );
          await cta.focus();
          expect(await unobscured(), `focused at ${t}`).toBe(true);
          await cta.blur();
        }
        // Back from Chapter I with the keyboard, after the stage has gone.
        const next = page
          .locator('.atc-scene[data-at-cinematic="opening"] + .at-chapter a')
          .first();
        await next.focus();
        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Shift+Tab');
        await expect(cta).toBeFocused();
        expect(await unobscured()).toBe(true);
      });
    });
  }
}

/** The static chapters: no pinning, no scroll-driven motion, no extra height. */
async function expectStatic(page: Page): Promise<void> {
  const scenes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-at-cinematic]')).map((el) => {
      const stage = el.querySelector(':scope > .at-chapter')!;
      const runway = el.querySelector(':scope > .atc-runway');
      return {
        name: (el as HTMLElement).dataset.atCinematic,
        position: getComputedStyle(stage).position,
        runway: runway ? runway.getBoundingClientRect().height : 0,
      };
    })
  );
  expect(scenes.map((scene) => scene.name)).toEqual([
    'opening',
    'method',
    'ink',
    'closing',
  ]);
  for (const scene of scenes) {
    expect(scene.position, scene.name).not.toBe('sticky');
    expect(scene.runway, scene.name).toBe(0);
  }
  const scrubbed = await page
    .locator(
      '.ath-hero-copy, .ath-hero-media, .atc-track, .atc-track-line, .ath-syllabus-no, [data-at-cinematic="ink"] .ath-stat'
    )
    .evaluateAll((nodes) =>
      nodes.map((node) => getComputedStyle(node).animationName)
    );
  expect(scrubbed.length).toBeGreaterThan(0);
  for (const name of scrubbed) expect(name).toBe('none');
  // Every scene's content is there and visible.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  for (const selector of [
    '.ath-hero-media',
    '.ath-syllabus-step h3',
    '[data-at-cinematic="ink"] .ath-stat-value',
    '.ath-cta .at-display',
  ]) {
    const nodes = page.locator(selector);
    const count = await nodes.count();
    expect(count, selector).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      await nodes.nth(i).scrollIntoViewIfNeeded();
      await expect(nodes.nth(i)).toBeVisible();
    }
  }
  expect(await horizontalOverflow(page)).toBe(0);
}

for (const locale of ['en', 'ar'] as const) {
  test.describe(`Atelier scenes are static, ${locale}`, () => {
    test.describe('reduced motion, 1440', () => {
      test.use({
        viewport: { width: 1440, height: 900 },
        contextOptions: { reducedMotion: 'reduce' },
      });
      test('no pinning, no scroll-driven motion, no extra height', async ({
        page,
        issues,
      }) => {
        await openFixture(page, fixtureUrl(HOME, locale, SLUG));
        expect(
          await page.evaluate(
            () => matchMedia('(prefers-reduced-motion: reduce)').matches
          )
        ).toBe(true);
        await expectStatic(page);
        expectNoIssues(issues);
      });
    });

    test.describe('phone, motion allowed', () => {
      test.use({
        viewport: { width: 390, height: 844 },
        contextOptions: { reducedMotion: 'no-preference' },
      });
      test('no pinning and no pinned-scene motion on a phone', async ({
        page,
        issues,
      }) => {
        await openFixture(page, fixtureUrl(HOME, locale, SLUG));
        await expectStatic(page);
        expectNoIssues(issues);
      });
    });
  });
}
