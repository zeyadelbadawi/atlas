/**
 * J34 — the cookie consent banner on an Academy's public website wears
 * that Academy's palette, not the Atlas dashboard's (Workstream 1).
 * Chromium against the real stack and database.
 *
 * Before: the banner and its preferences dialog were mounted outside every
 * website theme scope, so the Accept button was Atlas Deep Teal on every
 * Academy site, and the whole banner turned dark for a visitor whose OS
 * prefers dark mode.
 *
 * Two seeded Academies get two very different palettes (a deep magenta
 * and a light amber). On each, in English and Arabic (RTL), on a desktop
 * and a 390px phone, and with the OS in dark mode:
 *  - the Accept button paints exactly the `--primary` that Academy's own
 *    page scope declares (its brand, contrast-checked), never teal;
 *  - its label reaches 4.5:1, and the banner stays light;
 *  - axe finds no serious/critical violation inside the banner;
 *  - the preferences dialog opens inside the same palette;
 *  - Accept, then reload: the banner is gone.
 * Moving from one Academy's site to the other's in the same tab carries
 * nothing of the first palette over. Both palettes are restored afterwards.
 */
import {
  test,
  expect,
  type APIRequestContext,
  type Browser,
  type Page,
} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  ACADEMY_PREVIEW_PARAM,
  ACADEMY_SLUG,
  API_BASE,
  SEED,
  apiGet,
  apiSignIn,
  authHeader,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import { captureEvidence } from './support/evidence';

test.describe.configure({ mode: 'serial' });

const SECOND_SLUG = 'language-learning-hub';
const SECOND_OWNER = 'omar.hassan@nextgen-learning.dev';

/** Far from Atlas teal (184°) and from each other. */
const MAGENTA = '330 81% 36%';
/** A light brand: white text would fail on it. */
const AMBER = '45 100% 55%';
const ATLAS_TEAL_HUE = 184;

const at = (slug: string, path: string) =>
  `${path}${path.includes('?') ? '&' : '?'}${ACADEMY_PREVIEW_PARAM}=${slug}`;

interface Academy {
  readonly slug: string;
  readonly seed: string;
  id: string;
  owner: Session;
  original: { name: string; brand: Record<string, unknown> };
}

const ACADEMIES: Academy[] = [
  { slug: ACADEMY_SLUG, seed: MAGENTA } as Academy,
  { slug: SECOND_SLUG, seed: AMBER } as Academy,
];

const VARIANTS = [
  { name: 'en desktop', locale: '', width: 1280, dark: false },
  { name: 'ar desktop', locale: '/ar', width: 1280, dark: false },
  { name: 'en phone', locale: '', width: 390, dark: false },
  { name: 'ar phone', locale: '/ar', width: 390, dark: false },
  { name: 'en os-dark', locale: '', width: 1280, dark: true },
] as const;

type Rgb = [number, number, number];

function parseRgb(css: string): Rgb {
  const parts = css.match(/[\d.]+/g)?.map(Number) ?? [];
  return [parts[0] ?? NaN, parts[1] ?? NaN, parts[2] ?? NaN];
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

function hueOf([r, g, b]: Rgb): number {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const d = max - Math.min(rn, gn, bn);
  if (d === 0) return 0;
  const h =
    max === rn
      ? ((gn - bn) / d) % 6
      : max === gn
        ? (bn - rn) / d + 2
        : (rn - gn) / d + 4;
  return (h * 60 + 360) % 360;
}

const hueDistance = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** What the banner paints, and what the page itself declares as `--primary`. */
async function readBanner(page: Page) {
  const banner = page.getByTestId('cookie-consent-banner');
  await expect(banner).toBeVisible();
  // The page's own theme scope (not the consent overlay's).
  await expect(
    page
      .locator(
        '.website-theme-scope[data-theme-pack]:not([data-website-overlay-scope])'
      )
      .first()
  ).toBeAttached();
  return page.evaluate(() => {
    const bannerEl = document.querySelector<HTMLElement>(
      '[data-testid="cookie-consent-banner"]'
    )!;
    const buttons = bannerEl.querySelectorAll<HTMLElement>('button');
    const accept = buttons[buttons.length - 1]!;
    const pageScope = document.querySelector<HTMLElement>(
      '.website-theme-scope[data-theme-pack]:not([data-website-overlay-scope])'
    )!;
    // Resolve the page scope's `--primary` to a colour the same way the
    // button does.
    const probe = document.createElement('div');
    probe.style.backgroundColor = 'hsl(var(--primary))';
    pageScope.appendChild(probe);
    const pagePrimary = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const acceptStyle = getComputedStyle(accept);
    return {
      acceptBackground: acceptStyle.backgroundColor,
      acceptColor: acceptStyle.color,
      bannerBackground: getComputedStyle(bannerEl).backgroundColor,
      bannerColor: getComputedStyle(bannerEl).color,
      bannerDirection: getComputedStyle(bannerEl).direction,
      insideOverlayScope: !!bannerEl.closest(
        '.website-theme-scope[data-website-overlay-scope]'
      ),
      pagePrimary,
      htmlDir: document.documentElement.dir,
      htmlDark: document.documentElement.classList.contains('dark'),
      overflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    };
  });
}

async function newPage(
  browser: Browser,
  width: number,
  dark: boolean
): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    colorScheme: dark ? 'dark' : 'light',
  });
  return context.newPage();
}

