/**
 * J41 — W8 gifted setup days on the first paid subscription, Chromium
 * against the real stack and database.
 *
 * NEEDS THE INTEGRATED REBUILD: the API on :3000 serves a prebuilt dist, and
 * everything asserted here (plan gift fields, the gift at approval, the
 * lifecycle `giftAvailable`) is new backend code.
 *
 *   1  the Platform Owner opens the plan catalog, edits this journey's own
 *      plan: an out-of-range value (16) is refused inline and blocks saving;
 *      7 monthly / 14 yearly saves, and the catalog row says so;
 *   2  a brand-new Organization owner sees "Your first paid subscription
 *      includes 7 gifted setup days" at checkout; the payment is approved;
 *      the owner's subscription page and billing overview show "Includes 7
 *      gifted setup days" (also in Arabic, RTL), and the paid period starts
 *      7 days after approval;
 *   3  the Platform Owner sees the gift on the organization's detail page;
 *   4  the same owner's SECOND organization is not offered the gift, and its
 *      approved payment grants none (one gift per customer identity);
 *   2b the owner's billing overview with the gift in EN and AR, desktop and
 *      phone (before the second organization exists);
 *   5  the plan editor's gifted-days section (Platform Owner) in EN and AR,
 *      desktop and phone.
 *
 * The plan is this journey's own and is archived afterwards.
 */
import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import {
  API_BASE,
  LEARNER_PASSWORD,
  SEED,
  apiGet,
  apiPatch,
  apiPost,
  apiSignIn,
  seedCookieDecision,
  signInThroughDashboard,
  uniqueLearnerEmail,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import { TINY_PNG, dataUrl, signInPlatformOwner } from './support/phase4';
import {
  VARIANTS,
  applyVariant,
  captureEvidence,
  expectNoSidewaysScroll,
  setStoredLanguage,
  waitForSessionRestore,
} from './support/evidence';

test.describe.configure({ mode: 'serial' });

const stamp = `${Date.now()}`;
const DAY_MS = 24 * 60 * 60 * 1000;
const PLAN = {
  key: `j41-gift-${stamp}`,
  name: `J41 Gift Plan ${stamp}`,
  monthly: 59,
};
const ROUTES = {
  plans: '/dashboard/platform/plans',
  checkout: (planKey: string) =>
    `/dashboard/tenant/billing/checkout/plan_subscription/${planKey}`,
  subscription: '/dashboard/tenant/subscription',
  billing: '/dashboard/tenant/billing',
  orgDetail: (id: string) => `/dashboard/platform/organizations/${id}`,
};

interface Owner {
  email: string;
  session: Session;
}

async function registerOwner(
  request: APIRequestContext,
  label: string
): Promise<Owner> {
  const email = uniqueLearnerEmail(label);
  const registered = await request.post(`${API_BASE}/auth/register`, {
    data: { name: `J41 ${label}`, email, password: LEARNER_PASSWORD },
  });
  expect(registered.status(), await registered.text()).toBe(201);
  const session = await apiSignIn(request, {
    email,
    password: LEARNER_PASSWORD,
    surface: 'management',
  });
  return { email, session };
}

async function createOrganization(
  request: APIRequestContext,
  owner: Owner,
  label: string
): Promise<string> {
  const created = await apiPost(request, owner.session, '/organizations', {
    name: `J41 ${label} Org ${stamp}`,
  });
  expect(created.status(), await created.text()).toBe(201);
  // A fresh token carries the new membership.
  owner.session = await apiSignIn(request, {
    email: owner.email,
    password: LEARNER_PASSWORD,
    surface: 'management',
  });
  return (await created.json()).id as string;
}

/** checkout → payment → proof → Platform Owner approval, all over the API. */
async function payAndApprove(
  request: APIRequestContext,
  owner: Owner,
  organizationId: string,
  platformOwner: Session,
  methodKey: string
): Promise<number> {
  const checkout = await apiPost(
    request,
    owner.session,
    `/organizations/${organizationId}/checkouts`,
    {
      target: { type: 'plan_subscription', planKey: PLAN.key },
      billingCycle: 'monthly',
      idempotencyKey: `j41-${organizationId}`,
    }
  );
  expect(checkout.status(), await checkout.text()).toBe(201);
  const payment = await apiPost(
    request,
    owner.session,
    `/organizations/${organizationId}/payments`,
    { checkoutId: (await checkout.json()).id, methodKey }
  );
  expect(payment.status(), await payment.text()).toBe(201);
  const paymentId = (await payment.json()).id as string;
  const proof = await apiPatch(
    request,
    owner.session,
    `/organizations/${organizationId}/payments/${paymentId}/proof`,
    {
      fileData: dataUrl('image/png', TINY_PNG),
      fileName: 'j41-receipt.png',
      mimeType: 'image/png',
    }
  );
  expect(proof.ok(), await proof.text()).toBeTruthy();
  const approvedAt = Date.now();
  const approved = await apiPost(
    request,
    platformOwner,
    `/payments/${paymentId}/approve`,
    { notes: 'J41 approval' }
  );
  expect(approved.ok(), await approved.text()).toBeTruthy();
  return approvedAt;
}

async function signInOwnerPage(
  page: Page,
  email: string,
  language: 'en' | 'ar' = 'en'
): Promise<void> {
  await seedCookieDecision(page);
  // The sign-in form is driven in English (its selectors are English);
  // the language is switched afterwards, for the pages under test.
  await signInThroughDashboard(page, email, LEARNER_PASSWORD);
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30_000 });
  // Let the post-sign-in session restore finish before the next full load.
  await waitForSessionRestore(page);
  if (language === 'ar') await setStoredLanguage(page, 'ar');
}

