/**
 * Themes 2–5 retirement — verification before anything is deleted
 * (Reports/THEMES_2_5_RETIREMENT.md, step 3).
 *
 * Renders each retired theme's real website twice, as it is today and as
 * the migration leaves it (the fixture server's `migrated` slug: the same
 * pages, sections and brand, theme key set to Theme 1), and checks:
 *   - the migrated page renders through Theme 1's pack, with no page
 *     errors, unmocked calls, CSP violations or horizontal overflow;
 *   - no content is lost: every Owner-authored string of the page's
 *     sections that the current theme shows is still on the page;
 *   - EN is LTR and AR is RTL;
 *   - axe finds no serious or critical violation.
 * Full-page screenshots of both renders are attached to the report for
 * review; they are not a baseline.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import {
  LOCALES,
  THEMED_PAGES,
  THEMES,
  fixtureSlug,
  fixtureUrl,
  type Locale,
} from './matrix';
import {
  expect,
  expectNoIssues,
  openFixture,
  test,
} from './support/baseline-test';

const RETIRED = THEMES.filter((theme) => theme !== 'modern-education');
const GENERATED = join(
  dirname(fileURLToPath(import.meta.url)),
  'fixtures/generated'
);
const VIEWPORTS = [
  { name: '1440', width: 1440, height: 900, device: 'desktop' },
  { name: '390', width: 390, height: 844, device: 'mobile' },
] as const;

interface FixtureSection {
  readonly type: string;
  readonly enabled: boolean;
  readonly visibility?: Record<string, boolean>;
  readonly config: unknown;
}
interface FixturePage {
  readonly slug: string;
  readonly visible: boolean;
  readonly sections: readonly FixtureSection[];
}

/** Every `{ en, ar }` string in a section's config, in one locale. */
function authoredStrings(value: unknown, locale: Locale, into: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) authoredStrings(item, locale, into);
    return;
  }
  if (!value || typeof value !== 'object') return;
  const record = value as Record<string, unknown>;
  if (typeof record.en === 'string' && typeof record.ar === 'string') {
    const text = (record[locale] as string).trim();
    if (text) into.push(text);
    return;
  }
  for (const item of Object.values(record)) authoredStrings(item, locale, into);
}

/**
 * Theme 1's honest-public-site rules (plan §D.4, `t1-live-sections.tsx`,
 * `t1-page-sections.tsx`): a section with nothing real to show is not
 * drawn on the public site — testimonials without a real quote, a gallery
 * without images, statistics with fewer than two real values, instructors
 * when there are none. Themes 2–5 drew such a section's heading over
 * nothing. The section stays stored and appears once it has content, so
 * its heading is not counted as lost; everything else still is. In the
 * fixture's `new` state the Academy has no courses, learners or
 * instructors; in `rich` it has them, so statistics and instructors must
 * still show there.
 */
function hiddenUntilContent(
  section: FixtureSection,
  state: 'new' | 'rich',
  locale: Locale
): boolean {
  const config = section.config as {
    items?: {
      quote?: Record<string, string>;
      sample?: boolean;
      metric?: string;
      value?: Record<string, string>;
    }[];
    images?: unknown[];
  };
  switch (section.type) {
    case 'testimonials':
      return !(config.items ?? []).some(
        (item) => !item.sample && item.quote?.[locale]?.trim()
      );
    case 'gallery':
      return (config.images ?? []).length === 0;
    case 'statistics':
      return (
        state === 'new' &&
        (config.items ?? []).filter(
          (item) => !item.metric && item.value?.[locale]?.trim()
        ).length < 2
      );
    case 'instructors':
      return state === 'new';
    default:
      return false;
  }
}

function pageStrings(
  theme: string,
  path: string,
  locale: Locale,
  device: string,
  state: 'new' | 'rich'
): string[] {
  const fixture = JSON.parse(
    readFileSync(join(GENERATED, `${theme}.json`), 'utf8')
  ) as { pages: FixturePage[] };
  const slug =
    path === '/'
      ? 'home'
      : path.startsWith('/courses/')
        ? 'course-details'
        : path.split('/')[1];
  const page = fixture.pages.find((candidate) => candidate.slug === slug);
  const strings: string[] = [];
  for (const section of page?.sections ?? []) {
    if (!section.enabled || section.visibility?.[device] === false) continue;
    if (hiddenUntilContent(section, state, locale)) continue;
    authoredStrings(section.config, locale, strings);
  }
  return [...new Set(strings)];
}

/** The page's text, whitespace-normalised (textContent: before CSS text-transform). */
async function pageText(page: Page): Promise<string> {
  const text = await page.evaluate(() => document.body.textContent ?? '');
  return text.replace(/\s+/g, ' ');
}

const normalise = (text: string) => text.replace(/\s+/g, ' ');

for (const viewport of VIEWPORTS) {
  test.describe(`retirement ${viewport.name}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const theme of RETIRED) {
      for (const state of ['new', 'rich'] as const) {
        for (const page of THEMED_PAGES[state]) {
          for (const locale of LOCALES) {
            test(`${theme} → Theme 1 ${state} ${page.name} ${locale}`, async ({
              page: browserPage,
              issues,
            }, testInfo) => {
              // As it renders today.
              await openFixture(
                browserPage,
                fixtureUrl(page, locale, fixtureSlug(theme, state))
              );
              const before = await pageText(browserPage);
              await testInfo.attach('before', {
                body: await browserPage.screenshot({ fullPage: true }),
                contentType: 'image/png',
              });

              // After the migration.
              await openFixture(
                browserPage,
                fixtureUrl(
                  page,
                  locale,
                  fixtureSlug(theme, state, 'default', 'migrated')
                )
              );
              await testInfo.attach('after', {
                body: await browserPage.screenshot({ fullPage: true }),
                contentType: 'image/png',
              });
              expectNoIssues(issues);

              await expect(
                browserPage.locator('[data-theme-pack]').first()
              ).toHaveAttribute('data-theme-pack', 'modern-education');
              await expect(browserPage.locator('html')).toHaveAttribute(
                'dir',
                locale === 'ar' ? 'rtl' : 'ltr'
              );

              const overflow = await browserPage.evaluate(
                () =>
                  document.documentElement.scrollWidth -
                  document.documentElement.clientWidth
              );
              expect(overflow, 'horizontal overflow (px)').toBeLessThanOrEqual(
                0
              );

              const after = await pageText(browserPage);
              const shownBefore = pageStrings(
                theme,
                page.path,
                locale,
                viewport.device,
                state
              ).filter((text) => before.includes(normalise(text)));
              const lost = shownBefore.filter(
                (text) => !after.includes(normalise(text))
              );
              expect(lost, 'authored text shown before, missing after').toEqual(
                []
              );

              const axe = await new AxeBuilder({ page: browserPage })
                .withTags([
                  'wcag2a',
                  'wcag2aa',
                  'wcag21a',
                  'wcag21aa',
                  'wcag22aa',
                ])
                .analyze();
              const blocking = axe.violations
                .filter(
                  (violation) =>
                    violation.impact === 'serious' ||
                    violation.impact === 'critical'
                )
                .map(
                  (violation) => `${violation.id} (${violation.nodes.length})`
                );
              expect(blocking, 'serious/critical axe violations').toEqual([]);
            });
          }
        }
      }
    }
  });
}
