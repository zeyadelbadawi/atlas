/**
 * J38 — unique names (W4), Chromium against the real stack and database.
 *
 *  - Academy website sign-up (security review finding M2): a learner name
 *    already used in this academy (any case, accents, Arabic marks) is NOT
 *    revealed at registration — the answer an unauthenticated caller gets
 *    is byte-for-byte the one a free name gets, and the form shows the same
 *    success state. The clash is admitted exempt; once the address is
 *    verified, the learner's profile asks them to choose a different
 *    display name (`nameChangeSuggested`), and a rename to another taken
 *    name is refused. EN on desktop, AR on a 390 px phone (RTL, Arabic).
 *  - Organization create: a name already used anywhere on Atlas gets the
 *    generic "isn't available" message on the name field, never the holder.
 *  - Academy settings: renaming to another academy's name (another
 *    organization's, different case) is refused on the name field and the
 *    stored name is unchanged.
 *  - Learner profile: a rename that clashes with another learner of the
 *    learner's academy is refused on the family-name field, naming that
 *    academy.
 *  - The website sign-up (accepted, no oracle) and the academy-settings
 *    refusal in EN and AR, on a desktop and a 390 px phone (evidence matrix).
 *
 * Verification uses the real `/verify-email` link page: as J31 does, the
 * journey writes a known token's SHA-256 digest for its own learner, since
 * the emailed link cannot be read from the browser. Every name is unique
 * per run (the database persists between runs and names are now unique).
 */
