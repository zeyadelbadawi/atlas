/**
 * Theme baseline — axe accessibility baseline (Theme 1 plan, Phase 0).
 *
 * Records what axe-core finds today on every themed page (both data
 * states, EN/AR, desktop and mobile widths), the shared surfaces, and
 * Theme 1 under the brand palettes. Each case is a JSON snapshot in
 * `__screenshots__/axe/`, compared exactly: a new violation fails the run,
 * and so does a fixed one until the snapshot is re-recorded
 * (`--update-snapshots`), so every change to the accessibility picture is
 * a reviewed diff.
 *
 * Rules: WCAG 2.0/2.1/2.2 A and AA plus axe best practices. The plan's
 * target (§J.7) is 0 serious/critical; this file records the starting
 * point, it doesn't enforce the target yet.
 */
import AxeBuilder from '@axe-core/playwright';
import {
  BRAND_PALETTES,
  LOCALES,
  SHARED_CASES,
  THEME1_HOME_C1_STATES,
  THEMED_PAGES,
  THEMES,
  fixtureSlug,
  fixtureUrl,
  type BaselinePage,
  type DataState,
  type Locale,
  type ThemeKey,
} from './matrix';
import {
  expect,
  expectNoIssues,
  openFixture,
  test,
} from './support/baseline-test';
import type { Page } from '@playwright/test';

const AXE_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
  'best-practice',
];
const AXE_VIEWPORTS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
] as const;

async function axeSummary(page: Page): Promise<string> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const violations = results.violations
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact ?? 'unknown',
      help: violation.help,
      nodes: violation.nodes.length,
      // A few selectors, enough to find the element; not every node.
      targets: violation.nodes.slice(0, 3).map((node) => node.target.join(' ')),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return `${JSON.stringify({ axeVersion: results.testEngine.version, violations }, null, 2)}\n`;
}

function axeCase(
  title: string,
  snapshot: string[],
  target: {
    page: BaselinePage;
    locale: Locale;
    theme: ThemeKey;
    state: DataState;
    palette?: string;
    composition?: 'c1';
  }
) {
  test(title, async ({ page, issues }) => {
    await openFixture(
      page,
      fixtureUrl(
        target.page,
        target.locale,
        fixtureSlug(
          target.theme,
          target.state,
          target.palette,
          target.composition
        )
      )
    );
    expect(await axeSummary(page)).toMatchSnapshot(snapshot);
    expectNoIssues(issues);
  });
}

for (const viewport of AXE_VIEWPORTS) {
  test.describe(`axe ${viewport.name}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const theme of THEMES) {
      for (const state of ['new', 'rich'] as const) {
        for (const page of THEMED_PAGES[state]) {
          for (const locale of LOCALES) {
            axeCase(
              `${theme} ${state} ${page.name} ${locale}`,
              [
                'axe',
                'themes',
                theme,
                state,
                `${page.name}--${locale}--${viewport.name}.json`,
              ],
              { page, locale, theme, state }
            );
          }
        }
      }
    }

    for (const sharedCase of SHARED_CASES) {
      for (const locale of LOCALES) {
        axeCase(
          `shared ${sharedCase.name} ${locale}`,
          [
            'axe',
            'shared',
            `${sharedCase.name}--${locale}--${viewport.name}.json`,
          ],
          {
            page: sharedCase.page,
            locale,
            theme: 'modern-education',
            state: sharedCase.state,
          }
        );
      }
    }

    for (const state of THEME1_HOME_C1_STATES) {
      for (const locale of LOCALES) {
        axeCase(
          `modern-education c1 home ${state} ${locale}`,
          [
            'axe',
            'themes',
            'modern-education',
            'c1',
            `home--${state}--${locale}--${viewport.name}.json`,
          ],
          {
            page: { name: 'home', path: '/' },
            locale,
            theme: 'modern-education',
            state,
            palette: 'default',
            composition: 'c1',
          }
        );
      }
    }

    for (const palette of BRAND_PALETTES) {
      axeCase(
        `brand modern-education home ${palette}`,
        [
          'axe',
          'brand',
          'modern-education',
          `home--${palette}--en--${viewport.name}.json`,
        ],
        {
          page: { name: 'home', path: '/' },
          locale: 'en',
          theme: 'modern-education',
          state: 'rich',
          palette,
          composition: 'c1',
        }
      );
    }
  });
}
