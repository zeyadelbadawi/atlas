/**
 * Theme 1 identity audit (plan §I.2 identity matrix, §J.21).
 *
 * The 12-palette screenshots show Theme 1 under radically different
 * brands; this spec proves the invariants those pictures only suggest.
 * For every page of the brand matrix, each palette is compared with the
 * reference (`default`) render of the same page:
 *
 *   1. Layout: every element's box is identical (DOM geometry diff = 0,
 *      within sub-pixel noise).
 *   2. Typography: family, size, weight, line height, tracking, case and
 *      style are identical on every element.
 *   3. Neutral canvas: `--website-background`, `--website-surface` and
 *      `--website-surface-muted` stay within Theme 1's chroma cap.
 *   4. Brand only in defined slots: an element's colour may change with
 *      the palette only if it is painted from one of the pack's brand slot
 *      variables (found by repainting those slots with a sentinel on the
 *      reference render); any other colour that moves must stay a capped
 *      neutral: the canvas and the text ink are tinted towards the brand
 *      hue by design (ink up to C 0.02, §F.4.2 step 6).
 */
import {
  BRAND_PALETTES,
  THEME1_BRAND_PAGES,
  fixtureSlug,
  fixtureUrl,
  type BaselinePage,
  type DataState,
} from './matrix';
import {
  expect,
  expectNoIssues,
  openFixture,
  test,
} from './support/baseline-test';
import type { Page } from '@playwright/test';

/** Theme 1's canvas chroma cap (`MODERN_EDUCATION_NEUTRAL_CHROMA_CAP`). */
const CANVAS_CHROMA_CAP = 0.012;
/**
 * Box comparison tolerance, in CSS px. Sub-pixel text layout can land a
 * hair either side of a half pixel between two loads of the SAME palette;
 * anything a person could see (≥ 1px) is still caught.
 */
const GEOMETRY_TOLERANCE = 0.5;
/** Text ink is tinted with the brand hue up to C 0.02 (§F.4.2 step 6). */
const INK_CHROMA_CAP = 0.02;
/** 8-bit sRGB rounding moves OKLCH chroma by a little under this. */
const CHROMA_TOLERANCE = 0.004;

/** The pack's defined slots (`modern-education.brand-mapping.ts`: brand slots, ink-band brand colours, feedback, base aliases). */
const BRAND_SLOT_VARIABLES = [
  '--website-cta',
  '--website-cta-foreground',
  '--website-cta-hover',
  '--website-cta-pressed',
  '--website-cta-border',
  '--website-link',
  '--website-focus',
  '--website-highlight',
  '--website-shape',
  '--website-shape-detail',
  '--website-chip-bg',
  '--website-chip-fg',
  '--website-icon-tile',
  '--website-icon-fg',
  '--website-ink-glow',
  '--website-ink-glow-detail',
  '--website-ink-cta',
  '--website-ink-cta-foreground',
  '--website-primary',
  '--website-primary-solid',
  '--website-primary-muted',
  '--website-primary-surface',
  '--website-secondary',
  '--website-secondary-solid',
  '--website-accent',
  '--website-accent-solid',
  '--primary',
  '--primary-foreground',
  '--primary-hover',
  '--ring',
  // Feedback roles are defined slots too: their hue is fixed, but the
  // engine re-solves their lightness per palette for contrast (e.g. the
  // amber rating stars use `--website-warning`).
  '--website-success',
  '--website-warning',
  '--website-error',
];
const CANVAS_VARIABLES = [
  '--website-background',
  '--website-surface',
  '--website-surface-muted',
];

interface ElementState {
  readonly tag: string;
  /** The class attribute (SVG `className` is an object), for failure messages. */
  readonly cls: string;
  /** Resolved font-relative sizing and web-font state, for failure messages. */
  readonly measure: string;
  readonly rect: readonly number[];
  readonly type: string;
  readonly colors: Record<string, string>;
}

interface PageState {
  readonly elements: ElementState[];
  readonly canvas: Record<string, string>;
}

/**
 * Waits until layout stops moving: the same element boxes on three
 * consecutive checks 100ms apart (a late font swap or image decode can
 * nudge text by a pixel after `openFixture` has returned).
 */
async function settleLayout(page: Page): Promise<void> {
  let previous = '';
  let stable = 0;
  for (let attempt = 0; attempt < 40 && stable < 2; attempt += 1) {
    const signature = await page.evaluate(async () => {
      await document.fonts.ready;
      // `fonts.ready` resolves between loads; a face that starts loading on
      // the next style pass (and a `ch`-based measure with it) is still in
      // flight, so a page with a loading face never counts as stable.
      const loading = Array.from(document.fonts).some(
        (face) => face.status === 'loading'
      );
      if (loading) return `loading:${performance.now()}`;
      // Widths too: a font swap can change a `ch` measure without moving
      // any box vertically.
      return Array.from(document.body.querySelectorAll('*'))
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return [rect.x, rect.y, rect.width, rect.height]
            .map((value) => Math.round(value * 100))
            .join(':');
        })
        .join(',');
    });
    stable = signature === previous ? stable + 1 : 0;
    previous = signature;
    await page.waitForTimeout(100);
  }
}

