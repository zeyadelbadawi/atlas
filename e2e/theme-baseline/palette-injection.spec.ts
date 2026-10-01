/**
 * The injectable fixture brand palette actually reaches the renderer.
 *
 * Phase 0 injects the brand an Academy can store today (three HSL seeds);
 * `WebsiteThemeScope` maps them to `--website-*` variables. Later phases
 * inject a full semantic palette the same way (the fixture server's
 * `--<palette>` slug suffix), so this guard proves the injection path
 * before anything depends on it.
 *
 * Since Phase 4, Theme 1 maps the seeds through its own semantic mapping
 * (§F.5) instead of passing them through: for it, the guard checks the
 * scope carries exactly what that mapping makes of the injected seeds.
 */
import { FIXTURE_PALETTES } from './fixtures/live-data.mjs';
import { mapModernEducationBrandPalette } from '../../src/features/website/modern-education/modern-education.brand-mapping';
import { MODERN_EDUCATION_THEME } from '../../src/features/website/themes/modern-education.theme';
import { fixtureSlug, fixtureUrl, THEMES } from './matrix';
import {
  expect,
  expectNoIssues,
  openFixture,
  test,
} from './support/baseline-test';

const home = { name: 'home', path: '/' };

for (const theme of THEMES) {
  for (const palette of ['default', 'orange', 'neon-yellow'] as const) {
    test(`${theme} renders the injected ${palette} brand`, async ({
      page,
      issues,
    }) => {
      await openFixture(
        page,
        fixtureUrl(home, 'en', fixtureSlug(theme, 'new', palette))
      );
      const scopeVariables = await page
        .locator('.website-theme-scope')
        .first()
        .evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            primary: style.getPropertyValue('--website-primary').trim(),
            secondary: style.getPropertyValue('--website-secondary').trim(),
            accent: style.getPropertyValue('--website-accent').trim(),
          };
        });
      const seeds = FIXTURE_PALETTES[palette];
      if (theme === 'modern-education') {
        const mapped = mapModernEducationBrandPalette({
          theme: MODERN_EDUCATION_THEME,
          seeds: {
            primary: seeds.primaryColor,
            secondary: seeds.secondaryColor,
            accent: seeds.accentColor,
          },
        });
        expect(scopeVariables).toEqual({
          primary: mapped['--website-primary'],
          secondary: mapped['--website-secondary'],
          accent: mapped['--website-accent'],
        });
      } else {
        expect(scopeVariables).toEqual({
          primary: seeds.primaryColor,
          secondary: seeds.secondaryColor,
          accent: seeds.accentColor,
        });
      }
      expectNoIssues(issues);
    });
  }
}

test('an unknown fixture slug resolves like an unknown hostname', async ({
  page,
}) => {
  await openFixture(page, '/?__atlas_academy_preview=fx--no-such-theme--new');
  // `PublicWebsiteStatus` 'not-found' — the same state a real unknown host gets.
  // Its title is the page's `h1` (Theme 1 plan Phase 8: the status page is
  // the whole document, so it carries the top-level heading).
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Website not found'
  );
  await expect(page.getByText('Horizon Academy')).toHaveCount(0);
});