test.describe('J41 — gifted setup days on the first paid subscription', () => {
  let platformOwner: Session;
  let methodKey: string;
  let owner: Owner;
  let firstOrgId: string;
  let secondOrgId: string;

  test.beforeAll(async ({ request }) => {
    test.setTimeout(120_000);
    await clearAuthRateLimits();
    platformOwner = await signInPlatformOwner(request);

    const seedOwner = await apiSignIn(request, {
      email: SEED.owner,
      password: SEED.password,
      surface: 'management',
    });
    const starter = await (
      await apiGet(request, seedOwner, '/plans/starter')
    ).json();
    // Created WITHOUT a gift: step 1 configures it through the UI.
    const plan = await apiPost(request, platformOwner, '/platform-plans', {
      key: PLAN.key,
      name: PLAN.name,
      description: 'Playwright journey J41 (test plan).',
      displayOrder: 941,
      limits: starter.limits,
      features: starter.features,
      pricing: {
        amount: PLAN.monthly,
        currency: 'USD',
        billingCycle: 'monthly',
      },
    });
    expect(plan.status(), await plan.text()).toBe(201);

    // Any enabled manual method the customer can pay with.
    const methods = await apiGet(request, seedOwner, '/payment-methods', {
      pageSize: '100',
    });
    expect(methods.ok(), await methods.text()).toBeTruthy();
    const body = await methods.json();
    const items = (Array.isArray(body) ? body : body.items) as {
      key: string;
      enabled: boolean;
      type: string;
    }[];
    const method = items.find((m) => m.enabled && m.type.startsWith('manual_'));
    expect(method, 'an enabled manual payment method exists').toBeTruthy();
    methodKey = method!.key;

    owner = await registerOwner(request, 'j41-owner');
    firstOrgId = await createOrganization(request, owner, 'first');
  });

  test.afterAll(async ({ request }) => {
    const plan = await apiGet(request, platformOwner, `/plans/${PLAN.key}`);
    if (plan.ok()) {
      const archived = await apiPost(
        request,
        platformOwner,
        `/platform-plans/${PLAN.key}/archive`,
        { expectedVersion: (await plan.json()).version }
      );
      expect(archived.ok(), await archived.text()).toBeTruthy();
    }
  });

  test('1: the Platform Owner configures 7/14 gifted days; 16 is refused inline', async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await seedCookieDecision(page);
    await signInThroughDashboard(page, 'admin@atlas.dev', SEED.password);
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
    await page.goto(ROUTES.plans);
    await page.getByTestId(`plan-edit-${PLAN.key}`).click({ timeout: 30_000 });

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Gifted setup days' })
    ).toBeVisible();
    const monthly = page.getByTestId('plan-gifted-monthly');
    const yearly = page.getByTestId('plan-gifted-yearly');

    await monthly.fill('16');
    await expect(page.getByTestId('plan-gifted-monthly-error')).toBeVisible();
    await expect(monthly).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByTestId('plan-save')).toBeDisabled();
    await page.screenshot({ path: testInfo.outputPath('1-out-of-range.png') });

    await monthly.fill('7');
    await yearly.fill('14');
    const saved = page.waitForResponse(
      (r) =>
        r.request().method() === 'PATCH' &&
        r.url().includes(`/platform-plans/${PLAN.key}`)
    );
    await page.getByTestId('plan-save').click();
    const response = await saved;
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      giftedDaysMonthly: 7,
      giftedDaysYearly: 14,
    });
    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(
      page.getByTestId(`plan-gift-summary-${PLAN.key}`)
    ).toContainText('Gifted setup days: 7 monthly · 14 yearly', {
      timeout: 15_000,
    });
  });

  test('1b: the public Pricing page shows this plan’s own gifted days, from the catalog (EN + AR, desktop + phone)', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    // An anonymous visitor: no session, the marketing site only.
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await seedCookieDecision(page);
      await page.goto('/pricing');
      for (const variant of VARIANTS) {
        await applyVariant(page, variant);
        const note = page.getByTestId(`marketing-plan-gift-${PLAN.key}`);
        // 7 days monthly, read from `GET /public/plans`. The plan has no
        // yearly price, so its 14 yearly days are never advertised.
        await expect(note).toContainText(
          variant.language === 'ar'
            ? 'الفوترة الشهرية: 7 أيام'
            : 'Monthly billing: 7 days',
          { timeout: 30_000 }
        );
        await expect(note).not.toContainText(
          variant.language === 'ar' ? 'السنوية' : 'Yearly'
        );
        // The comparison table carries the same catalog figure.
        await expect(
          page.getByTestId('pricing-comparison-gift-row')
        ).toContainText(
          variant.language === 'ar'
            ? 'الفوترة الشهرية: 7 أيام'
            : 'Monthly billing: 7 days'
        );
        const explainer = page.getByTestId('pricing-gifted-days');
        await expect(explainer).toContainText(
          variant.language === 'ar'
            ? 'تتضمن بعض الخطط أيام إعداد مُهداة'
            : 'Some plans include gifted setup days'
        );
        await expectNoSidewaysScroll(page);
        await note.scrollIntoViewIfNeeded();
        await captureEvidence(page, `pricing-gift-card-${variant.name}`);
        await explainer.scrollIntoViewIfNeeded();
        await captureEvidence(page, `pricing-gift-explainer-${variant.name}`);
      }
    } finally {
      await setStoredLanguage(page, 'en');
      await context.close();
    }
  });

  test('1c: the Privacy Policy explains the eligibility ledgers (EN + AR, desktop + phone)', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await seedCookieDecision(page);
      await page.goto('/privacy-policy');
      for (const variant of VARIANTS) {
        await applyVariant(page, variant);
        const article = page.getByRole('article');
        await expect(article).toHaveAttribute(
          'dir',
          variant.language === 'ar' ? 'rtl' : 'ltr'
        );
        await expect(article).toContainText(
          variant.language === 'ar' ? '٤ أكتوبر ٢٠٢٦' : '4 October 2026'
        );
        const heading = page.locator('#eligibility-records h2');
        await expect(heading).toHaveText(
          variant.language === 'ar'
            ? '٦. الفترات التجريبية المجانية وأيام الاشتراك المُهداة'
            : '6. Free trials and gifted subscription days'
        );
        await expectNoSidewaysScroll(page);
        await heading.scrollIntoViewIfNeeded();
        await captureEvidence(page, `privacy-ledgers-${variant.name}`);
      }
    } finally {
      await setStoredLanguage(page, 'en');
      await context.close();
    }
  });

  test('2: a new customer is offered the gift, receives it, and sees it on the billing pages (EN + AR)', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(180_000);
    await clearAuthRateLimits();
    const context = await browser.newContext();
    const page = await context.newPage();
    await signInOwnerPage(page, owner.email);
    await page.goto(ROUTES.checkout(PLAN.key));
    await expect(page.getByTestId('plan-gift-offer')).toContainText(
      'Your first paid subscription includes 7 gifted setup days',
      { timeout: 30_000 }
    );
    await page.screenshot({
      path: testInfo.outputPath('2-checkout-offer.png'),
      fullPage: true,
    });

    const approvedAt = await payAndApprove(
      request,
      owner,
      firstOrgId,
      platformOwner,
      methodKey
    );

    const subscription = await (
      await apiGet(
        request,
        owner.session,
        `/organizations/${firstOrgId}/subscription`
      )
    ).json();
    expect(subscription).toMatchObject({ status: 'active', giftedDays: 7 });
    const giftEnds = Date.parse(subscription.giftedEndsAt);
    expect(giftEnds - Date.parse(subscription.giftedStartsAt)).toBe(7 * DAY_MS);
    expect(Math.abs(giftEnds - (approvedAt + 7 * DAY_MS))).toBeLessThan(60_000);
    expect(Date.parse(subscription.currentPeriodStart)).toBe(giftEnds);

    await page.goto(ROUTES.subscription);
    const gift = page.getByTestId('subscription-gift');
    await expect(gift).toContainText('Includes 7 gifted setup days', {
      timeout: 30_000,
    });
    await expect(gift).toContainText('7 gifted days left');
    await expect(gift).toContainText('Paid period');
    await page.screenshot({
      path: testInfo.outputPath('2-subscription-en.png'),
      fullPage: true,
    });

    await page.goto(ROUTES.billing);
    await expect(page.getByTestId('subscription-gift')).toContainText(
      'Includes 7 gifted setup days',
      { timeout: 30_000 }
    );

    // At phone width, in Arabic (RTL): the same facts, no horizontal scroll.
    const arContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const arPage = await arContext.newPage();
    await signInOwnerPage(arPage, owner.email, 'ar');
    await arPage.goto(ROUTES.subscription);
    await expect(arPage.getByTestId('subscription-gift')).toContainText(
      'يتضمن 7 أيام إعداد مُهداة',
      { timeout: 30_000 }
    );
    expect(await arPage.evaluate(() => document.documentElement.dir)).toBe(
      'rtl'
    );
    expect(
      await arPage.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      )
    ).toBeLessThanOrEqual(1);
    await arPage.screenshot({
      path: testInfo.outputPath('2-subscription-ar-390.png'),
      fullPage: true,
    });
    await arContext.close();
    await context.close();
  });

  test('2b: the billing overview shows the gift in EN and AR, desktop and phone', async ({
    browser,
  }) => {
    test.setTimeout(180_000);
    await clearAuthRateLimits();
    const ownerContext = await browser.newContext();
    const page = await ownerContext.newPage();
    try {
      await signInOwnerPage(page, owner.email);
      await page.goto(ROUTES.billing);
      for (const variant of VARIANTS) {
        await applyVariant(page, variant);
        const gift = page.getByTestId('subscription-gift');
        await expect(gift).toContainText(
          variant.language === 'ar'
            ? 'يتضمن 7 أيام إعداد مُهداة'
            : 'Includes 7 gifted setup days',
          { timeout: 30_000 }
        );
        await gift.scrollIntoViewIfNeeded();
        await expectNoSidewaysScroll(page);
        await captureEvidence(page, `billing-gift-${variant.name}`);
      }
    } finally {
      await setStoredLanguage(page, 'en');
      await ownerContext.close();
    }
  });

  test('3: the Platform Owner sees the gift on the organization detail page', async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await clearAuthRateLimits();
    await seedCookieDecision(page);
    await signInThroughDashboard(page, 'admin@atlas.dev', SEED.password);
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
    await page.goto(ROUTES.orgDetail(firstOrgId));
    await expect(page.getByTestId('platform-org-gift')).toContainText(
      'Includes 7 gifted setup days',
      { timeout: 30_000 }
    );
  });

  test('4: the same owner’s second organization is neither offered nor granted a gift', async ({
    request,
  }) => {
    test.setTimeout(180_000);
    await clearAuthRateLimits();
    secondOrgId = await createOrganization(request, owner, 'second');

    const lifecycle = await (
      await apiGet(
        request,
        owner.session,
        `/organizations/${secondOrgId}/subscription/lifecycle`
      )
    ).json();
    expect(lifecycle.giftAvailable).toBe(false);

    await payAndApprove(request, owner, secondOrgId, platformOwner, methodKey);
    const subscription = await (
      await apiGet(
        request,
        owner.session,
        `/organizations/${secondOrgId}/subscription`
      )
    ).json();
    expect(subscription.status).toBe('active');
    expect(subscription.giftedDays).toBeUndefined();

    // The first organization's gift is untouched.
    const first = await (
      await apiGet(
        request,
        owner.session,
        `/organizations/${firstOrgId}/subscription`
      )
    ).json();
    expect(first.giftedDays).toBe(7);
  });

  test('5: the plan editor’s gifted-days section in EN and AR, desktop and phone', async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    await clearAuthRateLimits();

    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    try {
      await seedCookieDecision(admin);
      await signInThroughDashboard(admin, 'admin@atlas.dev', SEED.password);
      await admin.waitForURL(/\/dashboard/, { timeout: 30_000 });
      await admin.goto(ROUTES.plans);
      for (const variant of VARIANTS) {
        await applyVariant(admin, variant);
        await admin
          .getByTestId(`plan-edit-${PLAN.key}`)
          .click({ timeout: 30_000 });
        const dialog = admin.getByRole('dialog');
        await expect(
          dialog.getByRole('heading', {
            name:
              variant.language === 'ar'
                ? 'أيام الإعداد المُهداة'
                : 'Gifted setup days',
          })
        ).toBeVisible();
        await expect(admin.getByTestId('plan-gifted-monthly')).toHaveValue('7');
        await admin.getByTestId('plan-gifted-monthly').scrollIntoViewIfNeeded();
        await expectNoSidewaysScroll(admin);
        await captureEvidence(admin, `plan-admin-gift-${variant.name}`);
        await admin.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
      }
    } finally {
      await setStoredLanguage(admin, 'en');
      await adminContext.close();
    }
  });
});
