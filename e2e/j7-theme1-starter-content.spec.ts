/**
 * J7 — Theme 1 starter content and initialization (Theme 1 plan Phase 7).
 *
 * Against the real running stack (see `playwright.config.ts`), as a new
 * Organization owner on a Growth trial (its own organization, so the
 * seeded organization's Academy allowance is never used up):
 *
 *   J7a  logo chosen in the setup form → palette previewed → Academy
 *        created → palette applied by the server's branding step, logo
 *        attached once the Academy exists (W2) → the public website renders
 *        with that palette;
 *   J7b  logo skipped → the theme's default palette;
 *   J7c  the sample chain (§D.4) on the J7b Academy: the preview labels the
 *        sample testimonials → publishing warns and lists them → the public
 *        site shows none → confirming one makes exactly that one public.
 */
import { deflateSync, crc32 } from 'node:zlib';
import { clearAuthRateLimits } from './support/global-setup';
import { createTrialOrganizationOwner } from './support/trial-owner';
import { test, expect, type Page } from '@playwright/test';
import {
  ACADEMY_PREVIEW_PARAM,
  apiGet,
  apiPost,
  declineCookies,
  signInThroughDashboard,
  signOutInBrowser,
  type Session,
  seedCookieDecision,
} from './support/atlas';

test.describe.configure({ mode: 'serial' });

