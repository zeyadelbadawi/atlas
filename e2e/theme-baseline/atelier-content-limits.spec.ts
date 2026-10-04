/**
 * Atelier (Theme 2) — the cinematic Home under real, long and legacy CMS
 * content, in a real browser on the production build
 * (`src/features/website/atelier/atelier-cinematic.css`,
 * `cinematic/cinematic-budget.ts`, `cinematic/AtelierScene.tsx`).
 *
 * The three safety layers keep a pinned stage from clipping or trapping
 * content:
 * - the content budget: copy that cannot fit one window (the hardening
 *   contract's caps, legacy copy past them) renders static, complete;
 * - em-based gates: a larger default font size asks for a larger window;
 * - the fit check: a stage whose content outgrows its window (a boundary
 *   hero on a short screen, a larger root font) lets go of the pin, with no
 *   layout shift.
 * Whenever a stage IS pinned, everything in it is inside the window.
 *
 * Fixtures: `fx--atelier--rich--default--<composition>` (see
 * `parseAtelierLimitsComposition` in `fixtures/live-data.mjs`).
 */
import type { Page } from '@playwright/test';
import { fixtureUrl } from './matrix';
import {
  expect,
  expectNoIssues,
  openFixture,
  test,
} from './support/baseline-test';

const HOME = { name: 'home', path: '/' };
const STD = 'fx--atelier--rich';
const limits = (composition: string) =>
  `fx--atelier--rich--default--${composition}`;
const PINNED = ['opening', 'method', 'ink'] as const;
type SceneName = (typeof PINNED)[number];

async function settleFrames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
}

async function scrollToY(page: Page, y: number): Promise<void> {
  await page.evaluate((top) => window.scrollTo(0, top), y);
  await settleFrames(page);
}

/** A scene's state: marked, let go (`data-at-fit`), pinned, its runway. */
async function sceneState(page: Page, name: SceneName) {
  return page.evaluate((scene) => {
    const el = document.querySelector<HTMLElement>(
      `[data-at-cinematic="${scene}"]`
    );
    if (!el) return null;
    const stage = el.firstElementChild as HTMLElement;
    const runway = el.querySelector(':scope > .atc-runway');
    const rect = el.getBoundingClientRect();
    return {
      fit: el.dataset.atFit ?? null,
      sticky: getComputedStyle(stage).position === 'sticky',
      runway: runway ? runway.getBoundingClientRect().height : 0,
      top: rect.top + window.scrollY,
      height: rect.height,
      header: document
        .querySelector('[data-atelier-header]')!
        .getBoundingClientRect().height,
      viewport: window.innerHeight,
    };
  }, name);
}

/**
 * Elements of a pinned stage that are outside the window: vertically for
 * everything, horizontally except the method's travelling track (which
 * slides under its window by design).
 */
async function outsideTheWindow(page: Page, name: SceneName) {
  return page.evaluate((scene) => {
    const el = document.querySelector(`[data-at-cinematic="${scene}"]`)!;
    const stage = el.firstElementChild!;
    const header = document
      .querySelector('[data-atelier-header]')!
      .getBoundingClientRect().height;
    const out: string[] = [];
    for (const node of stage.querySelectorAll<HTMLElement>(
      'h1, h2, h3, p, li, a, button, input, dt, dd, img, .at-frame'
    )) {
      const rect = node.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const travels = !!node.closest('.atc-track');
      if (
        rect.top < header - 1 ||
        rect.bottom > window.innerHeight + 1 ||
        (!travels && (rect.left < -1 || rect.right > window.innerWidth + 1))
      ) {
        out.push(
          `${node.tagName}.${node.className} ${Math.round(rect.top)}–${Math.round(rect.bottom)}`
        );
      }
    }
    return out;
  }, name);
}

/** The scroll range over which a scene is pinned. */
function range(box: NonNullable<Awaited<ReturnType<typeof sceneState>>>) {
  const start = Math.max(0, box.top - box.header);
  return { start, end: box.top + box.height - box.viewport };
}