async function capture(page: Page): Promise<PageState> {
  // Closed `<details>` content (Theme 1's mobile footer columns) renders
  // with `content-visibility: hidden`. Chromium may skip style recalc inside
  // that skipped subtree, so a brand slot repainted on an ancestor can read
  // stale through `getComputedStyle` there. Open every disclosure before
  // measuring so each pass sees rendered, freshly resolved styles.
  await page.evaluate(() => {
    document.querySelectorAll('details').forEach((details) => {
      details.open = true;
    });
  });
  await settleLayout(page);
  // Chromium can keep a font-relative length it resolved while the web
  // font was still loading (seen as `max-inline-size: 585px`, i.e. 65ch at
  // the 0.5em placeholder, with every Rubik face loaded). With the fonts
  // in, change an inherited property on the root and revert it so every
  // element's style is resolved again, then let the layout settle.
  await page.evaluate(() => {
    const root = document.documentElement;
    root.style.letterSpacing = '0.001px';
    getComputedStyle(root).letterSpacing;
    root.style.letterSpacing = '';
  });
  await settleLayout(page);
  return page.evaluate((canvasVariables) => {
    const scope =
      document.querySelector<HTMLElement>('[style*="--website-background"]') ??
      document.documentElement;
    const probe = document.createElement('span');
    scope.appendChild(probe);
    const canvas: Record<string, string> = {};
    for (const name of canvasVariables) {
      probe.style.color = `var(${name})`;
      canvas[name] = getComputedStyle(probe).color;
    }
    probe.remove();

    const elements = [
      document.documentElement,
      ...Array.from(document.body.querySelectorAll('*')),
    ].map((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        cls: (element.getAttribute('class') ?? '').slice(0, 80),
        // Font-relative sizing, for the failure message: a `ch` measure
        // that resolved before the web font was available reads here.
        measure: `max-inline-size ${style.maxInlineSize}; font ${style.fontSize} ${style.fontFamily.split(',')[0]}; faces ${Array.from(
          document.fonts
        )
          .filter((face) => face.status !== 'unloaded')
          .map(
            (face) =>
              `${face.family.replace(/"/g, '')}/${face.weight}:${face.status}`
          )
          .join(' ')}`,
        rect: [rect.x, rect.y + window.scrollY, rect.width, rect.height].map(
          (value) => Math.round(value * 100) / 100
        ),
        type: [
          style.fontFamily,
          style.fontSize,
          style.fontWeight,
          style.lineHeight,
          style.letterSpacing,
          style.textTransform,
          style.fontStyle,
        ].join(' | '),
        colors: {
          color: style.color,
          background: style.backgroundColor,
          backgroundImage: style.backgroundImage,
          borderTop: style.borderTopColor,
          borderRight: style.borderRightColor,
          borderBottom: style.borderBottomColor,
          borderLeft: style.borderLeftColor,
          outline: style.outlineColor,
          fill: style.fill,
          stroke: style.stroke,
          boxShadow: style.boxShadow,
          decoration: style.textDecorationColor,
        },
      };
    });
    return { elements, canvas };
  }, CANVAS_VARIABLES);
}

/** Repaints every brand slot with a sentinel colour on the loaded page. */
async function paintSlotsWithSentinel(page: Page): Promise<void> {
  await page.evaluate((slots) => {
    const scopes = Array.from(
      document.querySelectorAll<HTMLElement>('[style*="--website-cta"]')
    );
    for (const scope of scopes) {
      for (const name of slots) {
        const current = scope.style.getPropertyValue(name).trim();
        if (!current) continue;
        // Raw `h s% l%` triplets feed `hsl(var(--x) / a)`; keep the shape.
        scope.style.setProperty(
          name,
          /^hsla?\(/.test(current) ? 'hsl(300 100% 40%)' : '300 100% 40%'
        );
      }
    }
  }, BRAND_SLOT_VARIABLES);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** OKLCH chroma of an `rgb()`/`rgba()` colour. */
function oklchChroma([r, g, b]: readonly number[]): number {
  const [lr, lg, lb] = [r, g, b].map(srgbToLinear);
  const l = Math.cbrt(
    0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
  );
  const m = Math.cbrt(
    0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
  );
  const s = Math.cbrt(
    0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb
  );
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return Math.hypot(a, bb);
}

/** Every opaque-enough colour inside a computed value (colours, gradients, shadows). */
function colorsIn(value: string): number[][] {
  const found: number[][] = [];
  for (const match of value.matchAll(
    /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/g
  )) {
    const alphaText = match[4];
    const alpha =
      alphaText === undefined
        ? 1
        : alphaText.endsWith('%')
          ? Number(alphaText.slice(0, -1)) / 100
          : Number(alphaText);
    if (alpha === 0) continue;
    found.push([Number(match[1]), Number(match[2]), Number(match[3])]);
  }
  return found;
}

function isCappedNeutral(value: string, cap = INK_CHROMA_CAP): boolean {
  return colorsIn(value).every(
    (rgb) => oklchChroma(rgb) <= cap + CHROMA_TOLERANCE
  );
}

interface AuditCase {
  readonly name: string;
  readonly page: BaselinePage;
  readonly state: DataState;
  readonly viewport: { readonly width: number; readonly height: number };
}

const HOME: BaselinePage = { name: 'home', path: '/' };
const CASES: AuditCase[] = [
  {
    name: 'home 390',
    page: HOME,
    state: 'rich',
    viewport: { width: 390, height: 844 },
  },
  ...[HOME, ...THEME1_BRAND_PAGES.map(({ page }) => page)]
    .filter(
      (page, index, all) =>
        all.findIndex((other) => other.name === page.name) === index
    )
    .map((page) => ({
      name: `${page.name} 1440`,
      page,
      state:
        THEME1_BRAND_PAGES.find((entry) => entry.page.name === page.name)
          ?.state ?? ('rich' as DataState),
      viewport: { width: 1440, height: 900 },
    })),
];

function urlFor(entry: AuditCase, palette: string): string {
  return fixtureUrl(
    entry.page,
    'en',
    fixtureSlug(
      'modern-education',
      entry.state,
      palette,
      entry.state === 'unpublished' ? undefined : 'c1'
    )
  );
}

for (const entry of CASES) {
  test.describe(`Theme 1 identity audit — ${entry.name}`, () => {
    test.use({ viewport: entry.viewport });

    test('layout, typography, canvas and brand slots are invariant across the 12 palettes', async ({
      page,
      issues,
    }) => {
      test.setTimeout(240_000);
      await openFixture(page, urlFor(entry, 'default'));
      const reference = await capture(page);
      await paintSlotsWithSentinel(page);
      const sentinel = await capture(page);
      expect(sentinel.elements.length).toBe(reference.elements.length);

      /** `index:property` pairs painted from a brand slot. */
      const slotted = new Set<string>();
      reference.elements.forEach((element, index) => {
        for (const [property, value] of Object.entries(element.colors)) {
          if (sentinel.elements[index].colors[property] !== value) {
            slotted.add(`${index}:${property}`);
          }
        }
      });
      // The page has brand slots at all (otherwise rule 4 proves nothing).
      expect(slotted.size).toBeGreaterThan(0);

      const failures: string[] = [];
      for (const palette of ['default', ...BRAND_PALETTES]) {
        await openFixture(page, urlFor(entry, palette));
        const state = await capture(page);

        for (const [name, value] of Object.entries(state.canvas)) {
          if (!isCappedNeutral(value, CANVAS_CHROMA_CAP)) {
            failures.push(
              `${palette}: ${name} ${value} exceeds the canvas chroma cap`
            );
          }
        }
        if (state.elements.length !== reference.elements.length) {
          failures.push(
            `${palette}: ${state.elements.length} elements vs ${reference.elements.length}`
          );
          continue;
        }
        state.elements.forEach((element, index) => {
          const base = reference.elements[index];
          const where = `${palette}: #${index} <${element.tag}${base.cls ? ` class="${base.cls}"` : ''}>`;
          if (element.tag !== base.tag) {
            failures.push(`${where} is <${base.tag}> in the reference`);
            return;
          }
          if (
            element.rect.some(
              (value, i) => Math.abs(value - base.rect[i]) > GEOMETRY_TOLERANCE
            )
          ) {
            failures.push(
              `${where} box ${element.rect} vs ${base.rect} (${element.measure}; reference ${base.measure})`
            );
          }
          if (element.type !== base.type) {
            failures.push(`${where} type "${element.type}" vs "${base.type}"`);
          }
          for (const [property, value] of Object.entries(element.colors)) {
            if (value === base.colors[property]) continue;
            if (slotted.has(`${index}:${property}`)) continue;
            if (isCappedNeutral(value)) continue;
            // The reference and sentinel-pass values tell whether the slot
            // paint reached this element at all.
            failures.push(
              `${where} ${property} "${value}" is brand colour outside a slot (reference "${base.colors[property]}", sentinel "${sentinel.elements[index].colors[property]}")`
            );
          }
        });
      }
      expect(
        failures.slice(0, 25),
        `${failures.length} identity failures`
      ).toEqual([]);
      expectNoIssues(issues);
    });
  });
}