/** A 96×96 PNG: a solid brand-coloured disc on a transparent background. */
function logoPng([r, g, b]: readonly [number, number, number]): Buffer {
  const size = 96;
  const rows: Buffer[] = [];
  for (let y = 0; y < size; y += 1) {
    const row = Buffer.alloc(1 + size * 4);
    for (let x = 0; x < size; x += 1) {
      const inside = (x - 47.5) ** 2 + (y - 47.5) ** 2 < 40 ** 2;
      row.set(inside ? [r, g, b, 255] : [0, 0, 0, 0], 1 + x * 4);
    }
    rows.push(row);
  }
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const PURPLE: readonly [number, number, number] = [124, 58, 237];

/** The hue (0–360) of a computed CSS colour such as `rgb(37, 99, 235)`. */
function hueOf(color: string): number {
  const [r, g, b] = (color.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  const h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/**
 * Moves inside the signed-in dashboard the way a user does, through the
 * client-side router, keeping the in-memory session (a full reload would
 * start from the refresh cookie instead).
 */
async function goInApp(page: Page, path: string): Promise<void> {
  await page.evaluate((target) => {
    window.history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForURL((url) => `${url.pathname}${url.search}` === path);
}

/**
 * Signs in on the dashboard and waits for it. Starts signed out: with the
 * session cookie kept (same-origin API), a second sign-in would otherwise
 * be redirected past the form.
 */
async function signIn(page: Page): Promise<void> {
  await signOutInBrowser(page);
  await signInThroughDashboard(page, ownerEmail, ownerPassword);
  await page.waitForURL(/\/dashboard/);
}

interface Provisioned {
  readonly academyId: string;
  readonly slug: string;
}

/** Fills the dashboard's "new academy" form (Theme 1, ready-made website) and waits until it's ready. */
async function provisionThroughForm(
  page: Page,
  name: string,
  withLogo: boolean
): Promise<Provisioned> {
  await goInApp(page, '/dashboard/provisioning/new');
  await page.getByLabel('Academy name').fill(name);
  // W2 — a single-choice radio, the default theme pre-selected.
  await page.getByRole('radio', { name: /Modern Education/ }).click();

  if (withLogo) {
    await page.getByText('Logo & colours (optional)').click();
    await page
      .locator('input[type="file"][accept*="image/png"]')
      .setInputFiles({
        name: 'logo.png',
        mimeType: 'image/png',
        buffer: logoPng(PURPLE),
      });
    // The palette is proposed from the logo and previewed live.
    await expect(
      page.getByText(
        'We suggested a palette from your logo. Review it, then accept.'
      )
    ).toBeVisible();
    await page.getByRole('button', { name: 'Accept palette' }).click();
    await expect(
      page.getByRole('button', { name: 'Palette accepted' })
    ).toBeVisible();
  }

  await page.getByText('Start with a ready-made website').click();
  const slug = await page.getByLabel('Atlas address').inputValue();
  await page.getByRole('button', { name: 'Start provisioning' }).click();

  await expect(page.getByText('Your Academy is ready')).toBeVisible({
    timeout: 60_000,
  });
  // W2 — the palette travelled with the request (the server's branding
  // step applied it); the logo is attached inline once the Academy exists.
  if (withLogo) {
    await expect(page.getByTestId('provisioning-stage-brand')).toHaveAttribute(
      'data-state',
      'done',
      { timeout: 30_000 }
    );
  }
  const requestId = new URL(page.url()).pathname.split('/').pop()!;
  return { academyId: await academyIdFor(page, requestId), slug };
}

let owner: Session;
let organizationId: string;
let ownerEmail: string;
let ownerPassword: string;

async function academyIdFor(page: Page, requestId: string): Promise<string> {
  const response = await apiGet(
    page.request,
    owner,
    `/organizations/${organizationId}/provisioning-requests/${requestId}`
  );
  expect(response.ok()).toBeTruthy();
  return (await response.json()).academyId as string;
}

async function publicCtaHue(page: Page, slug: string): Promise<number> {
  await page.goto(`/?${ACADEMY_PREVIEW_PARAM}=${slug}`);
  await declineCookies(page);
  const cta = page.locator('.t1-cta').first();
  await expect(cta).toBeVisible();
  return hueOf(
    await cta.evaluate((element) => getComputedStyle(element).backgroundColor)
  );
}

const SAMPLE_QUOTES = [
  'The projects were close to real work',
  'I could fit the lessons around a full-time job',
  'The step-by-step structure made a difficult subject approachable',
];

test.describe('J7 — Theme 1 starter content', () => {
  let skipped: Provisioned;

  test.beforeEach(async ({ page }) => {
    await seedCookieDecision(page);
  });

  test.beforeAll(async ({ request }) => {
    // Each journey file starts from a clear sign-in limiter (as J1–J6 do):
    // the limiter is a real 10-per-15-minutes protection, and this file
    // signs the owner in several times after the earlier journeys did.
    await clearAuthRateLimits();
    // A new owner with their own organization on a Growth trial, not the
    // seeded one: this file provisions two Academies per run, and the
    // seeded organization's Academy allowance is shared with other suites.
    const trialOwner = await createTrialOrganizationOwner(request, 'j7');
    owner = trialOwner.session;
    organizationId = trialOwner.organizationId;
    ownerEmail = trialOwner.email;
    ownerPassword = trialOwner.password;
  });

  test('J7a: a logo chosen in the setup form becomes the website palette', async ({
    page,
  }) => {
    await signIn(page);
    const academy = await provisionThroughForm(
      page,
      `J7 Logo ${Date.now() % 1e6}`,
      true
    );

    const configuration = await (
      await apiGet(
        page.request,
        owner,
        `/academies/${academy.academyId}/website/configuration`
      )
    ).json();
    expect(configuration.brand.palette).toMatchObject({
      source: 'logo',
      status: 'confirmed',
    });
    // The stored legacy primary is the logo's purple (an "H S% L%" triplet).
    const storedHue = Number(
      String(configuration.brand.primaryColor).split(' ')[0]
    );
    expect(storedHue).toBeGreaterThan(245);
    expect(storedHue).toBeLessThan(285);
    const academyRecord = await (
      await apiGet(page.request, owner, `/academies/${academy.academyId}`)
    ).json();
    expect(academyRecord.logo ?? academyRecord.logoUrl).toBeTruthy();

    await apiPost(
      page.request,
      owner,
      `/academies/${academy.academyId}/website/publish`
    );
    // Purple logo → purple buttons (hue ≈ 262°), not the theme's blue.
    const hue = await publicCtaHue(page, academy.slug);
    expect(hue).toBeGreaterThan(245);
    expect(hue).toBeLessThan(285);
  });

  test('J7b: skipping the logo keeps the theme default palette', async ({
    page,
  }) => {
    await signIn(page);
    skipped = await provisionThroughForm(
      page,
      `J7 Default ${Date.now() % 1e6}`,
      false
    );

    const configuration = await (
      await apiGet(
        page.request,
        owner,
        `/academies/${skipped.academyId}/website/configuration`
      )
    ).json();
    expect(configuration.brand.palette).toBeUndefined();

    await apiPost(
      page.request,
      owner,
      `/academies/${skipped.academyId}/website/publish`
    );
    // Theme 1's default blue (hue ≈ 217°).
    const hue = await publicCtaHue(page, skipped.slug);
    expect(hue).toBeGreaterThan(205);
    expect(hue).toBeLessThan(230);
  });

  test('J7c: sample testimonials stay private until one is confirmed', async ({
    page,
  }) => {
    const academyId = skipped.academyId;
    await signIn(page);

    // The overview's launch checklist lists the samples, with a link to review them.
    await goInApp(page, `/dashboard/academy/${academyId}/website`);
    const checklist = page.getByTestId('website-launch-checklist');
    await expect(checklist.getByText('3 sample testimonials')).toBeVisible();
    await checklist
      .getByRole('link', { name: /Review the sample testimonials on Home/ })
      .click();

    // The editor opens that section; the preview labels the samples.
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    const preview = page.frameLocator('iframe[title="Website preview"]');
    await expect(preview.locator('[data-sample-badge]')).toHaveCount(3);
    // No courses yet: instructors and numbers show labelled preview
    // samples (never on the public site).
    await expect(preview.locator('[data-preview-sample]')).toHaveCount(2);

    // Publishing warns and lists them; "Publish anyway" publishes.
    await goInApp(page, `/dashboard/academy/${academyId}/website`);
    const toggle = page.getByTestId('website-publish-toggle');
    if ((await toggle.textContent())?.includes('Unpublish')) {
      await toggle.click();
      await page.getByRole('button', { name: 'Unpublish' }).last().click();
      await expect(toggle).toContainText('Publish');
    }
    await toggle.click();
    const warning = page.getByTestId('publish-sample-warning');
    await expect(warning.getByText('3 sample testimonials')).toBeVisible();
    await warning.getByRole('button', { name: 'Publish anyway' }).click();
    await expect(toggle).toContainText('Unpublish', { timeout: 30_000 });

    // The public site shows none of them.
    await page.goto(`/?${ACADEMY_PREVIEW_PARAM}=${skipped.slug}`);
    await declineCookies(page);
    await expect(page.locator('.t1-cta').first()).toBeVisible();
    for (const quote of SAMPLE_QUOTES) {
      await expect(page.getByText(quote)).toHaveCount(0);
    }
    await expect(page.locator('[data-preview-sample]')).toHaveCount(0);

    // Confirm exactly one ("This is a real testimonial"), save, publish.
    const pages = await (
      await apiGet(
        page.request,
        owner,
        `/academies/${academyId}/website/pages`,
        {
          page: '1',
          pageSize: '50',
        }
      )
    ).json();
    const home = pages.items.find(
      (item: { coreType: string }) => item.coreType === 'home'
    );
    const testimonials = home.sections.find(
      (section: { type: string }) => section.type === 'testimonials'
    );
    await signIn(page);
    await goInApp(
      page,
      `/dashboard/academy/${academyId}/website/pages/${home.id}?section=${testimonials.id}`
    );
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('button', { name: 'This is a real testimonial' })
      .first()
      .click();
    await dialog.getByRole('button', { name: 'Apply changes' }).click();
    await page.getByTestId('website-save-page').click();
    await expect(page.getByTestId('website-save-page')).toBeDisabled({
      timeout: 15_000,
    });
    const republish = await apiPost(
      page.request,
      owner,
      `/academies/${academyId}/website/publish`
    );
    expect((await republish.json()).sampleContent[0].sampleItems).toBe(2);

    await page.goto(`/?${ACADEMY_PREVIEW_PARAM}=${skipped.slug}`);
    await expect(
      page.getByText(SAMPLE_QUOTES[0], { exact: false })
    ).toBeVisible();
    for (const quote of SAMPLE_QUOTES.slice(1)) {
      await expect(page.getByText(quote)).toHaveCount(0);
    }
  });
});