/** Every pinned scene keeps all of its stage inside the window. */
async function expectPinnedStagesInside(page: Page): Promise<number> {
  let pinned = 0;
  for (const name of PINNED) {
    const box = await sceneState(page, name);
    if (!box || box.fit) continue;
    const { start, end } = range(box);
    // The opening's copy recedes once it plays: its first frame is the
    // whole spread. The figures rise into place: their last frame.
    const frames =
      name === 'opening' ? [0] : name === 'ink' ? [1] : [0, 0.5, 1];
    for (const t of frames) {
      await scrollToY(page, Math.round(start + (end - start) * t));
      const state = await sceneState(page, name);
      expect(state?.sticky, `${name} pinned at ${t}`).toBe(true);
      expect(await outsideTheWindow(page, name), `${name} at ${t}`).toEqual([]);
    }
    pinned += 1;
  }
  await scrollToY(page, 0);
  return pinned;
}

async function expectStaticScene(page: Page, name: SceneName): Promise<void> {
  const state = await sceneState(page, name);
  if (state) {
    expect(state.sticky, name).toBe(false);
    expect(state.runway, name).toBe(0);
  }
}

/** Every text of the chapter is rendered in full and visible. */
async function expectCompleteText(page: Page, selector: string) {
  const nodes = page.locator(selector);
  const count = await nodes.count();
  expect(count, selector).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const node = nodes.nth(i);
    await node.scrollIntoViewIfNeeded();
    await expect(node).toBeVisible();
    // Clipped: hidden overflow on the text or an ancestor in its chapter,
    // an ellipsis or a line clamp. (Glyphs taller than a tight display
    // line height overflow visibly, which is not clipping.)
    const clipped = await node.evaluate((el) => {
      const style = getComputedStyle(el);
      if (
        style.textOverflow === 'ellipsis' ||
        !['', 'none'].includes(style.getPropertyValue('-webkit-line-clamp'))
      ) {
        return 'clamped';
      }
      const chapter = el.closest('.at-chapter');
      for (
        let box: HTMLElement | null = el as HTMLElement;
        box && box !== chapter;
        box = box.parentElement
      ) {
        const s = getComputedStyle(box);
        if (
          ['hidden', 'clip'].includes(s.overflowY) &&
          box.scrollHeight > box.clientHeight + 4
        ) {
          return `${box.tagName}.${box.className}`;
        }
      }
      return '';
    });
    expect(clipped, `${selector} #${i} clipped`).toBe('');
  }
}

const horizontalOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );

/* ------------------------------------------------------------------ */
/* Pinned stages never clip                                             */
/* ------------------------------------------------------------------ */

