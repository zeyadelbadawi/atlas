/**
 * J50 — the dashboard's website preview is what a visitor sees, Chromium
 * against the real stack.
 *
 * WHY. The preview used to squeeze the device into its column
 * (`max-width: 100%`), so "Desktop" rendered the tablet or phone layout,
 * and it often missed the theme's stylesheet (copied once, before the
 * theme had loaded it). Neither showed in any test: nothing compared the
 * preview with the site.
 *
 * For the seeded Web Development Academy, in every theme (Theme 1,
 * Atelier, Manara, Riwaq), with the draft published so both sides draw the
 * same content, at each preview device (1440×900, 768×1024, 390×844):
 *   - a visitor's page at exactly that screen size, and
 *   - the Owner's Website → Preview at that device
 * report the same layout: the frame's viewport is the device's; the
 * header has the same height, font and menu (desktop links or hamburger);
 * the first section, the page heading and the footer have the same size.
 * Motion is reduced on both sides, so scroll-driven animation (off in the
 * preview by design) does not differ. The seed's theme is restored.
 */
import {
  test,
  expect,
  type APIRequestContext,
  type Frame,
  type Page,
} from '@playwright/test';
import {
  academyPath,
  apiGet,
  apiPatch,
  apiPost,
  requireSeed,
  seedCookieDecision,
  signInThroughDashboard,
  SEED,
  type Session,
} from './support/atlas';

test.describe.configure({ mode: 'serial' });

const THEMES = ['modern-education', 'atelier', 'manara', 'riwaq'] as const;
const DEVICES = [
  { breakpoint: 'Desktop', width: 1440, height: 900 },
  { breakpoint: 'Tablet', width: 768, height: 1024 },
  { breakpoint: 'Mobile', width: 390, height: 844 },
] as const;

let academyId: string;
let owner: Session;
let originalTheme: string;

async function configuration(request: APIRequestContext) {
  const response = await apiGet(
    request,
    owner,
    `/academies/${academyId}/website/configuration`
  );
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function useTheme(request: APIRequestContext, themeKey: string) {
  const switched = await apiPatch(
    request,
    owner,
    `/academies/${academyId}/website/configuration`,
    { themeKey }
  );
  expect(switched.ok(), await switched.text()).toBeTruthy();
  const published = await apiPost(
    request,
    owner,
    `/academies/${academyId}/website/publish`
  );
  expect(published.ok(), await published.text()).toBeTruthy();
}

interface Layout {
  readonly viewport: number;
  readonly headerHeight: number;
  readonly headerFont: string;
  readonly menuButton: boolean;
  readonly firstSectionHeight: number;
  readonly headingSize: string;
  readonly footerHeight: number;
}

/**
 * Measured in the document the site is drawn in (the page, or the preview
 * frame), once it has settled: fonts and images loaded and two readings in
 * a row the same. `document.fonts.status` can read "loaded" before a font
 * the page uses has even started loading, so one reading can catch text
 * still set in the fallback font (wider, wrapping onto more lines).
 * Network idleness is no signal here: the dashboard polls.
 */
async function measure(target: Page | Frame): Promise<Layout> {
  await target.waitForFunction(
    () =>
      document.fonts.status === 'loaded' &&
      Array.from(document.images).every(
        (image) => image.loading === 'lazy' || image.complete
      ),
    undefined,
    { timeout: 30_000 }
  );
  let previous = '';
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await target.waitForTimeout(400);
    const reading = await read(target);
    const key = JSON.stringify(reading);
    if (key === previous) return reading;
    previous = key;
  }
  return JSON.parse(previous) as Layout;
}

