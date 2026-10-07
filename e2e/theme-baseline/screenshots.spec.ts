/**
 * Theme baseline — full-page screenshot matrix (Theme 1 plan, Phase 0).
 *
 * Snapshots live in `__screenshots__/`:
 *   themes/<theme>/<state>/<page>--<locale>--<width>.png
 *   shared/<case>--<locale>--<width>.png
 *   brand/modern-education/home--<palette>--en--<width>.png
 *   themes/atelier/{rich,unpublished}/… (Theme 2's extra pages)
 *   brand/atelier/home--<palette>--en--<width>.png
 *   themes/manara/{rich,unpublished}/… (Theme 3's extra pages)
 *   brand/manara/home--<palette>--en--<width>.png
 *
 * Every later phase is compared with these. Themes 2–5 must stay
 * pixel-identical through the whole Theme 1 plan (§G, §J.11); Theme 1's
 * snapshots are expected to change, and are re-recorded deliberately.
 */
import {
  ATELIER_COMING_SOON,
  LEGACY_REDUCED_MOTION,
  ATELIER_PAGES,
  BRAND_PALETTES,
  LOCALES,
  MANARA_COMING_SOON,
  MANARA_PAGES,
  RIWAQ_COMING_SOON,
  RIWAQ_PAGES,
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
  settleImages,
  test,
} from './support/baseline-test';

