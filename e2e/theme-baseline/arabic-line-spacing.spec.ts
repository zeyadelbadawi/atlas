/**
 * Arabic line spacing, measured in the browser on every themed page.
 *
 * Arabic stacks marks above and below the letters (hamza, shadda, the
 * vowels, the tanwin) and its letters reach further below the baseline
 * than Latin ones, so a line-height that is generous in English can make
 * consecutive Arabic lines touch. For every text block on an Arabic page
 * that wraps onto two lines or more, every word is placed on its rendered
 * baseline and measured in its own font, size and weight; wherever a word
 * sits under a word of the line above, their ink must keep clear air.
 *
 * Every theme (Theme 1, Atelier, Manara, Riwaq), every page a visitor can
 * open, at 390, 768, 1024 and 1440.
 */
import {
  ATELIER_PAGES,
  MANARA_PAGES,
  RIWAQ_PAGES,
  THEME1_C1_PAGES,
  THEMED_PAGES,
  fixtureSlug,
  fixtureUrl,
  type BaselinePage,
  type ThemeKey,
} from './matrix';
import {
  expect,
  expectNoIssues,
  openFixture,
  settleImages,
  test,
} from './support/baseline-test';

/**
 * The clear air the ink of two lines must keep between them, as a share of
 * the font size: enough that a hamza or shadda never meets the descender of
 * the word above it.
 */
const MIN_GAP_EM = 0.08;

const HOME: BaselinePage = { name: 'home', path: '/' };

interface Case {
  readonly theme: ThemeKey;
  readonly label: string;
  readonly page: BaselinePage;
  readonly slug: string;
}

function themeCases(theme: ThemeKey, extra: readonly BaselinePage[]): Case[] {
  const cases: Case[] = [];
  for (const state of ['new', 'rich'] as const) {
    for (const page of THEMED_PAGES[state]) {
      cases.push({
        theme,
        label: `${state} ${page.name}`,
        page,
        slug: fixtureSlug(theme, state),
      });
    }
  }
  for (const page of extra) {
    cases.push({
      theme,
      label: `rich ${page.name}`,
      page,
      slug: fixtureSlug(theme, 'rich'),
    });
  }
  cases.push({
    theme,
    label: 'coming-soon',
    page: HOME,
    slug: fixtureSlug(theme, 'unpublished'),
  });
  return cases;
}

function theme1Cases(): Case[] {
  const cases: Case[] = [];
  for (const state of ['new', 'rich'] as const) {
    cases.push({
      theme: 'modern-education',
      label: `${state} home`,
      page: HOME,
      slug: fixtureSlug('modern-education', state, 'default', 'c1'),
    });
    for (const page of THEME1_C1_PAGES[state]) {
      cases.push({
        theme: 'modern-education',
        label: `${state} ${page.name}`,
        page,
        slug: fixtureSlug('modern-education', state, 'default', 'c1'),
      });
    }
  }
  // The v1 compositions existing Academies still have (default slug).
  for (const state of ['new', 'rich'] as const) {
    for (const page of THEMED_PAGES[state]) {
      cases.push({
        theme: 'modern-education',
        label: `v1 ${state} ${page.name}`,
        page,
        slug: fixtureSlug('modern-education', state),
      });
    }
  }
  cases.push({
    theme: 'modern-education',
    label: 'coming-soon',
    page: HOME,
    slug: fixtureSlug('modern-education', 'unpublished'),
  });
  return cases;
}

const CASES: Case[] = [
  ...theme1Cases(),
  ...themeCases('atelier', ATELIER_PAGES),
  ...themeCases('manara', MANARA_PAGES),
  ...themeCases('riwaq', RIWAQ_PAGES),
];

export interface ArabicCollision {
  /** The text block (tag and first classes). */
  readonly element: string;
  /** The word on the upper line and the word below it. */
  readonly above: string;
  readonly below: string;
  readonly fontSize: number;
  /** The block's line-height, as a multiple of its font size. */
  readonly lineHeight: number;
  /** Ink-to-ink distance between the two words, in em (negative = overlap). */
  readonly gap: number;
}

/**
 * Every place where a word's ink comes closer than `minGap` em to the ink of
 * a word on the line above it. Each word is measured in its own font, size
 * and weight (canvas `measureText`) and placed on its rendered baseline
 * (its box top plus the font's ascent); only words that sit over each
 * other count.
 */