async function read(target: Page | Frame): Promise<Layout> {
  await target.evaluate(() => document.fonts.ready.then(() => undefined));
  return target.evaluate(() => {
    const visible = (element: Element | null) =>
      !!element && element.getBoundingClientRect().height > 0;
    const header = document.querySelector('header');
    const main = document.querySelector('main');
    // The first drawn box in <main>; a preview's section anchors and a
    // hidden-on-this-device wrapper have no box of their own.
    const firstBox = (parent: Element | null): Element | null => {
      for (const child of Array.from(parent?.children ?? [])) {
        if (getComputedStyle(child).display === 'contents') {
          const inner = firstBox(child);
          if (inner) return inner;
        } else if (visible(child) && !child.classList.contains('sr-only')) {
          return child;
        }
      }
      return null;
    };
    const heading = Array.from(document.querySelectorAll('h1')).find(visible);
    const footers = Array.from(document.querySelectorAll('footer'));
    const footer = footers[footers.length - 1] ?? null;
    const menuButton = Array.from(
      header?.querySelectorAll('button') ?? []
    ).some(
      (button) =>
        visible(button) &&
        /menu|القائمة/i.test(button.getAttribute('aria-label') ?? '')
    );
    return {
      viewport: window.innerWidth,
      headerHeight: Math.round(header?.getBoundingClientRect().height ?? 0),
      headerFont: header ? getComputedStyle(header).fontFamily : '',
      menuButton,
      firstSectionHeight: Math.round(
        firstBox(main)?.getBoundingClientRect().height ?? 0
      ),
      headingSize: heading ? getComputedStyle(heading).fontSize : '',
      footerHeight: Math.round(footer?.getBoundingClientRect().height ?? 0),
    };
  });
}

async function previewFrame(page: Page): Promise<Frame> {
  const frameElement = page.locator('iframe[title="Website preview"]');
  await expect(frameElement).toBeAttached();
  const frame = await (await frameElement.elementHandle())!.contentFrame();
  expect(frame).not.toBeNull();
  await expect(frame!.locator('main')).toBeAttached({ timeout: 30_000 });
  await expect(frame!.locator('footer').last()).toBeVisible();
  return frame!;
}

test.beforeAll(async ({ request }) => {
  ({ academyId, owner } = await requireSeed(request));
  originalTheme = (await configuration(request)).themeKey;
});

test.afterAll(async ({ request }) => {
  await useTheme(request, originalTheme);
});

test.describe('J50 — preview parity @critical', () => {
  for (const theme of THEMES) {
    test(`${theme}: the preview lays out as the site does on each device`, async ({
      browser,
      request,
    }) => {
      test.setTimeout(240_000);
      await useTheme(request, theme);

      // Two browsers: the visitor has no session (a signed-in header
      // differs), the Owner works in the dashboard.
      const { baseURL } = test.info().project.use;
      const visitorContext = await browser.newContext({ baseURL });
      const dashboardContext = await browser.newContext({
        baseURL,
        viewport: { width: 1440, height: 900 },
      });
      const visitor = await visitorContext.newPage();
      const dashboard = await dashboardContext.newPage();
      for (const page of [visitor, dashboard]) {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await seedCookieDecision(page);
      }
      await signInThroughDashboard(dashboard, SEED.owner, SEED.password);
      await dashboard.waitForURL(/\/dashboard/);
      await dashboard.goto(`/dashboard/academy/${academyId}/website/preview`);

      for (const device of DEVICES) {
        const label = `${theme} ${device.width}×${device.height}`;

        await visitor.setViewportSize({
          width: device.width,
          height: device.height,
        });
        await visitor.goto(academyPath('/'));
        await expect(visitor.locator('footer').last()).toBeVisible();
        const site = await measure(visitor);

        await dashboard
          .getByRole('button', { name: device.breakpoint, exact: true })
          .click();
        await expect(dashboard.getByTestId('preview-device')).toHaveAttribute(
          'data-breakpoint',
          device.breakpoint.toLowerCase()
        );
        const frame = await previewFrame(dashboard);
        const preview = await measure(frame);

        expect(preview.viewport, `${label}: the frame is the device`).toBe(
          device.width
        );
        expect(site.viewport).toBe(device.width);
        expect(preview.menuButton, `${label}: same menu`).toBe(site.menuButton);
        expect(preview.headerFont, `${label}: theme font`).toBe(
          site.headerFont
        );
        expect(preview.headingSize, `${label}: heading size`).toBe(
          site.headingSize
        );
        for (const key of [
          'headerHeight',
          'firstSectionHeight',
          'footerHeight',
        ] as const) {
          expect(
            Math.abs(preview[key] - site[key]),
            `${label}: ${key} (site ${site[key]}, preview ${preview[key]})`
          ).toBeLessThanOrEqual(2);
        }

        await visitor.screenshot({
          path: test.info().outputPath(`${theme}-${device.width}-site.png`),
        });
        await dashboard.screenshot({
          path: test.info().outputPath(`${theme}-${device.width}-preview.png`),
        });
      }
      await visitorContext.close();
      await dashboardContext.close();
    });
  }
});