import { createHash, randomBytes } from 'node:crypto';
import { test, expect as baseExpect, type Page } from '@playwright/test';
import {
  API_BASE,
  LEARNER_PASSWORD,
  SEED,
  academyPath,
  apiPost,
  apiSignIn,
  declineCookies,
  fillSignUpPhone,
  requireSeed,
  resolveAcademy,
  seedCookieDecision,
  signInThroughDashboard,
  signOutInBrowser,
  uniqueLearnerEmail,
  uniqueLearnerName,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import { adminQuery, adminSql } from './support/admin-db';
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

/** `/auth/register` with an academy, as an unauthenticated caller would send it. */
async function registerRaw(
  page: Page,
  academyId: string,
  name: string,
  email = uniqueLearnerEmail('j38-raw')
): Promise<{ status: number; body: string }> {
  const res = await page.request.post(`${API_BASE}/auth/register`, {
    data: { name, email, password: LEARNER_PASSWORD, academyId },
  });
  return { status: res.status(), body: await res.text() };
}

async function fillWebsiteSignUp(
  page: Page,
  name: string,
  language: 'en' | 'ar' = 'en',
  email = uniqueLearnerEmail('j38-dup')
): Promise<void> {
  // The public website's language is in its address (`/ar/…`), not in the
  // dashboard's stored preference.
  await page.goto(academyPath(language === 'ar' ? '/ar/sign-up' : '/sign-up'));
  await declineCookies(page);
  await page.locator('#name').fill(name);
  await page.locator('#email').fill(email);
  await fillSignUpPhone(page);
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

const SIGN_UP_SUCCESS = {
  en: 'Sign in to continue. If this email is new to Atlas, your account is ready.',
  ar: 'سجّل الدخول للمتابعة. إذا كان هذا البريد الإلكتروني جديدًا على أطلس، فحسابك جاهز.',
} as const;

const NAME_PROMPT = {
  en: 'Please choose a different display name',
  ar: 'يُرجى اختيار اسم عرض مختلف',
} as const;

/**
 * The website accepted the sign-up exactly as it accepts a free name: the
 * same success state, and nothing on the name field.
 */
async function expectSignUpAccepted(
  page: Page,
  language: 'en' | 'ar'
): Promise<void> {
  await expect(
    page.getByText(SIGN_UP_SUCCESS[language], { exact: false })
  ).toBeVisible();
  await expect(page.locator('#name')).toHaveCount(0);
  await expect(
    page.getByText(
      language === 'ar'
        ? 'يوجد متعلّم في هذه الأكاديمية يحمل هذا الاسم بالفعل'
        : 'A learner in this academy already has this name',
      { exact: false }
    )
  ).toHaveCount(0);
}

/** Verifies the learner's address through the real `/verify-email` link page. */
async function verifyThroughLink(
  page: Page,
  email: string,
  language: 'en' | 'ar'
): Promise<void> {
  const [user] = await adminQuery<{ id: string }>(
    `select id from users where email = :'email'`,
    { email }
  );
  expect(user, `the account for ${email} exists`).toBeTruthy();
  const raw = randomBytes(32).toString('base64url');
  const hash = createHash('sha256').update(raw).digest('hex');
  await adminSql(
    `insert into email_verification_tokens (id, user_id, token_hash, expires_at)
     values (gen_random_uuid()::text, :'user', :'hash', now() + interval '1 hour');`,
    { user: user.id, hash }
  );
  // A link confirms only for its own account's session (ATO hardening F1):
  // the learner signs in first, opens it, and signs out again so the rest
  // of the journey starts from the same signed-out state as before.
  await signInOnAcademyWebsite(page, email, language);
  await page.goto(
    academyPath(`${language === 'ar' ? '/ar' : ''}/verify-email?token=${raw}`)
  );
  await expect(page.getByTestId('verify-email-success')).toBeVisible({
    timeout: 90_000,
  });
  await signOutInBrowser(page);
  const [after] = await adminQuery<{ verified: string | null }>(
    `select email_verified_at as verified from users where id = :'id'`,
    { id: user.id }
  );
  expect(after.verified).not.toBeNull();
}

/** Signs in on the academy website (either language) and waits for My Learn. */
async function signInOnAcademyWebsite(
  page: Page,
  email: string,
  language: 'en' | 'ar'
): Promise<void> {
  const prefix = language === 'ar' ? '/ar' : '';
  await page.goto(academyPath(`${prefix}/sign-in`));
  await declineCookies(page);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(LEARNER_PASSWORD);
  await page.locator('form button[type="submit"]').first().click();
  await expect(page).toHaveURL(/\/my(\/|\?|$)/, { timeout: 60_000 });
}

/** Signs in on the academy website (either language) and opens the profile. */
async function openLearnerProfile(
  page: Page,
  email: string,
  language: 'en' | 'ar'
): Promise<void> {
  await signInOnAcademyWebsite(page, email, language);
  const prefix = language === 'ar' ? '/ar' : '';
  await page.goto(academyPath(`${prefix}/my/profile`));
}

test.describe('J38 — unique names', () => {
  let academyId: string;

  test.beforeAll(async ({ request }) => {
    await clearAuthRateLimits();
    await requireSeed(request);
    academyId = (await resolveAcademy(request)).id;
  });

  test('J38a: a taken learner name is not revealed at sign-up; after verification the profile asks for another name (EN desktop)', async ({
    page,
  }) => {
    const held = uniqueLearnerName('José Ruiz');
    await registerLearnerViaApi(page, academyId, held);

    // The API answer for a taken name is the answer for a free one.
    const clashing = held.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const taken = await registerRaw(page, academyId, clashing);
    const free = await registerRaw(
      page,
      academyId,
      uniqueLearnerName('J38 Free Name')
    );
    expect(taken.status, taken.body).toBe(201);
    expect(taken).toEqual(free);
    expect(taken.body).not.toMatch(/nameTaken|learnerName/i);

    // The website form: same success state, nothing on the name field.
    await seedCookieDecision(page);
    await setLanguage(page, 'en');
    const email = uniqueLearnerEmail('j38a-clash');
    // Same person-name, different case and no accents.
    await fillWebsiteSignUp(page, clashing, 'en', email);
    await expectSignUpAccepted(page, 'en');

    // Only the verified account itself is told, in its profile.
    await verifyThroughLink(page, email, 'en');
    await openLearnerProfile(page, email, 'en');
    const prompt = page.getByTestId('name-change-suggested');
    await expect(prompt).toBeVisible();
    await expect(prompt).toContainText(NAME_PROMPT.en);
    await expect(prompt).toContainText(SEED.academyName);

    // A rename to another taken name is refused on the field...
    const otherFirst = 'Taken';
    const otherLast = uniqueLearnerName('Other').replace(/\s+/g, '');
    await registerLearnerViaApi(page, academyId, `${otherFirst} ${otherLast}`);
    await prompt.getByRole('button', { name: 'Change name' }).click();
    await page.locator('#firstName').fill(otherFirst);
    await page.locator('#lastName').fill(otherLast.toLowerCase());
    await page.getByRole('button', { name: /^save( changes)?$/i }).click();
    await expect(page.locator('#lastName-error')).toContainText(
      `Another learner already uses this name in ${SEED.academyName}.`
    );
    await expect(page.locator('#lastName')).toHaveAttribute(
      'aria-invalid',
      'true'
    );

    // ...and a free one is saved and ends the prompt.
    await page.locator('#firstName').fill('José');
    await page
      .locator('#lastName')
      .fill(uniqueLearnerName('Ruiz Hassan').replace(/\s+/g, ''));
    await page.getByRole('button', { name: /^save( changes)?$/i }).click();
    await expect(page.getByTestId('name-change-suggested')).toHaveCount(0);
  });

  test('J38b: the same in Arabic on a phone, right-to-left', async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    const tag = uniqueLearnerName('x').split(' ')[1];
    await registerLearnerViaApi(page, academyId, `مُحَمَّد أَحْمَد ${tag}`);

    await seedCookieDecision(page);
    await setLanguage(page, 'ar');
    const email = uniqueLearnerEmail('j38b-clash');
    await fillWebsiteSignUp(page, `محـــمد احمد ${tag}`, 'ar', email);

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expectSignUpAccepted(page, 'ar');
    await expectNoSidewaysScroll(page);

    await verifyThroughLink(page, email, 'ar');
    await openLearnerProfile(page, email, 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const prompt = page.getByTestId('name-change-suggested');
    await expect(prompt).toBeVisible();
    await expect(prompt).toContainText(NAME_PROMPT.ar);
    await expect(
      prompt.getByRole('button', { name: 'تغيير الاسم' })
    ).toBeVisible();
    // No horizontal scroll at 390 px.
    await expectNoSidewaysScroll(page);
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

  test('J38f: website sign-up with a taken name is accepted like any other, EN and AR, desktop and phone', async ({
    browser,
  }) => {
    await clearAuthRateLimits();
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
        await expectSignUpAccepted(page, variant.language);
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
