/**
 * Each public site downloads only its own theme pack
 * (src/features/website/theme-packs/theme-pack.loader.ts): a Theme 1 page
 * fetches none of Atelier's or Manara's code or CSS, an Atelier page none
 * of Theme 1's or Manara's, a Manara page none of Theme 1's or Atelier's,
 * and a retired (base-pack) theme none of the three. Runs in both modes of
 * the fixture server (single-page app, and THEME_BASELINE_SSR=1), where it
 * also checks the server-rendered head and the hydration.
 *
 * What identifies a theme's code, beyond its chunk and stylesheet names:
 *   - Atelier's components use `at-*` classes (`at-lead`, `at-label`…) and
 *     its stylesheet is scoped to `[data-theme-pack=atelier]`;
 *   - Manara's components use `mn-*` classes (`mn-lead`, `mn-label`…) and
 *     its stylesheet is scoped to `[data-theme-pack=manara]`;
 *   - Theme 1's components use `t1-*` classes and its stylesheet is scoped
 *     to `[data-theme-pack=modern-education]`.
 */
import type { Page } from '@playwright/test';
import { LOCALES, fixtureSlug, fixtureUrl, type ThemeKey } from './matrix';
import {
  expect,
  expectNoIssues,
  openFixture,
  test,
} from './support/baseline-test';

interface ThemeCode {
  readonly fileName: RegExp;
  readonly script: RegExp;
  readonly stylesheet: RegExp;
}

const ATELIER: ThemeCode = {
  fileName: /atelier/i,
  script: /["'\s]at-(?:lead|label|subtitle|link|btn)[\s"']/,
  stylesheet: /data-theme-pack=["']?atelier/,
};
const MANARA: ThemeCode = {
  fileName: /manara/i,
  script: /["'\s]mn-(?:lead|label|subtitle|link|btn)[\s"']/,
  stylesheet: /data-theme-pack=["']?manara/,
};
const RIWAQ: ThemeCode = {
  fileName: /riwaq/i,
  script: /["'\s]rw-(?:lead|label|subtitle|link|btn)[\s"']/,
  stylesheet: /data-theme-pack=["']?riwaq/,
};
const THEME_1: ThemeCode = {
  fileName: /modern-education/i,
  script: /["'\s]t1-[a-z]/,
  stylesheet: /data-theme-pack=["']?modern-education/,
};

interface Fetched {
  readonly path: string;
  readonly type: 'script' | 'stylesheet';
  readonly body: string;
}

/** Every script and stylesheet the page fetched, with its body. */
function recordAssets(page: Page): Fetched[] {
  const fetched: Fetched[] = [];
  page.on('response', async (response) => {
    const type = response.request().resourceType();
    if (type !== 'script' && type !== 'stylesheet') return;
    const body = await response.text().catch(() => '');
    fetched.push({ path: new URL(response.url()).pathname, type, body });
  });
  return fetched;
}

function expectNone(
  fetched: readonly Fetched[],
  code: ThemeCode,
  what: string
) {
  expect(
    fetched
      .filter((asset) => code.fileName.test(asset.path))
      .map((a) => a.path),
    `${what}: files`
  ).toEqual([]);
  expect(
    fetched
      .filter(
        (asset) => asset.type === 'script' && code.script.test(asset.body)
      )
      .map((a) => a.path),
    `${what}: scripts carrying its components`
  ).toEqual([]);
  expect(
    fetched
      .filter(
        (asset) =>
          asset.type === 'stylesheet' && code.stylesheet.test(asset.body)
      )
      .map((a) => a.path),
    `${what}: stylesheets carrying its rules`
  ).toEqual([]);
}

function expectSome(
  fetched: readonly Fetched[],
  code: ThemeCode,
  what: string
) {
  expect(
    fetched.some((a) => a.type === 'script' && code.script.test(a.body)),
    `${what}: its components`
  ).toBe(true);
  expect(
    fetched.some(
      (a) => a.type === 'stylesheet' && code.stylesheet.test(a.body)
    ),
    `${what}: its stylesheet`
  ).toBe(true);
}

const CASES: ReadonlyArray<{
  readonly name: string;
  readonly theme: ThemeKey;
  readonly slug: string;
  readonly own?: ThemeCode;
  readonly others: readonly ThemeCode[];
}> = [
  {
    name: 'Theme 1 (template v2)',
    theme: 'modern-education',
    slug: fixtureSlug('modern-education', 'rich', 'default', 'c1'),
    own: THEME_1,
    others: [ATELIER, MANARA, RIWAQ],
  },
  {
    name: 'Theme 1 (v1 website)',
    theme: 'modern-education',
    slug: fixtureSlug('modern-education', 'new'),
    own: THEME_1,
    others: [ATELIER, MANARA, RIWAQ],
  },
  {
    name: 'Atelier',
    theme: 'atelier',
    slug: fixtureSlug('atelier', 'rich'),
    own: ATELIER,
    others: [THEME_1, MANARA, RIWAQ],
  },
  {
    name: 'Manara',
    theme: 'manara',
    slug: fixtureSlug('manara', 'rich'),
    own: MANARA,
    others: [THEME_1, ATELIER, RIWAQ],
  },
  {
    name: 'Riwaq',
    theme: 'riwaq',
    slug: fixtureSlug('riwaq', 'rich'),
    own: RIWAQ,
    others: [THEME_1, ATELIER, MANARA],
  },
  {
    name: 'a retired theme (base pack)',
    theme: 'premium-academy',
    slug: fixtureSlug('premium-academy', 'new'),
    others: [ATELIER, MANARA, RIWAQ, THEME_1],
  },
];

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'course-details', path: '/courses/fx-course-1' },
];

for (const testCase of CASES) {
  for (const page of PAGES) {
    for (const locale of LOCALES) {
      test(`${testCase.name} ${page.name} ${locale} downloads only its own theme`, async ({
        page: browserPage,
        issues,
      }) => {
        const fetched = recordAssets(browserPage);
        await openFixture(browserPage, fixtureUrl(page, locale, testCase.slug));
        await expect(
          browserPage.locator(`[data-theme-pack="${testCase.theme}"]`).first()
        ).toBeVisible();

        for (const other of testCase.others)
          expectNone(fetched, other, 'other theme');
        if (testCase.own) expectSome(fetched, testCase.own, 'own theme');

        // Server-rendered (THEME_BASELINE_SSR=1): the theme stylesheet is in
        // the head, in front of the app's own, and hydration kept the
        // server's markup.
        const ssr = await browserPage.evaluate(() => {
          const payload = document.getElementById('__atlas_ssr__');
          const sheets = Array.from(
            document.head.querySelectorAll('link[rel="stylesheet"]')
          ).map((link) => link.getAttribute('data-theme-stylesheet') ?? 'app');
          return {
            rendered: !!payload,
            themePacks: payload
              ? (JSON.parse(payload.textContent ?? '{}').themePacks ?? null)
              : null,
            sheets,
            recovered:
              document.getElementById('root')?.dataset.hydrationRecovered ??
              null,
          };
        });
        const ownStylesheets = testCase.own ? [testCase.theme] : [];
        expect(ssr.sheets, 'theme stylesheets come first').toEqual([
          ...ownStylesheets,
          'app',
        ]);
        if (ssr.rendered) {
          expect(ssr.themePacks).toEqual([testCase.theme]);
          expect(ssr.recovered, 'hydration mismatch').toBeNull();
        }
        expectNoIssues(issues);
      });
    }
  }
}
