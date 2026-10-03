/**
 * J38 — unique names (W4), Chromium against the real stack and database.
 *
 *  - Academy website sign-up: a learner name already used in this academy
 *    (any case, accents, Arabic marks) is refused with a message ON the name
 *    field, which is marked invalid and focused. EN on desktop, AR on a
 *    390 px phone (RTL, Arabic copy).
 *  - Organization create: a name already used anywhere on Atlas gets the
 *    generic "isn't available" message on the name field, never the holder.
 *  - Academy settings: renaming to another academy's name (another
 *    organization's, different case) is refused on the name field and the
 *    stored name is unchanged.
 *  - Learner profile: a rename that clashes with another learner of the
 *    learner's academy is refused on the family-name field, naming that
 *    academy.
 *  - The website sign-up refusal and the academy-settings refusal in EN and
 *    AR, on a desktop and a 390 px phone (evidence matrix).
 *
 * NEEDS THE INTEGRATED REBUILD: the API serves a prebuilt dist, and these
 * refusals come from the W4 backend code. Every name is unique per run (the
 * database persists between runs and names are now unique).
 */
import { test, expect as baseExpect, type Page } from '@playwright/test';
import {
  API_BASE,
  LEARNER_PASSWORD,
  SEED,
  academyPath,
  apiPost,
  apiSignIn,
  declineCookies,
  requireSeed,
  resolveAcademy,
  seedCookieDecision,
  signInThroughDashboard,
  uniqueLearnerEmail,
  uniqueLearnerName,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import { adminQuery } from './support/admin-db';
import {
  VARIANTS,
  applyVariant,
  captureEvidence,
  expectNoSidewaysScroll,
  setStoredLanguage,
} from './support/evidence';

test.describe.configure({ mode: 'serial', timeout: 240_000 });
const expect = baseExpect.configure({ timeout: 45_000 });

const PHONE = { width: 390, height: 844 };

async function setLanguage(page: Page, language: 'en' | 'ar'): Promise<void> {
  await page.addInitScript((lang) => {
    window.localStorage.setItem('atlas:language', JSON.stringify(lang));
  }, language);
}

/** Registers a learner in the seeded academy through the API. */
async function registerLearnerViaApi(
  page: Page,
  academyId: string,
  name: string,
  email = uniqueLearnerEmail('j38')
): Promise<string> {
  const res = await page.request.post(`${API_BASE}/auth/register`, {
    data: { name, email, password: LEARNER_PASSWORD, academyId },
  });
  expect(res.status(), await res.text()).toBe(201);
  return email;
}

async function fillWebsiteSignUp(
  page: Page,
  name: string,
  language: 'en' | 'ar' = 'en'
): Promise<void> {
  // The public website's language is in its address (`/ar/…`), not in the
  // dashboard's stored preference.
  await page.goto(academyPath(language === 'ar' ? '/ar/sign-up' : '/sign-up'));
  await declineCookies(page);
  await page.locator('#name').fill(name);
  await page.locator('#email').fill(uniqueLearnerEmail('j38-dup'));
  await page.locator('#password').fill(LEARNER_PASSWORD);
  await page.locator('#confirmPassword').fill(LEARNER_PASSWORD);
  const terms = page.locator('#acceptTerms');
  if (await terms.count()) await terms.check();
  await page
    .getByRole('button', {
      name: /sign up|create account|register|إنشاء حساب|تسجيل/i,
    })
    .click();
}

test.describe('J38 — unique names', () => {
  let academyId: string;

  test.beforeAll(async ({ request }) => {
    await clearAuthRateLimits();
    await requireSeed(request);
    academyId = (await resolveAcademy(request)).id;
  });

  test('J38a: a learner name already used in this academy is refused on the name field (EN desktop)', async ({
    page,
  }) => {
    const held = uniqueLearnerName('José Ruiz');
    await registerLearnerViaApi(page, academyId, held);

    await seedCookieDecision(page);
    await setLanguage(page, 'en');
    // Same person-name, different case and no accents.
    await fillWebsiteSignUp(
      page,
      held.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    );

    const name = page.locator('#name');
    await expect(
      page.getByText(
        'A learner in this academy already has this name. Add a middle or family name so it is unique here.'
      )
    ).toBeVisible();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toBeFocused();
  });

  test('J38b: the same refusal in Arabic on a phone, right-to-left', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    const tag = uniqueLearnerName('x').split(' ')[1];
    await registerLearnerViaApi(page, academyId, `مُحَمَّد أَحْمَد ${tag}`);

    await seedCookieDecision(page);
    await setLanguage(page, 'ar');
    await fillWebsiteSignUp(page, `محـــمد احمد ${tag}`, 'ar');

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(
      page.getByText('يوجد متعلّم في هذه الأكاديمية يحمل هذا الاسم بالفعل', {
        exact: false,
      })
    ).toBeVisible();
    await expect(page.locator('#name')).toHaveAttribute('aria-invalid', 'true');
    // No horizontal scroll at 390 px.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('J38c: organization create — a taken name gets the generic message on the field', async ({
    page,
  }) => {
    // Somebody else's organization, created through the API.
    const holderEmail = uniqueLearnerEmail('j38-holder');
    const holderReg = await page.request.post(`${API_BASE}/auth/register`, {
      data: {
        name: uniqueLearnerName('J38 Holder'),
        email: holderEmail,
        password: LEARNER_PASSWORD,
      },
    });
    expect(holderReg.status(), await holderReg.text()).toBe(201);
    const holder = await apiSignIn(page.request, {
      email: holderEmail,
      password: LEARNER_PASSWORD,
      surface: 'management',
    });
    const orgName = uniqueLearnerName('J38 Nile Learning');
    const created = await apiPost(page.request, holder, '/organizations', {
      name: orgName,
    });
    expect(created.status(), await created.text()).toBe(201);

    // A second person tries the same name, differently cased.
    const email = uniqueLearnerEmail('j38-org');
    const reg = await page.request.post(`${API_BASE}/auth/register`, {
      data: {
        name: uniqueLearnerName('J38 Founder'),
        email,
        password: LEARNER_PASSWORD,
      },
    });
    expect(reg.status(), await reg.text()).toBe(201);
    await seedCookieDecision(page);
    await setLanguage(page, 'en');
    await signInThroughDashboard(page, email, LEARNER_PASSWORD);
    await page.waitForURL(/\/dashboard|\/onboarding|\/welcome/, {
      timeout: 60_000,
    });
    await page.goto('/dashboard/organization/create');

    const field = page.getByRole('textbox').first();
    await field.fill(orgName.toLowerCase());
    await page.locator('main form button[type="submit"]').click();

    await expect(
      page.getByText(
        "This organization name isn't available. Please try another."
      )
    ).toBeVisible();
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    // Nothing about the holder is shown.
    await expect(page.getByText(holderEmail)).toHaveCount(0);
  });

  test('J38d: academy settings — another academy’s name is refused on the name field', async ({
    page,
  }) => {
    await seedCookieDecision(page);
    await setLanguage(page, 'en');
    await signInThroughDashboard(page, SEED.owner, SEED.password);
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
    await page.goto(`/dashboard/academy/${academyId}/settings`);

    const name = page.getByLabel(/academy name/i).first();
    await expect(name).toBeVisible();
    // Another organization's academy, in a different case.
    await name.fill(SEED.otherAcademyName.toUpperCase());
    await page.getByRole('button', { name: /^save/i }).first().click();

    await expect(
      page.getByText(
        'Another academy already uses this name. Please choose a different one.'
      )
    ).toBeVisible();
    await expect(name).toHaveAttribute('aria-invalid', 'true');

    const [row] = await adminQuery<{ name: string }>(
      `select name from academies where id = :'id'`,
      { id: academyId }
    );
    expect(row.name).toBe(SEED.academyName);
  });

  test('J38e: learner profile — a clashing rename is refused and names the academy', async ({
    page,
  }) => {
    const takenFirst = 'Taken';
    const takenLast = uniqueLearnerName('Clash').replace(/\s+/g, '');
    await registerLearnerViaApi(page, academyId, `${takenFirst} ${takenLast}`);
    const email = await registerLearnerViaApi(
      page,
      academyId,
      uniqueLearnerName('J38 Renamer')
    );

    await seedCookieDecision(page);
    await setLanguage(page, 'en');
    await page.goto(academyPath('/sign-in'));
    await declineCookies(page);
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(LEARNER_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/my(\/|\?|$)/, { timeout: 60_000 });

    await page.goto(academyPath('/my/profile'));
    await page.getByRole('button', { name: /^edit$/i }).click();
    await page.locator('#firstName').fill(takenFirst.toLowerCase());
    await page.locator('#lastName').fill(takenLast.toUpperCase());
    await page.getByRole('button', { name: /^save( changes)?$/i }).click();

    const message = page.locator('#lastName-error');
    await expect(message).toContainText(
      `Another learner already uses this name in ${SEED.academyName}.`
    );
    await expect(page.locator('#lastName')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });

  test('J38f: website sign-up refusal in EN and AR, desktop and phone', async ({
    browser,
  }) => {
    for (const variant of VARIANTS) {
      const context = await browser.newContext({
        viewport: { width: variant.width, height: variant.height },
      });
      const page = await context.newPage();
      try {
        const held = uniqueLearnerName(
          variant.language === 'ar' ? 'سارة' : 'Maria'
        );
        await registerLearnerViaApi(page, academyId, held);
        await seedCookieDecision(page);
        await setLanguage(page, variant.language);
        await fillWebsiteSignUp(page, held.toUpperCase(), variant.language);
        await expect(page.locator('html')).toHaveAttribute(
          'dir',
          variant.language === 'ar' ? 'rtl' : 'ltr'
        );
        await expect(
          page.getByText(
            variant.language === 'ar'
              ? 'يوجد متعلّم في هذه الأكاديمية يحمل هذا الاسم بالفعل'
              : 'A learner in this academy already has this name.',
            { exact: false }
          )
        ).toBeVisible();
        await expect(page.locator('#name')).toHaveAttribute(
          'aria-invalid',
          'true'
        );
        await expectNoSidewaysScroll(page);
        await captureEvidence(page, `unique-name-signup-${variant.name}`);
      } finally {
        await context.close();
      }
    }
  });

  test('J38g: academy settings refusal in EN and AR, desktop and phone', async ({
    page,
  }) => {
    await clearAuthRateLimits();
    await seedCookieDecision(page);
    await setLanguage(page, 'en');
    await signInThroughDashboard(page, SEED.owner, SEED.password);
    await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
    await page.goto(`/dashboard/academy/${academyId}/settings`);
    // Each reload leaves a refused (unsaved) edit behind: leave it.
    page.on('dialog', (dialog) => void dialog.accept());
    try {
      for (const variant of VARIANTS) {
        // The init script pins a language on every load; this one wins.
        await page.addInitScript((lang) => {
          window.localStorage.setItem('atlas:language', JSON.stringify(lang));
        }, variant.language);
        await applyVariant(page, variant);
        const ar = variant.language === 'ar';
        const name = page
          .getByLabel(ar ? 'اسم الأكاديمية' : /academy name/i)
          .first();
        await expect(name).toHaveValue(SEED.academyName, { timeout: 60_000 });
        await name.fill(SEED.otherAcademyName.toLowerCase());
        await page
          .getByRole('button', { name: ar ? /^حفظ/ : /^save/i })
          .first()
          .click();
        await expect(
          page.getByText(
            ar
              ? 'هذا الاسم مستخدم بالفعل لأكاديمية أخرى. يُرجى اختيار اسم مختلف.'
              : 'Another academy already uses this name. Please choose a different one.'
          )
        ).toBeVisible();
        await expect(name).toHaveAttribute('aria-invalid', 'true');
        await expectNoSidewaysScroll(page);
        await captureEvidence(page, `unique-name-settings-${variant.name}`);
      }
    } finally {
      await page.addInitScript(() => {
        window.localStorage.setItem('atlas:language', JSON.stringify('en'));
      });
      await setStoredLanguage(page, 'en');
    }
    const [row] = await adminQuery<{ name: string }>(
      `select name from academies where id = :'id'`,
      { id: academyId }
    );
    expect(row.name).toBe(SEED.academyName);
  });
});
