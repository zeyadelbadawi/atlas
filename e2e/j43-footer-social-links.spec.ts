/**
 * J43 — footer social links and the shared footer, Chromium against the
 * real stack.
 *
 * The Owner (seeded) of Web Development Academy:
 *   1. opens Website → Settings → Navigation, adds a social link, picks
 *      Instagram from the platform select (there is no free-text platform
 *      field) and enters its address; the saved configuration holds
 *      `platform: 'instagram'`;
 *   2. publishes with the publish bar.
 * A link saved before the picker (free-text label "facebook", no
 * platform) is put alongside through the API — the legacy shape.
 * Then, in every theme (Theme 1, Atelier, Manara, Riwaq), in English and
 * Arabic, a visitor's footer:
 *   - draws both as icons (Instagram, and Facebook inferred from the
 *     legacy label), each named by its platform and linking to its address;
 *   - shows the Academy's own description (Academy settings);
 *   - holds its links in a "Footer" navigation landmark with a Learning
 *     group, and nothing scrolls sideways at 390 and 1440.
 * The seed's theme, footer and description are restored afterwards.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
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

const INSTAGRAM = 'https://instagram.com/webdevacademy';
const FACEBOOK = 'https://facebook.com/webdevacademy';
const DESCRIPTION =
  'Hands-on web development courses, from first page to production.';
const THEMES = ['modern-education', 'atelier', 'manara', 'riwaq'] as const;

let academyId: string;
let owner: Session;
let original: { themeKey: string; footer: unknown; description: string | null };

async function configuration(request: APIRequestContext) {
  const response = await apiGet(
    request,
    owner,
    `/academies/${academyId}/website/configuration`
  );
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function publish(request: APIRequestContext) {
  const response = await apiPost(
    request,
    owner,
    `/academies/${academyId}/website/publish`
  );
  expect(response.ok(), await response.text()).toBeTruthy();
}

test.beforeAll(async ({ request }) => {
  ({ academyId, owner } = await requireSeed(request));
  const config = await configuration(request);
  const academy = await (
    await apiGet(request, owner, `/academies/${academyId}`)
  ).json();
  original = {
    themeKey: config.themeKey,
    footer: config.footer,
    description: academy.description ?? null,
  };
  // Start from no social links and a known description.
  const cleared = await apiPatch(
    request,
    owner,
    `/academies/${academyId}/website/configuration`,
    {
      footer: { ...config.footer, socialLinks: [] },
      themeKey: 'modern-education',
    }
  );
  expect(cleared.ok(), await cleared.text()).toBeTruthy();
  const described = await apiPatch(request, owner, `/academies/${academyId}`, {
    description: DESCRIPTION,
  });
  expect(described.ok(), await described.text()).toBeTruthy();
});

test.afterAll(async ({ request }) => {
  await apiPatch(
    request,
    owner,
    `/academies/${academyId}/website/configuration`,
    {
      footer: original.footer,
      themeKey: original.themeKey,
    }
  );
  await apiPatch(request, owner, `/academies/${academyId}`, {
    description: original.description,
  });
  await publish(request);
});

test('the Owner picks a platform (no typing) and publishes', async ({
  page,
  request,
}) => {
  await seedCookieDecision(page);
  await signInThroughDashboard(page, SEED.owner, SEED.password);
  await page.waitForURL(/\/dashboard/);
  await page.goto(`/dashboard/academy/${academyId}/website/settings`);
  await page.getByRole('tab', { name: 'Navigation' }).click();

  await page.getByRole('button', { name: 'Add link' }).click();
  const row = page.getByTestId('social-link-row').last();
  await expect(row).toBeVisible();
  // One text field per row: the address. The platform is a select.
  await expect(row.getByRole('textbox')).toHaveCount(1);
  await row.getByTestId('social-platform-select').click();
  await page.getByRole('option', { name: 'Instagram' }).click();
  await expect(row.getByTestId('social-platform-select')).toContainText(
    'Instagram'
  );
  await row.getByTestId('social-url-input').fill(INSTAGRAM);
  await row.getByTestId('social-url-input').blur();

  await expect
    .poll(async () => (await configuration(request)).footer.socialLinks)
    .toEqual([
      expect.objectContaining({ platform: 'instagram', url: INSTAGRAM }),
    ]);

  // An unsafe address is refused and never saved.
  await row.getByTestId('social-url-input').fill('javascript:alert(1)');
  await row.getByTestId('social-url-input').blur();
  await expect(page.getByText('Enter a valid URL').first()).toBeVisible();
  expect((await configuration(request)).footer.socialLinks[0].url).toBe(
    INSTAGRAM
  );

  // A link saved before the picker: free-text label, no platform.
  const config = await configuration(request);
  const legacy = await apiPatch(
    request,
    owner,
    `/academies/${academyId}/website/configuration`,
    {
      footer: {
        ...config.footer,
        socialLinks: [
          ...config.footer.socialLinks,
          {
            id: 'j43-legacy',
            label: { en: 'facebook', ar: '' },
            url: FACEBOOK,
          },
        ],
      },
    }
  );
  expect(legacy.ok(), await legacy.text()).toBeTruthy();

  await page.reload();
  await page.getByRole('tab', { name: 'Navigation' }).click();
  // The legacy row reads as Facebook in the CMS.
  await expect(page.getByTestId('social-platform-select').nth(1)).toContainText(
    'Facebook'
  );

  await page.getByRole('button', { name: 'Publish' }).first().click();
  const confirm = page.getByRole('alertdialog');
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.getByRole('button', { name: 'Publish' }).click();
  }
  await expect(page.getByText('This website is live.').first()).toBeVisible({
    timeout: 30_000,
  });
});

for (const theme of THEMES) {
  test(`${theme}: the footer draws the icons, the description and the groups`, async ({
    page,
    request,
  }) => {
    const switched = await apiPatch(
      request,
      owner,
      `/academies/${academyId}/website/configuration`,
      {
        themeKey: theme,
      }
    );
    expect(switched.ok(), await switched.text()).toBeTruthy();
    await publish(request);
    await seedCookieDecision(page);

    for (const [locale, width] of [
      ['', 1440],
      ['/ar', 390],
    ] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(academyPath(`${locale}/`));
      const footer = page.locator('footer').last();
      await footer.scrollIntoViewIfNeeded();

      const social = footer.getByRole('list', {
        name: locale ? 'روابط التواصل الاجتماعي' : 'Social links',
      });
      const instagram = social.getByRole('link', { name: 'Instagram' });
      const facebook = social.getByRole('link', { name: 'Facebook' });
      await expect(instagram).toHaveAttribute('href', INSTAGRAM);
      await expect(facebook).toHaveAttribute('href', FACEBOOK);
      await expect(
        instagram.locator('svg[data-social-icon="instagram"]')
      ).toHaveCount(1);
      await expect(
        facebook.locator('svg[data-social-icon="facebook"]')
      ).toHaveCount(1);
      // Icons, not words.
      await expect(instagram).toHaveText('');

      await expect(footer.getByText(DESCRIPTION)).toBeVisible();
      const nav = footer.getByRole('navigation', {
        name: locale ? 'تذييل الموقع' : 'Footer',
      });
      await expect(
        nav.getByText(locale ? 'التعلّم' : 'Learning').first()
      ).toBeAttached();

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth
      );
      expect(
        overflow,
        `${theme} ${locale || 'en'} ${width}: no sideways scroll`
      ).toBe(false);
      await page.screenshot({
        path: test
          .info()
          .outputPath(`${theme}${locale ? '-ar' : ''}-${width}.png`),
        fullPage: true,
      });
    }
  });
}
