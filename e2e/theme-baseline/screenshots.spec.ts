/**
 * Theme baseline — full-page screenshot matrix (Theme 1 plan, Phase 0).
 *
 * Snapshots live in `__screenshots__/`:
 *   themes/<theme>/<state>/<page>--<locale>--<width>.png
 *   shared/<case>--<locale>--<width>.png
 *   brand/modern-education/home--<palette>--en--<width>.png
 *
 * Every later phase is compared with these. Themes 2–5 must stay
 * pixel-identical through the whole Theme 1 plan (§G, §J.11); Theme 1's
 * snapshots are expected to change, and are re-recorded deliberately.
 */
import {
  BRAND_PALETTES,
  LOCALES,
  SHARED_CASES,
  SHARED_CASE_THEME,
  THEME1_BRAND_PAGES,
  THEME1_C1_PAGES,
  THEME1_COMING_SOON,
  THEME1_HOME_C1_STATES,
  THEMED_PAGES,
  THEMES,
  VIEWPORTS,
  fixtureSlug,
  fixtureUrl,
} from './matrix';
import {
  expect,
  expectNoIssues,
  openFixture,
  test,
} from './support/baseline-test';

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const theme of THEMES) {
      for (const state of ['new', 'rich'] as const) {
        for (const page of THEMED_PAGES[state]) {
          for (const locale of LOCALES) {
            test(`${theme} ${state} ${page.name} ${locale}`, async ({
              page: browserPage,
              issues,
            }) => {
              await openFixture(
                browserPage,
                fixtureUrl(page, locale, fixtureSlug(theme, state))
              );
              await expect(browserPage).toHaveScreenshot(
                [
                  'themes',
                  theme,
                  state,
                  `${page.name}--${locale}--${viewport.name}.png`,
                ],
                { fullPage: true }
              );
              expectNoIssues(issues);
            });
          }
        }
      }
    }

    for (const sharedCase of SHARED_CASES) {
      for (const locale of LOCALES) {
        test(`shared ${sharedCase.name} ${locale}`, async ({
          page: browserPage,
          issues,
        }) => {
          await openFixture(
            browserPage,
            fixtureUrl(
              sharedCase.page,
              locale,
              fixtureSlug(SHARED_CASE_THEME, sharedCase.state)
            )
          );
          await expect(browserPage).toHaveScreenshot(
            ['shared', `${sharedCase.name}--${locale}--${viewport.name}.png`],
            { fullPage: true }
          );
          expectNoIssues(issues);
        });
      }
    }

    for (const state of THEME1_HOME_C1_STATES) {
      for (const locale of LOCALES) {
        test(`modern-education c1 home ${state} ${locale}`, async ({
          page: browserPage,
          issues,
        }) => {
          await openFixture(
            browserPage,
            fixtureUrl(
              { name: 'home', path: '/' },
              locale,
              fixtureSlug('modern-education', state, 'default', 'c1')
            )
          );
          await expect(browserPage).toHaveScreenshot(
            [
              'themes',
              'modern-education',
              'c1',
              `home--${state}--${locale}--${viewport.name}.png`,
            ],
            { fullPage: true }
          );
          expectNoIssues(issues);
        });
      }
    }

    for (const state of ['new', 'rich'] as const) {
      for (const page of THEME1_C1_PAGES[state]) {
        for (const locale of LOCALES) {
          test(`modern-education c1 ${page.name} ${state} ${locale}`, async ({
            page: browserPage,
            issues,
          }) => {
            await openFixture(
              browserPage,
              fixtureUrl(
                page,
                locale,
                fixtureSlug('modern-education', state, 'default', 'c1')
              )
            );
            await expect(browserPage).toHaveScreenshot(
              [
                'themes',
                'modern-education',
                'c1',
                `${page.name}--${state}--${locale}--${viewport.name}.png`,
              ],
              { fullPage: true }
            );
            expectNoIssues(issues);
          });
        }
      }
    }

    for (const locale of LOCALES) {
      test(`modern-education coming-soon ${locale}`, async ({
        page: browserPage,
        issues,
      }) => {
        await openFixture(
          browserPage,
          fixtureUrl(
            THEME1_COMING_SOON.page,
            locale,
            fixtureSlug('modern-education', THEME1_COMING_SOON.state)
          )
        );
        await expect(browserPage).toHaveScreenshot(
          [
            'themes',
            'modern-education',
            'unpublished',
            `coming-soon--${locale}--${viewport.name}.png`,
          ],
          { fullPage: true }
        );
        expectNoIssues(issues);
      });
    }

    for (const palette of BRAND_PALETTES) {
      test(`brand modern-education home ${palette}`, async ({
        page: browserPage,
        issues,
      }) => {
        await openFixture(
          browserPage,
          fixtureUrl(
            { name: 'home', path: '/' },
            'en',
            fixtureSlug('modern-education', 'rich', palette, 'c1')
          )
        );
        await expect(browserPage).toHaveScreenshot(
          [
            'brand',
            'modern-education',
            `home--${palette}--en--${viewport.name}.png`,
          ],
          { fullPage: true }
        );
        expectNoIssues(issues);
      });
    }
  });
}

test.describe('brand matrix, Theme 1 inner pages (1440)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const palette of BRAND_PALETTES) {
    for (const { page, state } of THEME1_BRAND_PAGES) {
      test(`brand modern-education ${page.name} ${palette}`, async ({
        page: browserPage,
        issues,
      }) => {
        await openFixture(
          browserPage,
          fixtureUrl(
            page,
            'en',
            fixtureSlug(
              'modern-education',
              state,
              palette,
              state === 'unpublished' ? undefined : 'c1'
            )
          )
        );
        await expect(browserPage).toHaveScreenshot(
          [
            'brand',
            'modern-education',
            `${page.name}--${palette}--en--1440.png`,
          ],
          { fullPage: true }
        );
        expectNoIssues(issues);
      });
    }
  }
});

test.describe('first visit', () => {
  // The consent banner is what every visitor sees first; captured once per
  // width instead of covering every page above.
  test.use({ seedConsent: false });

  for (const viewport of VIEWPORTS) {
    test(`shared first-visit ${viewport.name}`, async ({
      page: browserPage,
      issues,
    }) => {
      await browserPage.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await openFixture(
        browserPage,
        fixtureUrl(
          { name: 'home', path: '/' },
          'en',
          fixtureSlug('modern-education', 'new')
        )
      );
      await expect(browserPage).toHaveScreenshot([
        'shared',
        `first-visit--en--${viewport.name}.png`,
      ]);
      expectNoIssues(issues);
    });
  }
});