for (const locale of ['en', 'ar'] as const) {
  test.describe(`content limits, ${locale}, motion allowed`, () => {
    test.use({ contextOptions: { reducedMotion: 'no-preference' } });

    for (const viewport of [
      { width: 1024, height: 720 },
      { width: 1280, height: 720 },
    ]) {
      test.describe(`${viewport.width}×${viewport.height}`, () => {
        test.use({ viewport });

        test('the starter Home pins every scene, and nothing in a pinned stage leaves the window', async ({
          page,
          issues,
        }) => {
          await openFixture(page, fixtureUrl(HOME, locale, STD));
          expect(await expectPinnedStagesInside(page)).toBe(3);
          expectNoIssues(issues);
        });

        test('a method plate and six steps, and figures labelled at their cap, stay inside the window', async ({
          page,
        }) => {
          await openFixture(
            page,
            fixtureUrl(HOME, locale, limits('std-s6-img'))
          );
          expect(await sceneState(page, 'method')).toMatchObject({ fit: null });
          await expectPinnedStagesInside(page);
          await openFixture(page, fixtureUrl(HOME, locale, limits('long')));
          // Ink: the chapter title and three live figures at their caps.
          expect(await sceneState(page, 'ink')).toMatchObject({ fit: null });
          expect(await expectPinnedStagesInside(page)).toBeGreaterThanOrEqual(
            1
          );
        });
      });
    }

    test.describe('1440×900', () => {
      test.use({ viewport: { width: 1440, height: 900 } });

      test('copy at the caps, and legacy copy past them, renders static and complete', async ({
        page,
        issues,
      }) => {
        for (const composition of ['long', 'legacy']) {
          await openFixture(
            page,
            fixtureUrl(HOME, locale, limits(composition))
          );
          // Over budget on the server: no opening or method scene at all.
          expect(await sceneState(page, 'opening')).toBeNull();
          expect(await sceneState(page, 'method')).toBeNull();
          // The figures' chapter fits: if it pins, it stays inside.
          await expectPinnedStagesInside(page);
          const title = await page.locator('h1').textContent();
          expect(title?.length).toBe(composition === 'long' ? 70 : 100);
          const description = await page
            .locator('.ath-hero-copy .at-lead')
            .textContent();
          expect(description?.length).toBe(composition === 'long' ? 280 : 2000);
          await expectCompleteText(
            page,
            '.ath-hero :is(h1, p, li, a), .ath-syllabus-step :is(h3, p)'
          );
          await expect(page.locator('.ath-syllabus-step')).toHaveCount(6);
          await expect(page.locator('.ath-method-plate img')).toBeVisible();
          expect(await horizontalOverflow(page)).toBe(0);
        }
        expectNoIssues(issues);
      });
    });
  });
}

/* ------------------------------------------------------------------ */
/* The fit check                                                        */
/* ------------------------------------------------------------------ */