function arabicLineCollisions(minGap: number): ArabicCollision[] {
  const ARABIC = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const context = document.createElement('canvas').getContext('2d')!;
  const isBlock = (element: Element) => {
    const display = getComputedStyle(element).display;
    return !display.startsWith('inline') && display !== 'contents';
  };
  const blockOf = (node: Node): Element | null => {
    let element = node.parentElement;
    while (element && !isBlock(element)) element = element.parentElement;
    return element;
  };
  interface Word {
    text: string;
    left: number;
    right: number;
    line: number;
    top: number;
    bottom: number;
  }
  const blocks = new Map<Element, Word[]>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    if (!ARABIC.test(text)) continue;
    const parent = node.parentElement!;
    if (parent.closest('svg, script, style, template, [hidden]')) continue;
    const style = getComputedStyle(parent);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    const block = blockOf(node);
    if (!block || block.getBoundingClientRect().width <= 2) continue;
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const range = document.createRange();
    for (const match of text.matchAll(/\S+/g)) {
      range.setStart(node, match.index!);
      range.setEnd(node, match.index! + match[0].length);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0);
      if (rects.length !== 1) continue; // hyphenated or split by bidi
      const rect = rects[0];
      const metrics = context.measureText(match[0]);
      const baseline = rect.top + metrics.fontBoundingBoxAscent;
      const words = blocks.get(block) ?? [];
      words.push({
        text: match[0],
        left: rect.left,
        right: rect.right,
        line: Math.round(rect.top),
        top: baseline - metrics.actualBoundingBoxAscent,
        bottom: baseline + metrics.actualBoundingBoxDescent,
      });
      blocks.set(block, words);
    }
  }
  const found: ArabicCollision[] = [];
  for (const [block, words] of blocks) {
    const lines = [...new Set(words.map((word) => word.line))].sort(
      (a, b) => a - b
    );
    if (lines.length < 2) continue;
    const style = getComputedStyle(block);
    const fontSize = parseFloat(style.fontSize);
    let worst: ArabicCollision | null = null;
    for (let i = 0; i + 1 < lines.length; i += 1) {
      // Consecutive lines only (a line box is at least half the font tall).
      if (lines[i + 1] - lines[i] > fontSize * 4) continue;
      const upper = words.filter((word) => word.line === lines[i]);
      const lower = words.filter((word) => word.line === lines[i + 1]);
      for (const a of upper) {
        for (const b of lower) {
          if (a.right <= b.left || b.right <= a.left) continue;
          const gap = (b.top - a.bottom) / fontSize;
          if (gap >= minGap || (worst && gap >= worst.gap)) continue;
          const classes = [...block.classList].slice(0, 3).join('.');
          worst = {
            element: `${block.tagName.toLowerCase()}${classes ? `.${classes}` : ''}`,
            above: a.text,
            below: b.text,
            fontSize: Math.round(fontSize * 10) / 10,
            lineHeight:
              style.lineHeight === 'normal'
                ? 0
                : Math.round((parseFloat(style.lineHeight) / fontSize) * 100) /
                  100,
            gap: Math.round(gap * 100) / 100,
          };
        }
      }
    }
    if (worst) found.push(worst);
  }
  return found;
}

test.describe('Arabic line spacing', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  for (const viewport of [
    { name: '390', width: 390, height: 844 },
    { name: '768', width: 768, height: 1024 },
    { name: '1024', width: 1024, height: 768 },
    { name: '1440', width: 1440, height: 900 },
  ]) {
    for (const { theme, label, page, slug } of CASES) {
      test(`${theme} ${label} ar ${viewport.name}`, async ({
        page: browserPage,
        issues,
      }) => {
        await browserPage.setViewportSize(viewport);
        await openFixture(browserPage, fixtureUrl(page, 'ar', slug));
        await settleImages(browserPage);
        await browserPage.evaluate(() => document.fonts.ready);
        const collisions = await browserPage.evaluate(
          arabicLineCollisions,
          MIN_GAP_EM
        );
        expect(collisions).toEqual([]);
        expectNoIssues(issues);
      });
    }
  }
});
