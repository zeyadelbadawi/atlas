/**
 * J21 — one Visual Identity, live on save (Task G), Chromium against the
 * real stack, database and Redis caches.
 *
 * Before: the logo was edited in two places, colours needed "Accept
 * palette" and then "Save brand colours", the logo went live at once while
 * the colours waited for a site publish, and an open public site kept the
 * old colours until a cache expired (Owners resorted to clearing cookies).
 *
 * Here the Owner, on the one Visual Identity page, renames the Academy and
 * picks a new logo (a palette is proposed from it); a single "Save visual
 * identity" saves everything. A visitor tab that had the public site open
 * — caches warm, cookies untouched — shows the new name and colours on its
 * next load, in English and in Arabic (RTL). The unsaved-changes guard
 * offers "Save and leave", which really saves. The seed is restored.
 */
import { deflateSync, crc32 } from 'node:zlib';
import { test, expect, type Page } from '@playwright/test';
import {
  API_BASE,
  SEED,
  academyPath,
  apiGet,
  apiSignIn,
  authHeader,
  requireSeed,
  seedCookieDecision,
  signInThroughDashboard,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';

test.describe.configure({ mode: 'serial' });

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

const stamp = Date.now();
const NEW_NAME = `J21 Academy ${stamp}`;
const GUARD_NAME = `J21 Guarded ${stamp}`;

function isReddish(hsl: string): boolean {
  const hue = Number(/hsl\((\d+)/.exec(hsl)?.[1] ?? '0');
  return hue < 40 || hue > 320;
}

/** The public site's call-to-action colour, as the theme scope sets it. */
async function ctaColour(page: Page): Promise<string> {
  const scope = page.locator('.website-theme-scope').first();
  await expect(scope).toBeVisible({ timeout: 30_000 });
  return scope.evaluate((el) =>
    getComputedStyle(el).getPropertyValue('--website-cta').trim()
  );
}

test.describe('J21 — one Visual Identity, live on save', () => {
  let academyId: string;
  let owner: Session;
  let original: {
    name: string;
    logo?: string;
    brand: Record<string, unknown>;
  };

  test.beforeAll(async ({ request }) => {
    await clearAuthRateLimits();
    ({ academyId } = await requireSeed(request));
    owner = await apiSignIn(request, {
      email: SEED.owner,
      password: SEED.password,
    });
    const academy = await (
      await apiGet(request, owner, `/academies/${academyId}`)
    ).json();
    const config = await (
      await apiGet(
        request,
        owner,
        `/academies/${academyId}/website/configuration`
      )
    ).json();
    original = {
      name: academy.name,
      logo: academy.logo,
      brand: config.brand,
    };
  });

  test.afterAll(async ({ request }) => {
    const restored = await request.put(
      `${API_BASE}/academies/${academyId}/visual-identity`,
      {
        headers: authHeader(owner),
        data: {
          name: original.name,
          logo: original.logo ?? null,
          // Exactly what was there — including NO palette when the seed
          // had only legacy colours, so later journeys do not inherit the
          // palette this one saved.
          brand: {
            palette: original.brand.palette ?? null,
            primaryColor: original.brand.primaryColor,
            secondaryColor: original.brand.secondaryColor,
            accentColor: original.brand.accentColor,
          },
        },
      }
    );
    expect(restored.status()).toBe(200);
  });

  test('a single save puts the new name, logo and colours live, with the visitor tab untouched', async ({
    page,
    browser,
  }, testInfo) => {
    test.setTimeout(180_000);

    // A visitor with the public site open: caches warm, cookies kept.
    const visitorContext = await browser.newContext();
    const visitor = await visitorContext.newPage();
    await seedCookieDecision(visitor);
    await visitor.goto(academyPath('/'));
    const ctaBefore = await ctaColour(visitor);

    await seedCookieDecision(page);
    await signInThroughDashboard(page, SEED.owner, SEED.password);
    await page.waitForURL(/dashboard/, { timeout: 30_000 });
    await page.goto(`/dashboard/academy/${academyId}/branding`);

    // One page, one save: no separate approve or colour-save buttons.
    const save = page.getByTestId('visual-identity-save');
    await expect(save).toBeDisabled({ timeout: 30_000 });
    await expect(
      page.getByRole('button', { name: 'Accept palette' })
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Save brand colours' })
    ).toHaveCount(0);

    await page.getByLabel('Academy Name').fill(NEW_NAME);
    await page
      .locator('input[type="file"][accept*="image/svg+xml"]')
      .setInputFiles({
        name: 'logo.png',
        mimeType: 'image/png',
        // A logo whose colour is far from the current one, so the saved
        // palette is visibly different whatever state the seed is in.
        buffer: logoPng(isReddish(ctaBefore) ? [20, 70, 200] : [200, 30, 40]),
      });
    await expect(
      page.getByText(
        'We suggested a palette from your logo. Review it, then save.'
      )
    ).toBeVisible();
    await expect(save).toBeEnabled({ timeout: 30_000 });
    const saved = page.waitForResponse(
      (r) =>
        r.url().includes(`/academies/${academyId}/visual-identity`) &&
        r.request().method() === 'PUT'
    );
    await save.click();
    expect((await saved).status()).toBe(200);
    await expect(page.getByTestId('visual-identity-state')).toHaveText(
      'Everything is saved and live.'
    );
    await expect(save).toBeDisabled();
    // The colour the saved palette gives the call to action (the preview
    // renders the real theme with it).
    const ctaSaved = await page
      .locator('.brand-studio-preview .website-theme-scope')
      .first()
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--website-cta').trim()
      );
    expect(ctaSaved).not.toBe(ctaBefore);
    await page.screenshot({
      path: testInfo.outputPath('visual-identity-saved.png'),
      fullPage: true,
    });

    // The visitor's next load: new name and colours, both languages.
    for (const locale of ['en', 'ar'] as const) {
      await visitor.goto(academyPath(locale === 'en' ? '/' : '/ar'));
      await expect(visitor.locator('html')).toHaveAttribute(
        'dir',
        locale === 'ar' ? 'rtl' : 'ltr'
      );
      // The academy name is in the page title and the header logo's name
      // (the hero copy is authored page content, not the name).
      await expect(visitor).toHaveTitle(new RegExp(NEW_NAME), {
        timeout: 30_000,
      });
      await expect(
        visitor.getByRole('img', { name: NEW_NAME }).first()
      ).toBeVisible();
      expect(await ctaColour(visitor)).toBe(ctaSaved);
      await visitor.screenshot({
        path: testInfo.outputPath(`public-after-${locale}.png`),
        fullPage: true,
      });
    }
    await visitorContext.close();
  });

  test('leaving with unsaved edits offers Save and leave, which really saves', async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    await seedCookieDecision(page);
    await signInThroughDashboard(page, SEED.owner, SEED.password);
    await page.waitForURL(/dashboard/, { timeout: 30_000 });
    await page.goto(`/dashboard/academy/${academyId}/branding`);
    await expect(page.getByTestId('visual-identity-save')).toBeDisabled({
      timeout: 30_000,
    });

    // Nothing changed: leaving asks nothing.
    await page.getByRole('link', { name: 'Members' }).first().click();
    await expect(page).toHaveURL(/\/members/);
    await expect(page.getByTestId('unsaved-stay')).toHaveCount(0);

    await page.goBack();
    await page.getByLabel('Academy Name').fill(GUARD_NAME);
    await page.getByRole('link', { name: 'Members' }).first().click();
    await expect(page.getByTestId('unsaved-save')).toBeVisible();
    await page.getByTestId('unsaved-save').click();
    await expect(page).toHaveURL(/\/members/);
    const academy = await (
      await apiGet(request, owner, `/academies/${academyId}`)
    ).json();
    expect(academy.name).toBe(GUARD_NAME);
  });
});
