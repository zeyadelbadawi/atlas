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
              fixtureSlug('modern-education', sharedCase.state)
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
            fixtureSlug('modern-education', 'new', palette)
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
