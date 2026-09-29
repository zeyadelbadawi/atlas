/**
 * The injectable fixture brand palette actually reaches the renderer.
 *
 * Phase 0 injects the brand an Academy can store today (three HSL seeds);
 * `WebsiteThemeScope` maps them to `--website-*` variables. Later phases
 * inject a full semantic palette the same way (the fixture server's
 * `--<palette>` slug suffix), so this guard proves the injection path
 * before anything depends on it.
 */
import { FIXTURE_PALETTES } from './fixtures/live-data.mjs';
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
      expect(scopeVariables).toEqual({
        primary: seeds.primaryColor,
        secondary: seeds.secondaryColor,
        accent: seeds.accentColor,
      });
      expectNoIssues(issues);
    });
  }
}

test('an unknown fixture slug resolves like an unknown hostname', async ({
  page,
}) => {
  await openFixture(page, '/?__atlas_academy_preview=fx--no-such-theme--new');
  // `PublicWebsiteStatus` 'not-found' — the same state a real unknown host gets.
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('heading', { level: 3 })).toHaveText(
    'Website not found'
  );
  await expect(page.getByText('Horizon Academy')).toHaveCount(0);
});