// Theme 1 and Themes 2–5 keep the motion condition their baselines were
// recorded under; the Atelier and Manara describes below override it with
// real reduced motion.
test.use({ contextOptions: { reducedMotion: LEGACY_REDUCED_MOTION } });

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const theme of THEMES.filter(
      (key) => key !== 'atelier' && key !== 'manara' && key !== 'riwaq'
    )) {
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
    // Atelier (Theme 2) is captured in its final state: real reduced
    // motion (`contextOptions` — the config's `use.reducedMotion` never
    // reaches the browser), so below-the-fold reveals are drawn and the
    // scroll scenes render their static layout. The scenes themselves are
    // covered by atelier-cinematic.spec.ts.
    test.describe('atelier', () => {
      test.use({ contextOptions: { reducedMotion: 'reduce' } });

      for (const state of ['new', 'rich'] as const) {
        for (const page of THEMED_PAGES[state]) {
          for (const locale of LOCALES) {
            test(`atelier ${state} ${page.name} ${locale}`, async ({
              page: browserPage,
              issues,
            }) => {
              await openFixture(
                browserPage,
                fixtureUrl(page, locale, fixtureSlug('atelier', state))
              );
              await expect(browserPage).toHaveScreenshot(
                [
                  'themes',
                  'atelier',
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

      for (const page of ATELIER_PAGES) {
        for (const locale of LOCALES) {
          test(`atelier rich ${page.name} ${locale}`, async ({
            page: browserPage,
            issues,
          }) => {
            await openFixture(
              browserPage,
              fixtureUrl(page, locale, fixtureSlug('atelier', 'rich'))
            );
            await expect(browserPage).toHaveScreenshot(
              [
                'themes',
                'atelier',
                'rich',
                `${page.name}--${locale}--${viewport.name}.png`,
              ],
              { fullPage: true }
            );
            expectNoIssues(issues);
          });
        }
      }

      for (const locale of LOCALES) {
        test(`atelier coming-soon ${locale}`, async ({
          page: browserPage,
          issues,
        }) => {
          await openFixture(
            browserPage,
            fixtureUrl(
              ATELIER_COMING_SOON.page,
              locale,
              fixtureSlug('atelier', ATELIER_COMING_SOON.state)
            )
          );
          await expect(browserPage).toHaveScreenshot(
            [
              'themes',
              'atelier',
              'unpublished',
              `coming-soon--${locale}--${viewport.name}.png`,
            ],
            { fullPage: true }
          );
          expectNoIssues(issues);
        });
      }

      for (const palette of BRAND_PALETTES) {
        test(`brand atelier home ${palette}`, async ({
          page: browserPage,
          issues,
        }) => {
          await openFixture(
            browserPage,
            fixtureUrl(
              { name: 'home', path: '/' },
              'en',
              fixtureSlug('atelier', 'rich', palette)
            )
          );
          await expect(browserPage).toHaveScreenshot(
            ['brand', 'atelier', `home--${palette}--en--${viewport.name}.png`],
            { fullPage: true }
          );
          expectNoIssues(issues);
        });
      }
    });

    // Manara (Theme 3) is captured the same way as Atelier: real reduced
    // motion, so its `Reveal` entrances are drawn in their final state and
    // the beam seams render their static layout (plan §5: reduced motion =
    // final state).
    test.describe('manara', () => {
      test.use({ contextOptions: { reducedMotion: 'reduce' } });
      // `settleImages` scrolls each page and waits for every photograph.
      test.slow();

      for (const state of ['new', 'rich'] as const) {
        for (const page of THEMED_PAGES[state]) {
          for (const locale of LOCALES) {
            test(`manara ${state} ${page.name} ${locale}`, async ({
              page: browserPage,
              issues,
            }) => {
              await openFixture(
                browserPage,
                fixtureUrl(page, locale, fixtureSlug('manara', state))
              );
              await settleImages(browserPage);
              await expect(browserPage).toHaveScreenshot(
                [
                  'themes',
                  'manara',
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

      for (const page of MANARA_PAGES) {
        for (const locale of LOCALES) {
          test(`manara rich ${page.name} ${locale}`, async ({
            page: browserPage,
            issues,
          }) => {
            await openFixture(
              browserPage,
              fixtureUrl(page, locale, fixtureSlug('manara', 'rich'))
            );
            await settleImages(browserPage);
            await expect(browserPage).toHaveScreenshot(
              [
                'themes',
                'manara',
                'rich',
                `${page.name}--${locale}--${viewport.name}.png`,
              ],
              { fullPage: true }
            );
            expectNoIssues(issues);
          });
        }
      }

      for (const locale of LOCALES) {
        test(`manara coming-soon ${locale}`, async ({
          page: browserPage,
          issues,
        }) => {
          await openFixture(
            browserPage,
            fixtureUrl(
              MANARA_COMING_SOON.page,
              locale,
              fixtureSlug('manara', MANARA_COMING_SOON.state)
            )
          );
          await settleImages(browserPage);
          await expect(browserPage).toHaveScreenshot(
            [
              'themes',
              'manara',
              'unpublished',
              `coming-soon--${locale}--${viewport.name}.png`,
            ],
            { fullPage: true }
          );
          expectNoIssues(issues);
        });
      }

      for (const palette of BRAND_PALETTES) {
        test(`brand manara home ${palette}`, async ({
          page: browserPage,
          issues,
        }) => {
          await openFixture(
            browserPage,
            fixtureUrl(
              { name: 'home', path: '/' },
              'en',
              fixtureSlug('manara', 'rich', palette)
            )
          );
          await settleImages(browserPage);
          await expect(browserPage).toHaveScreenshot(
            ['brand', 'manara', `home--${palette}--en--${viewport.name}.png`],
            { fullPage: true }
          );
          expectNoIssues(issues);
        });
      }
    });

    // Riwaq (Theme 4) is captured like Atelier and Manara: real reduced
    // motion, so its `Reveal` entrances are drawn in their final state and
    // the colonnade, windows and figures render their final state (plan §5: reduced motion =
    // final state).
    test.describe('riwaq', () => {
      test.use({ contextOptions: { reducedMotion: 'reduce' } });
      // `settleImages` scrolls each page and waits for every photograph.
      test.slow();

      for (const state of ['new', 'rich'] as const) {
        for (const page of THEMED_PAGES[state]) {
          for (const locale of LOCALES) {
            test(`riwaq ${state} ${page.name} ${locale}`, async ({
              page: browserPage,
              issues,
            }) => {
              await openFixture(
                browserPage,
                fixtureUrl(page, locale, fixtureSlug('riwaq', state))
              );
              await settleImages(browserPage);
              await expect(browserPage).toHaveScreenshot(
                [
                  'themes',
                  'riwaq',
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

      for (const page of RIWAQ_PAGES) {
        for (const locale of LOCALES) {
          test(`riwaq rich ${page.name} ${locale}`, async ({
            page: browserPage,
            issues,
          }) => {
            await openFixture(
              browserPage,
              fixtureUrl(page, locale, fixtureSlug('riwaq', 'rich'))
            );
            await settleImages(browserPage);
            await expect(browserPage).toHaveScreenshot(
              [
                'themes',
                'riwaq',
                'rich',
                `${page.name}--${locale}--${viewport.name}.png`,
              ],
              { fullPage: true }
            );
            expectNoIssues(issues);
          });
        }
      }

      for (const locale of LOCALES) {
        test(`riwaq coming-soon ${locale}`, async ({
          page: browserPage,
          issues,
        }) => {
          await openFixture(
            browserPage,
            fixtureUrl(
              RIWAQ_COMING_SOON.page,
              locale,
              fixtureSlug('riwaq', RIWAQ_COMING_SOON.state)
            )
          );
          await settleImages(browserPage);
          await expect(browserPage).toHaveScreenshot(
            [
              'themes',
              'riwaq',
              'unpublished',
              `coming-soon--${locale}--${viewport.name}.png`,
            ],
            { fullPage: true }
          );
          expectNoIssues(issues);
        });
      }

      for (const palette of BRAND_PALETTES) {
        test(`brand riwaq home ${palette}`, async ({
          page: browserPage,
          issues,
        }) => {
          await openFixture(
            browserPage,
            fixtureUrl(
              { name: 'home', path: '/' },
              'en',
              fixtureSlug('riwaq', 'rich', palette)
            )
          );
          await settleImages(browserPage);
          await expect(browserPage).toHaveScreenshot(
            ['brand', 'riwaq', `home--${palette}--en--${viewport.name}.png`],
            { fullPage: true }
          );
          expectNoIssues(issues);
        });
      }
    });
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

// Riwaq (Theme 4) is also captured at the tablet width, where its colonnade
// steps from four to eight columns and the explorer becomes side by side
// (plan §9). Themes 1–3 keep their approved three-width matrix.
test.describe('768px riwaq tablet', () => {
  test.use({
    viewport: { width: 768, height: 1024 },
    contextOptions: { reducedMotion: 'reduce' },
  });
  test.slow();

  const cases = [
    ...THEMED_PAGES.new.map((page) => ({ state: 'new' as const, page })),
    ...THEMED_PAGES.rich.map((page) => ({ state: 'rich' as const, page })),
    ...RIWAQ_PAGES.map((page) => ({ state: 'rich' as const, page })),
  ];
  for (const { state, page } of cases) {
    for (const locale of LOCALES) {
      test(`riwaq ${state} ${page.name} ${locale} 768`, async ({
        page: browserPage,
        issues,
      }) => {
        await openFixture(
          browserPage,
          fixtureUrl(page, locale, fixtureSlug('riwaq', state))
        );
        await settleImages(browserPage);
        await expect(browserPage).toHaveScreenshot(
          ['themes', 'riwaq', state, `${page.name}--${locale}--768.png`],
          { fullPage: true }
        );
        expectNoIssues(issues);
      });
    }
  }

  for (const locale of LOCALES) {
    test(`riwaq coming-soon ${locale} 768`, async ({
      page: browserPage,
      issues,
    }) => {
      await openFixture(
        browserPage,
        fixtureUrl(
          RIWAQ_COMING_SOON.page,
          locale,
          fixtureSlug('riwaq', RIWAQ_COMING_SOON.state)
        )
      );
      await settleImages(browserPage);
      await expect(browserPage).toHaveScreenshot(
        ['themes', 'riwaq', 'unpublished', `coming-soon--${locale}--768.png`],
        { fullPage: true }
      );
      expectNoIssues(issues);
    });
  }
});
