/**
 * J51 — the website's visual editor, Chromium against the real stack.
 *
 * The seeded Owner opens Home of Web Development Academy in the visual
 * editor (full screen, no dashboard navigation) and:
 *   1. selects a section by clicking it ON THE PAGE — its settings open;
 *   2. types into one of its fields — the page shows the text as it is
 *      typed, and the draft saves by itself ("All changes saved"): the API's
 *      draft holds the text;
 *   3. undoes (Ctrl+Z) — the field and the page are back, and that is
 *      saved too;
 *   4. adds an FAQ from the section library right after the first section
 *      — it is selected, on the page, and saved; undo removes it again;
 *   5. gives the hero a WhatsApp button: a half-typed number is flagged
 *      only once its field is left, and the button is saved with the
 *      number in international form;
 *   6. gives a section a compact, centred design: on its own root on the
 *      page, and saved as named choices.
 * Nothing is published. The page's sections are restored afterwards.
 */
import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import {
  apiGet,
  apiPatch,
  requireSeed,
  seedCookieDecision,
  signInThroughDashboard,
  SEED,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';

test.describe.configure({ mode: 'serial' });

let academyId: string;
let owner: Session;
let homeId: string;
let originalSections: unknown;
let originalTheme: string;

interface PageResponse {
  readonly id: string;
  readonly version: number;
  readonly coreType?: string;
  readonly sections: { id: string; type: string; config: unknown }[];
}

async function home(request: APIRequestContext): Promise<PageResponse> {
  const response = await apiGet(
    request,
    owner,
    `/academies/${academyId}/website/pages/${homeId}`
  );
  expect(response.ok()).toBeTruthy();
  return response.json();
}

/** Each test signs in afresh: clear the sign-in limiter first, as the other journeys do, or the fourth sign-in in a row is refused. */
async function signIn(page: Page): Promise<void> {
  await clearAuthRateLimits();
  await seedCookieDecision(page);
  await signInThroughDashboard(page, SEED.owner, SEED.password);
  await page.waitForURL(/\/dashboard/);
}

test.beforeAll(async ({ request }) => {
  ({ academyId, owner } = await requireSeed(request));
  const list = await apiGet(
    request,
    owner,
    `/academies/${academyId}/website/pages?pageSize=50`
  );
  expect(list.ok()).toBeTruthy();
  const pages = (await list.json()).items as PageResponse[];
  homeId = pages.find((page) => page.coreType === 'home')!.id;
  originalSections = (await home(request)).sections;
  const config = await apiGet(
    request,
    owner,
    `/academies/${academyId}/website/configuration`
  );
  originalTheme = (await config.json()).themeKey;
});

test.afterAll(async ({ request }) => {
  await apiPatch(
    request,
    owner,
    `/academies/${academyId}/website/configuration`,
    { themeKey: originalTheme }
  );
  const current = await home(request);
  await apiPatch(
    request,
    owner,
    `/academies/${academyId}/website/pages/${homeId}`,
    { sections: originalSections, expectedVersion: current.version }
  );
});

test.describe('J51 — visual editor @critical', () => {
  test('select on the page, edit live, autosave, undo, add from the library', async ({
    page,
    request,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    await page.goto(
      `/dashboard/academy/${academyId}/website/pages/${homeId}/visual`
    );
    const editor = page.getByTestId('visual-editor');
    await expect(editor).toBeVisible({ timeout: 30_000 });
    // Full screen: the dashboard's top bar (notifications) is not there.
    await expect(
      page.getByRole('button', { name: /notification/i })
    ).toHaveCount(0);

    const frameElement = page.locator('iframe[title="Website preview"]');
    const frame = page.frameLocator('iframe[title="Website preview"]');
    await expect(frame.locator('[data-preview-section]').first()).toBeAttached({
      timeout: 30_000,
    });
    const status = page.getByTestId('save-status').locator('[data-state]');
    const saved = () =>
      expect(status).toHaveAttribute('data-state', 'ok', { timeout: 20_000 });

    // 1. Click the second section on the page.
    const sections = (await home(request)).sections;
    const target = sections[1];
    const box = await frameElement.evaluate((iframe, id) => {
      const doc = (iframe as HTMLIFrameElement).contentDocument!;
      const anchor = doc.querySelector(`[data-preview-section="${id}"]`)!;
      const first = Array.from(anchor.querySelectorAll('*')).find(
        (element) => element.getBoundingClientRect().height > 0
      )!;
      first.scrollIntoView({ block: 'center' });
      return true;
    }, target.id);
    expect(box).toBe(true);
    await frame
      .locator(`[data-preview-section="${target.id}"] > *`)
      .first()
      .click({ position: { x: 20, y: 20 } });
    const panel = page.getByTestId('settings-panel');
    await expect(panel).toBeVisible();
    await expect(
      frame.locator(
        `[data-preview-section="${target.id}"][data-preview-selected]`
      )
    ).toBeAttached();

    // 2. Type into the first filled-in text field.
    const fields = panel.locator('input[type="text"], textarea');
    let field = fields.first();
    for (let index = 0; index < (await fields.count()); index += 1) {
      if ((await fields.nth(index).inputValue()).trim().length > 3) {
        field = fields.nth(index);
        break;
      }
    }
    const before = await field.inputValue();
    const typed = `${before} J51`;
    await field.fill(typed);
    await expect(frame.getByText(typed).first()).toBeVisible();
    await saved();
    await expect
      .poll(async () => JSON.stringify((await home(request)).sections))
      .toContain('J51');

    // 3. Undo puts it back, on the page and in the draft.
    await page.locator('body').click({ position: { x: 5, y: 450 } });
    await page.keyboard.press('Control+z');
    await expect(field).toHaveValue(before);
    await expect(frame.getByText(typed)).toHaveCount(0);
    await saved();
    await expect
      .poll(async () => JSON.stringify((await home(request)).sections))
      .not.toContain('J51');

    // 4. Add an FAQ right after the first section ("+" under its row).
    await page
      .getByRole('button', { name: /^Add a section after/ })
      .first()
      .click({ force: true });
    const library = page.getByTestId('section-library');
    await expect(library).toBeVisible();
    await library.locator('[data-section-type="faq"]').click();
    // The FAQ has ready looks (phase 3e): the library's second step offers
    // them, and "Add section" adds the one chosen.
    await expect(library.getByTestId('section-preset-picker')).toBeVisible();
    await library.getByTestId('preset-add').click();
    await expect(library).toBeHidden();
    await expect(panel.getByRole('heading', { name: 'FAQ' })).toBeVisible();
    await saved();
    await expect
      .poll(async () => (await home(request)).sections.map((s) => s.type)[1])
      .toBe('faq');

    await page.keyboard.press('Control+z');
    await saved();
    await expect
      .poll(async () => (await home(request)).sections.length)
      .toBe(sections.length);

    await page.screenshot({
      path: test.info().outputPath('visual-editor.png'),
    });
  });

  test('Buttons: a WhatsApp button on the hero, checked on leaving the number, saved as a number', async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    await page.goto(
      `/dashboard/academy/${academyId}/website/pages/${homeId}/visual`
    );
    await expect(page.getByTestId('visual-editor')).toBeVisible({
      timeout: 30_000,
    });
    const frame = page.frameLocator('iframe[title="Website preview"]');
    const hero = (await home(request)).sections.find((s) => s.type === 'hero')!;
    await expect(
      frame.locator(`[data-preview-section="${hero.id}"]`)
    ).toBeAttached({ timeout: 30_000 });
    await page
      .getByTestId(`structure-row-${hero.id}`)
      .getByRole('button')
      .filter({ hasText: 'Hero' })
      .first()
      .click();
    const buttons = page.getByTestId('section-buttons');
    await expect(buttons).toBeVisible();
    const before = await buttons.getByRole('listitem').count();
    test.skip(before >= 3, 'the seeded hero already has three buttons');

    await page.getByTestId('section-buttons-add').click();
    const row = buttons.getByRole('listitem').last();
    await row.getByRole('textbox').first().fill('J51 WhatsApp');
    await row.getByTestId('cta-link-type').click();
    await page.getByRole('option', { name: /WhatsApp chat/ }).click();
    const number = row.locator('input[type="tel"]');
    // Half a number: no complaint while typing, a fix on leaving the field.
    await number.fill('0100');
    await expect(row.getByRole('alert')).toHaveCount(0);
    await number.blur();
    await expect(row.getByRole('alert')).toBeVisible();
    await number.fill('01001234567');
    await number.blur();
    await expect(row.getByRole('alert')).toHaveCount(0);

    await expect(
      frame.locator('a, button').filter({ hasText: 'J51 WhatsApp' })
    ).toBeVisible();
    await expect(
      page.getByTestId('save-status').locator('[data-state]')
    ).toHaveAttribute('data-state', 'ok', { timeout: 20_000 });
    await expect
      .poll(async () => {
        const saved = (await home(request)).sections.find(
          (s) => s.id === hero.id
        )!.config as Record<string, { whatsapp?: string } | undefined>;
        return [saved.cta, saved.secondaryCta, saved.tertiaryCta].find(
          (cta) => cta?.whatsapp
        )?.whatsapp;
      })
      .toBe('+201001234567');
  });

  test('Design: a section’s spacing and alignment show on the page and save as named choices', async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    await page.goto(
      `/dashboard/academy/${academyId}/website/pages/${homeId}/visual`
    );
    await expect(page.getByTestId('visual-editor')).toBeVisible({
      timeout: 30_000,
    });
    const frame = page.frameLocator('iframe[title="Website preview"]');
    const target = (await home(request)).sections.find(
      (s) => s.type === 'features'
    );
    test.skip(!target, 'the seeded Home has no features section');
    await expect(
      frame.locator(`[data-preview-section="${target!.id}"]`)
    ).toBeAttached({ timeout: 30_000 });
    await page
      .getByTestId(`structure-row-${target!.id}`)
      .getByRole('button')
      .filter({ hasText: 'Features' })
      .first()
      .click();
    await page.getByTestId('settings-tab-design').click();
    const design = page.getByTestId('section-design');
    await design
      .getByTestId('design-spacing')
      .getByRole('radio', { name: 'Compact' })
      .click();
    await design
      .getByTestId('design-align')
      .getByRole('radio', { name: 'Center' })
      .click();
    // On the section's own root: no wrapper is added to the page.
    const root = frame.locator(
      `[data-preview-section="${target!.id}"] > section`
    );
    await expect(root).toHaveAttribute('data-ws-space', 'compact');
    await expect(root).toHaveAttribute('data-ws-align', 'center');
    await expect(
      page.getByTestId('save-status').locator('[data-state]')
    ).toHaveAttribute('data-state', 'ok', { timeout: 20_000 });
    await expect
      .poll(async () => {
        const saved = (await home(request)).sections.find(
          (s) => s.id === target!.id
        ) as { design?: unknown } | undefined;
        return saved?.design;
      })
      .toEqual({ spacing: 'compact', align: 'center' });
  });

  test('Site: switching the theme redraws the page in it, as a draft', async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await signIn(page);
    await page.goto(
      `/dashboard/academy/${academyId}/website/pages/${homeId}/visual`
    );
    await expect(page.getByTestId('visual-editor')).toBeVisible({
      timeout: 30_000,
    });
    const frame = page.frameLocator('iframe[title="Website preview"]');
    const pack = frame.locator('[data-theme-pack]').first();
    await expect(pack).toBeAttached({ timeout: 30_000 });
    const target = originalTheme === 'atelier' ? 'manara' : 'atelier';

    await page.getByTestId('visual-editor-site').click();
    const site = page.getByTestId('site-settings');
    await expect(site).toBeVisible();
    await site.locator(`[data-theme-option="${target}"]`).click();
    await expect(pack).toHaveAttribute('data-theme-pack', target, {
      timeout: 20_000,
    });
    await expect(
      site.locator(`[data-theme-option="${target}"]`)
    ).toHaveAttribute('aria-pressed', 'true');
    // Saved to the website's draft.
    await expect
      .poll(async () => {
        const response = await apiGet(
          request,
          owner,
          `/academies/${academyId}/website/configuration`
        );
        return (await response.json()).themeKey;
      })
      .toBe(target);

    // Back to the theme it had.
    await site.locator(`[data-theme-option="${originalTheme}"]`).click();
    await expect(pack).toHaveAttribute('data-theme-pack', originalTheme, {
      timeout: 20_000,
    });
  });
});