test.describe('J34 — the cookie banner follows each Academy’s palette', () => {
  async function saveBrand(
    request: APIRequestContext,
    academy: Academy,
    brand: Record<string, unknown>
  ) {
    const saved = await request.put(
      `${API_BASE}/academies/${academy.id}/visual-identity`,
      {
        headers: authHeader(academy.owner),
        data: { name: academy.original.name, brand },
      }
    );
    expect(saved.status(), await saved.text()).toBe(200);
  }

  test.beforeAll(async ({ request }) => {
    test.setTimeout(120_000);
    await clearAuthRateLimits();
    const owners = [SEED.owner, SECOND_OWNER];
    for (const [index, academy] of ACADEMIES.entries()) {
      const resolved = await request.get(
        `${API_BASE}/public/websites/resolve`,
        { params: { hostname: academy.slug } }
      );
      expect(resolved.ok(), `resolve ${academy.slug}`).toBeTruthy();
      academy.id = (await resolved.json()).academyId;
      academy.owner = await apiSignIn(request, {
        email: owners[index]!,
        password: SEED.password,
        surface: 'management',
      });
      const detail = await (
        await apiGet(request, academy.owner, `/academies/${academy.id}`)
      ).json();
      const config = await (
        await apiGet(
          request,
          academy.owner,
          `/academies/${academy.id}/website/configuration`
        )
      ).json();
      academy.original = { name: detail.name, brand: config.brand };
      await saveBrand(request, academy, {
        palette: {
          seeds: { primary: academy.seed },
          status: 'confirmed',
          source: 'manual',
        },
      });
    }
  });

  test.afterAll(async ({ request }) => {
    for (const academy of ACADEMIES) {
      if (!academy.original) continue;
      // Back to exactly what was there (the seed has legacy colours only).
      await saveBrand(request, academy, {
        palette: academy.original.brand.palette ?? null,
        primaryColor: academy.original.brand.primaryColor,
        secondaryColor: academy.original.brand.secondaryColor,
        accentColor: academy.original.brand.accentColor,
      });
    }
  });

  for (const variant of VARIANTS) {
    test(`both Academies, ${variant.name}`, async ({ browser }) => {
      test.setTimeout(120_000);
      const painted: string[] = [];
      for (const academy of ACADEMIES) {
        // A fresh context per Academy: consent is stored per origin, and
        // locally both sites share one.
        const page = await newPage(browser, variant.width, variant.dark);
        await page.goto(at(academy.slug, `${variant.locale}/`));
        const seen = await readBanner(page);
        const label = `${academy.slug} ${variant.name}`;

        expect(seen.insideOverlayScope, label).toBe(true);
        // Exactly this Academy's primary, as its own page declares it.
        expect(seen.acceptBackground, label).toBe(seen.pagePrimary);
        const fill = parseRgb(seen.acceptBackground);
        expect(
          hueDistance(hueOf(fill), Number(academy.seed.split(' ')[0])),
          `${label}: ${seen.acceptBackground} is the brand hue`
        ).toBeLessThan(20);
        expect(
          hueDistance(hueOf(fill), ATLAS_TEAL_HUE),
          `${label}: not Atlas teal`
        ).toBeGreaterThan(60);
        expect(
          contrast(fill, parseRgb(seen.acceptColor)),
          `${label}: Accept label contrast`
        ).toBeGreaterThanOrEqual(4.5);
        // Light whatever the OS prefers, with legible text.
        expect(
          luminance(parseRgb(seen.bannerBackground)),
          `${label}: banner stays light`
        ).toBeGreaterThan(0.8);
        expect(
          contrast(parseRgb(seen.bannerBackground), parseRgb(seen.bannerColor)),
          `${label}: banner text contrast`
        ).toBeGreaterThanOrEqual(4.5);
        if (variant.dark) expect(seen.htmlDark, label).toBe(true);
        expect(seen.htmlDir, label).toBe(variant.locale ? 'rtl' : 'ltr');
        expect(seen.bannerDirection, label).toBe(
          variant.locale ? 'rtl' : 'ltr'
        );
        expect(seen.overflow, `${label}: no horizontal overflow`).toBe(false);

        const axe = await new AxeBuilder({ page })
          .include('[data-testid="cookie-consent-banner"]')
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        expect(
          axe.violations
            .filter((v) => v.impact === 'serious' || v.impact === 'critical')
            .map((v) => `${v.id}: ${v.help}`),
          label
        ).toEqual([]);

        await captureEvidence(
          page,
          `cookie-banner-${academy.slug}-${variant.name.replace(/\s+/g, '-')}`
        );
        painted.push(seen.acceptBackground);
        await page.context().close();
      }
      // Two different palettes, two different buttons.
      expect(painted[0]).not.toBe(painted[1]);
    });
  }

  test('the preferences dialog opens inside the Academy palette', async ({
    browser,
  }) => {
    const academy = ACADEMIES[0]!;
    const page = await newPage(browser, 1280, true);
    await page.goto(at(academy.slug, '/'));
    const { pagePrimary } = await readBanner(page);
    const buttons = page
      .getByTestId('cookie-consent-banner')
      .getByRole('button');
    await buttons.first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const seen = await dialog.evaluate((element) => {
      const buttons = element.querySelectorAll<HTMLElement>('button');
      // The footer's Save button is the last non-close button.
      const save = Array.from(buttons).filter(
        (b) => !b.querySelector('.sr-only')
      );
      const primary = save[save.length - 1]!;
      return {
        inScope: !!element.closest('[data-website-overlay-portal-root]'),
        save: getComputedStyle(primary).backgroundColor,
        surface: getComputedStyle(element).backgroundColor,
      };
    });
    expect(seen.inScope).toBe(true);
    expect(seen.save).toBe(pagePrimary);
    expect(luminance(parseRgb(seen.surface))).toBeGreaterThan(0.8);
    await page.context().close();
  });

  test('Accept, then reload: the banner is gone', async ({ browser }) => {
    const academy = ACADEMIES[1]!;
    const page = await newPage(browser, 390, false);
    await page.goto(at(academy.slug, '/ar/'));
    await readBanner(page);
    const buttons = page
      .getByTestId('cookie-consent-banner')
      .getByRole('button');
    await buttons.last().click();
    await expect(page.getByTestId('cookie-consent-banner')).toHaveCount(0);
    await page.reload();
    await expect(
      page.locator('.website-theme-scope[data-theme-pack]').first()
    ).toBeAttached();
    await expect(page.getByTestId('cookie-consent-banner')).toHaveCount(0);
    await page.context().close();
  });

  test('moving between the two sites in one tab leaks no palette', async ({
    browser,
  }) => {
    const page = await newPage(browser, 1280, false);
    const seen: string[] = [];
    for (const academy of [...ACADEMIES, ACADEMIES[0]!]) {
      await page.goto(at(academy.slug, '/'));
      await expect(
        page
          .getByText(
            academy.slug === ACADEMY_SLUG
              ? SEED.academyName
              : 'Language Learning Hub'
          )
          .first()
      ).toBeVisible();
      const banner = await readBanner(page);
      expect(banner.acceptBackground, academy.slug).toBe(banner.pagePrimary);
      seen.push(banner.acceptBackground);
    }
    expect(seen[0]).not.toBe(seen[1]);
    expect(seen[2]).toBe(seen[0]);
    await page.context().close();
  });
});
