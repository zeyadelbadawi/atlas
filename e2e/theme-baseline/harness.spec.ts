/**
 * The harness itself: the motion preference each suite claims to run under
 * is the one the browser actually reports. (Until Oct 2026 the config's
 * `use.reducedMotion` never reached the browser; this guards the fix.)
 */
import { fixtureSlug, fixtureUrl } from './matrix';
import { expect, openFixture, test } from './support/baseline-test';

const home = { name: 'home', path: '/' };

async function prefersReducedMotion(
  page: import('@playwright/test').Page
): Promise<boolean> {
  return page.evaluate(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

test('the suite default really emulates prefers-reduced-motion: reduce', async ({
  page,
}) => {
  await openFixture(
    page,
    fixtureUrl(home, 'en', fixtureSlug('atelier', 'new'))
  );
  expect(await prefersReducedMotion(page)).toBe(true);
});

test.describe('opted out', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  test('a case pinned to no-preference really has motion on', async ({
    page,
  }) => {
    await openFixture(
      page,
      fixtureUrl(home, 'en', fixtureSlug('atelier', 'new'))
    );
    expect(await prefersReducedMotion(page)).toBe(false);
  });
});