test.describe('fit check', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  /** Layout shifts on load (excluding input), from first paint. */
  async function recordShifts(page: Page): Promise<void> {
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as {
          value: number;
          hadRecentInput: boolean;
        }[]) {
          if (!entry.hadRecentInput) w.__cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
  }
  const shifts = (page: Page) =>
    page.evaluate(() => (window as unknown as { __cls: number }).__cls);

  /** Every frame of the first seconds: the opening's fit state and where its spread is. */
  async function recordFrames(page: Page): Promise<void> {
    await page.addInitScript(() => {
      const w = window as unknown as {
        __frames: { fit: string | null; copy: number; h1: number }[];
      };
      w.__frames = [];
      const start = performance.now();
      const tick = () => {
        const scene = document.querySelector<HTMLElement>(
          '[data-at-cinematic="opening"]'
        );
        const copy = document.querySelector('.ath-hero-copy');
        const h1 = document.querySelector('.ath-hero h1');
        if (scene && copy && h1) {
          w.__frames.push({
            fit: scene.dataset.atFit ?? null,
            copy: copy.getBoundingClientRect().top + window.scrollY,
            h1: h1.getBoundingClientRect().top + window.scrollY,
          });
        }
        if (performance.now() - start < 4000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /** The spread does not move in the frame its stage lets go. */
  async function expectNoJumpWhenReleased(page: Page): Promise<void> {
    const frames = await page.evaluate(
      () =>
        (
          window as unknown as {
            __frames: { fit: string | null; copy: number; h1: number }[];
          }
        ).__frames
    );
    const released = frames.findIndex((frame) => frame.fit !== null);
    expect(released, 'the opening let go').toBeGreaterThan(0);
    const [before, after] = [frames[released - 1], frames[released]];
    expect(before.fit).toBeNull();
    expect(Math.abs(after.copy - before.copy)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(after.h1 - before.h1)).toBeLessThanOrEqual(0.5);
  }

  test.describe('a boundary hero', () => {
    test('pins where it fits (1440×900)', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await openFixture(page, fixtureUrl(HOME, 'en', limits('edge')));
      expect(await sceneState(page, 'opening')).toMatchObject({
        fit: null,
        sticky: true,
      });
      await expectPinnedStagesInside(page);
    });

    test('lets go where it does not (1024×720), with no jump at the top', async ({
      page,
      issues,
    }) => {
      await page.setViewportSize({ width: 1024, height: 720 });
      await recordShifts(page);
      await recordFrames(page);
      await openFixture(page, fixtureUrl(HOME, 'en', limits('edge')));
      const state = await sceneState(page, 'opening');
      expect(state).toMatchObject({
        fit: 'overflow',
        sticky: false,
        runway: 0,
      });
      // Chapter I follows the spread instead of sliding over it.
      const gap = await page.evaluate(() => {
        const hero = document.querySelector('.ath-hero')!;
        const next = document.querySelector(
          '[data-at-cinematic="opening"] + *'
        )!;
        return (
          next.getBoundingClientRect().top - hero.getBoundingClientRect().bottom
        );
      });
      expect(gap).toBeGreaterThanOrEqual(0);
      // Every line of the spread can be scrolled to and read.
      await expectCompleteText(page, '.ath-hero :is(h1, p, li, a)');
      await expectNoJumpWhenReleased(page);
      expect(await shifts(page)).toBeLessThan(0.1);
      expectNoIssues(issues);
    });
  });

  for (const locale of ['en', 'ar'] as const) {
    test(`a larger root font lets go of pinned stages that outgrow their window, ${locale}`, async ({
      page,
      issues,
    }) => {
      await page.setViewportSize({ width: 1024, height: 720 });
      // A user style that enlarges the root font without touching the
      // browser's default size (so the em gates still open).
      await page.addInitScript(() => {
        document.addEventListener('DOMContentLoaded', () => {
          const style = document.createElement('style');
          style.textContent = 'html { font-size: 150% !important; }';
          document.head.append(style);
        });
      });
      await recordFrames(page);
      await openFixture(page, fixtureUrl(HOME, locale, STD));
      for (const name of ['opening', 'method'] as const) {
        expect(await sceneState(page, name), name).toMatchObject({
          fit: 'overflow',
          sticky: false,
          runway: 0,
        });
      }
      await expectPinnedStagesInside(page);
      // Releasing the opening never moves the spread. (Load-time layout
      // shift here is dominated by the web fonts swapping in, which this
      // suite does not control, so the frames are compared directly.)
      await expectNoJumpWhenReleased(page);
      expectNoIssues(issues);
    });
  }

  test('a root font enlarged after load is caught too', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await openFixture(page, fixtureUrl(HOME, 'en', STD));
    expect(await sceneState(page, 'opening')).toMatchObject({ fit: null });
    await page.addStyleTag({ content: 'html { font-size: 160% !important; }' });
    await expect
      .poll(async () => (await sceneState(page, 'opening'))?.fit)
      .toBe('overflow');
    await expectPinnedStagesInside(page);
  });

  test('many figures stay inside the window or let go of it', async ({
    page,
  }) => {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1024, height: 720 },
    ]) {
      await page.setViewportSize(viewport);
      await openFixture(page, fixtureUrl(HOME, 'en', limits('std-k12')));
      await expectPinnedStagesInside(page);
      await expect(
        page.locator('.ath-stats[data-rows="3"] .ath-stat')
      ).toHaveCount(12);
      await expectCompleteText(page, '.ath-stats :is(dt, dd)');
    }
    // At their caps, twelve figures are over budget: no scene at all.
    await openFixture(page, fixtureUrl(HOME, 'en', limits('long-k12')));
    expect(await sceneState(page, 'ink')).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* em gates                                                             */
/* ------------------------------------------------------------------ */

for (const [size, expectation] of [
  [20, 'pins and fits'],
  [24, 'stays static'],
] as const) {
  test.describe(`default font size ${size}px, 1440×900`, () => {
    test.use({
      viewport: { width: 1440, height: 900 },
      contextOptions: { reducedMotion: 'no-preference' },
    });
    test(`the opening ${expectation}`, async ({ page }) => {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Page.setFontSizes', { fontSizes: { standard: size } });
      await openFixture(page, fixtureUrl(HOME, 'en', STD));
      const opening = await sceneState(page, 'opening');
      if (size === 20) {
        // 45em = 900px: the gate still opens, and the stage fits.
        expect(opening).toMatchObject({ fit: null, sticky: true });
        await expectPinnedStagesInside(page);
      } else {
        // 45em = 1080px: the window is too short at this font size.
        expect(opening).toMatchObject({ sticky: false, runway: 0 });
        await expectStaticScene(page, 'method');
        await expectCompleteText(page, '.ath-hero :is(h1, p, li, a)');
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* Method: with and without the plate, three to six steps               */
/* ------------------------------------------------------------------ */

for (const locale of ['en', 'ar'] as const) {
  test.describe(`method scene, ${locale}, 1440×900`, () => {
    test.use({
      viewport: { width: 1440, height: 900 },
      contextOptions: { reducedMotion: 'no-preference' },
    });

    for (const steps of [3, 4, 5, 6]) {
      for (const image of [true, false]) {
        if (locale === 'ar' && steps !== 4) continue;
        test(`${steps} steps ${image ? 'with' : 'without'} the plate`, async ({
          page,
          issues,
        }) => {
          await openFixture(
            page,
            fixtureUrl(
              HOME,
              locale,
              limits(`std-s${steps}${image ? '-img' : ''}`)
            )
          );
          const box = (await sceneState(page, 'method'))!;
          expect(box).toMatchObject({ fit: null, sticky: true });
          await expect(
            page.locator('[data-at-cinematic="method"] .ath-syllabus-step')
          ).toHaveCount(steps);
          const plate = page.locator(
            '[data-at-cinematic="method"] .ath-method-plate'
          );
          await expect(plate).toHaveCount(image ? 1 : 0);
          const { start, end } = range(box);

          // The plate is uncovered a step's share at a time, from the
          // reading direction's start.
          const clip = () =>
            plate.evaluate((el) => getComputedStyle(el).clipPath);
          if (image) {
            await scrollToY(page, start);
            // inset(top end bottom start), physical: the hidden share is on
            // the right in English and on the left in Arabic.
            const sides = /inset\((.*)\)/.exec(await clip())![1].split(' ');
            const hidden = locale === 'en' ? sides[1] : sides[3];
            const shown = locale === 'en' ? sides[3] : sides[1];
            expect(parseFloat(hidden)).toBeCloseTo(100 - 100 / steps, 0);
            expect(hidden.endsWith('%')).toBe(true);
            expect(shown).toBe('0px');
          }
          await expectPinnedStagesInside(page);
          await scrollToY(page, end);
          if (image) {
            const sides = /inset\((.*)\)/.exec(await clip())![1].split(' ');
            expect(sides.map((side) => parseFloat(side))).toEqual(
              sides.map(() => 0)
            );
          }
          const knots = await page
            .locator('.ath-syllabus-knot')
            .evaluateAll((nodes) =>
              nodes.map((node) => getComputedStyle(node, '::after').transform)
            );
          for (const transform of knots)
            expect(transform).toBe('matrix(1, 0, 0, 1, 0, 0)');
          expect(await horizontalOverflow(page)).toBe(0);
          expectNoIssues(issues);
        });
      }
    }

    test('one or two steps stay static, plate included', async ({ page }) => {
      for (const steps of [1, 2]) {
        await openFixture(
          page,
          fixtureUrl(HOME, locale, limits(`std-s${steps}-img`))
        );
        expect(await sceneState(page, 'method')).toBeNull();
        await expect(page.locator('.ath-syllabus-step')).toHaveCount(steps);
        await page.locator('.ath-method-plate').scrollIntoViewIfNeeded();
        await expect(page.locator('.ath-method-plate img')).toBeVisible();
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* Static everywhere else                                               */
/* ------------------------------------------------------------------ */

for (const locale of ['en', 'ar'] as const) {
  test.describe(`static and complete, ${locale}`, () => {
    test.describe('reduced motion', () => {
      test.use({
        viewport: { width: 1440, height: 900 },
        contextOptions: { reducedMotion: 'reduce' },
      });
      test('the plate, six steps and the boundary hero, with nothing pinned', async ({
        page,
        issues,
      }) => {
        await openFixture(
          page,
          fixtureUrl(HOME, locale, limits('edge-s6-img'))
        );
        expect(
          await page.evaluate(
            () => matchMedia('(prefers-reduced-motion: reduce)').matches
          )
        ).toBe(true);
        for (const name of PINNED) await expectStaticScene(page, name);
        expect(
          await page
            .locator('.ath-method-plate')
            .evaluate((el) => getComputedStyle(el).clipPath)
        ).toBe('none');
        await expectCompleteText(
          page,
          '.ath-hero :is(h1, p, li, a), .ath-syllabus-step :is(h3, p), .ath-stats dt'
        );
        await expect(page.locator('.ath-method-plate img')).toBeVisible();
        expectNoIssues(issues);
      });
    });

    test.describe('phone', () => {
      test.use({
        viewport: { width: 390, height: 844 },
        contextOptions: { reducedMotion: 'no-preference' },
      });
      test('the plate above the syllabus, every step, no sideways scroll', async ({
        page,
        issues,
      }) => {
        await openFixture(page, fixtureUrl(HOME, locale, limits('std-s5-img')));
        for (const name of PINNED) await expectStaticScene(page, name);
        const [plate, firstStep] = await Promise.all([
          page.locator('.ath-method-plate').boundingBox(),
          page.locator('.ath-syllabus-step').first().boundingBox(),
        ]);
        expect(plate!.y + plate!.height).toBeLessThanOrEqual(firstStep!.y);
        await expectCompleteText(page, '.ath-syllabus-step :is(h3, p)');
        expect(await horizontalOverflow(page)).toBe(0);
        expectNoIssues(issues);
      });
    });
  });
}

/* ------------------------------------------------------------------ */
/* A browser without scroll-driven animations                           */
/* ------------------------------------------------------------------ */

/*
 * No Chromium switch turns scroll timelines off (tried:
 * --disable-blink-features=ScrollTimeline, CSSScrollTimeline, ViewTimeline,
 * ScrollDrivenAnimations — `CSS.supports('animation-timeline: view()')`
 * stays true). The suite emulates such a browser instead: the stylesheet is
 * served with its support query unmet, exactly what that browser evaluates.
 */
test.describe('no scroll-driven animation support (emulated)', () => {
  test.use({
    viewport: { width: 1440, height: 900 },
    contextOptions: { reducedMotion: 'no-preference' },
  });
  for (const locale of ['en', 'ar'] as const) {
    test(`every scene is its static chapter, complete, ${locale}`, async ({
      page,
      issues,
    }) => {
      let rewritten = 0;
      await page.route(/\/assets\/.*\.css$/, async (route) => {
        const response = await route.fetch();
        const css = await response.text();
        const body = css.replaceAll(
          /@supports\s*\(\s*animation-timeline\s*:\s*view\(\)\s*\)/g,
          () => {
            rewritten += 1;
            return '@supports (animation-timeline: atlas-unsupported())';
          }
        );
        await route.fulfill({ response, body });
      });
      await openFixture(page, fixtureUrl(HOME, locale, limits('std-s4-img')));
      expect(rewritten).toBeGreaterThan(0);
      expect(
        await page.evaluate(() =>
          CSS.supports('animation-timeline: atlas-unsupported()')
        )
      ).toBe(false);
      for (const name of PINNED) await expectStaticScene(page, name);
      await expectCompleteText(
        page,
        '.ath-hero :is(h1, p, li, a), .ath-syllabus-step :is(h3, p), .ath-stats :is(dt, dd)'
      );
      await expect(page.locator('.ath-method-plate img')).toBeVisible();
      expect(await horizontalOverflow(page)).toBe(0);
      expectNoIssues(issues);
    });
  }
});
