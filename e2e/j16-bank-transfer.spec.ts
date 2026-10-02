/**
 * J16 — Bank Transfer for Atlas subscriptions (2 Oct 2026), Chromium
 * against the real stack and database.
 *
 * Production never runs the development seed, so until the Platform Owner
 * could add a bank account there was nothing to offer at checkout. Here:
 *
 *   1  the Platform Owner, on the console's Atlas Payment Provider page,
 *      adds a bank account through the dialog — a bad IBAN is refused in
 *      the browser before any request — saves it (disabled) and enables it;
 *   2  a dedicated Organization owner opens the checkout for a dedicated
 *      plan priced monthly AND yearly, sees both cycles, picks Yearly and
 *      its catalog price, chooses the bank account, lands on the payment
 *      page with those exact bank instructions (also in Arabic, RTL),
 *      uploads a PNG receipt and sees it awaiting review;
 *   3  the Platform Owner approves it in the review UI → the owner's
 *      billing shows the plan on a yearly cycle; a second organization's
 *      payment is rejected with a note in the same UI and its owner sees
 *      why; that second owner cannot open the first organization's
 *      payment, in the UI or the API.
 *
 * Accounts, organizations, the plan and the bank account are this
 * journey's own (fake values only). Shared state is restored afterwards:
 * the bank account is disabled again and the plan is archived, so neither
 * is offered to anyone after the run.
 *
 * Both screens read every page of the catalog (the paging fix), so the
 * new account is found however many methods the local database holds.
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

test.describe.configure({ mode: 'serial' });

const stamp = `${Date.now()}`;
const BANK = {
  displayName: `E2E Bank Transfer ${stamp}`,
  bankName: 'E2E Test Bank',
  accountName: 'E2E Test Account Holder',
  accountNumber: 'E2E 0001',
  iban: 'GB33BUKB20201555555555',
  swiftCode: 'BUKBGB22',
  instructions:
    'E2E test only: transfer the exact amount, then upload the receipt.',
  referenceInstructions:
    'E2E test only: write your organization name as the reference.',
};
const PLAN = {
  key: `j16-yearly-${stamp}`,
  name: `J16 Yearly Plan ${stamp}`,
  monthly: 49,
  yearly: 490,
};
/** Dashboard routes (`src/app/routes/route-paths.ts`). */
const ROUTES = {
  provider: '/dashboard/platform/atlas-payment-provider',
  review: '/dashboard/platform/payments',
  checkout: (planKey: string) =>
    `/dashboard/tenant/billing/checkout/plan_subscription/${planKey}`,
  payment: (paymentId: string) =>
    `/dashboard/tenant/billing/payments/${paymentId}`,
  billing: '/dashboard/tenant/billing',
};

interface OrgOwner {
  email: string;
  session: Session;
  organizationId: string;
}

/**
 * A new Organization owner: the account is registered on the management
 * surface (`POST /auth/register` with no academy — the self-service
 * signup) and creates its own Organization, which bootstraps its trial.
 */
async function createOrganizationOwner(
  request: APIRequestContext,
  label: string
): Promise<OrgOwner> {
  const email = uniqueLearnerEmail(label);
  const registered = await request.post(`${API_BASE}/auth/register`, {
    data: { name: `J16 ${label} Owner`, email, password: LEARNER_PASSWORD },
  });
  expect(registered.status(), await registered.text()).toBe(201);
  let session = await apiSignIn(request, {
    email,
    password: LEARNER_PASSWORD,
    surface: 'management',
  });
  const created = await apiPost(request, session, '/organizations', {
    name: `J16 ${label} Org ${stamp}`,
  });
  expect(created.status(), await created.text()).toBe(201);
  const organizationId: string = (await created.json()).id;
  // A fresh token carries the new membership.
  session = await apiSignIn(request, {
    email,
    password: LEARNER_PASSWORD,
    surface: 'management',
  });
  return { email, session, organizationId };
}

async function signInOwner(page: Page, email: string): Promise<void> {
  await seedCookieDecision(page);
  await signInThroughDashboard(page, email, LEARNER_PASSWORD);
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30_000 });
}

test.describe('J16 — Bank Transfer: configure, checkout, review', () => {
  let platformOwner: Session;
  let ownerA: OrgOwner;
  let ownerB: OrgOwner;
  let methodId: string;
  let methodKey: string;
  let paymentAId: string;
  let paymentBId: string;

  async function findMethod(request: APIRequestContext) {
    // The Platform Owner's catalog, every page.
    for (let page = 1; page < 50; page += 1) {
      const response = await apiGet(
        request,
        platformOwner,
        '/platform-payment-methods',
        {
          page: String(page),
          pageSize: '100',
        }
      );
      expect(response.ok(), await response.text()).toBeTruthy();
      const body = await response.json();
      const items = body.items as {
        id: string;
        key: string;
        displayName: string;
        enabled: boolean;
        manualInstructions?: Record<string, string>;
      }[];
      const found = items.find((m) => m.displayName === BANK.displayName);
      if (found) return { ...found, page };
      if (page >= body.pagination.totalPages) return null;
    }
    return null;
  }

  test.beforeAll(async ({ request }) => {
    test.setTimeout(120_000);
    await clearAuthRateLimits();
    platformOwner = await signInPlatformOwner(request);

    // A dedicated, customer-facing plan priced monthly with a whole-year price.
    const seedOwner = await apiSignIn(request, {
      email: SEED.owner,
      password: SEED.password,
      surface: 'management',
    });
    const starter = await (
      await apiGet(request, seedOwner, '/plans/starter')
    ).json();
    const plan = await apiPost(request, platformOwner, '/platform-plans', {
      key: PLAN.key,
      name: PLAN.name,
      description: 'Playwright journey J16 (test plan).',
      displayOrder: 900,
      limits: starter.limits,
      features: starter.features,
      pricing: {
        amount: PLAN.monthly,
        currency: 'USD',
        billingCycle: 'monthly',
        yearlyAmount: PLAN.yearly,
      },
    });
    expect(plan.status(), await plan.text()).toBe(201);

    ownerA = await createOrganizationOwner(request, 'j16a');
    ownerB = await createOrganizationOwner(request, 'j16b');
  });

  test.afterAll(async ({ request }) => {
    // Nothing this journey created stays on offer.
    if (methodId) {
      const disabled = await apiPatch(
        request,
        platformOwner,
        `/platform-payment-methods/${methodId}`,
        { enabled: false }
      );
      expect(disabled.ok(), await disabled.text()).toBeTruthy();
    }
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

  test('1: the Platform Owner adds a bank account in the dialog; a bad IBAN is refused in the browser', async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(120_000);
    await seedCookieDecision(page);
    await signInThroughDashboard(page, 'admin@atlas.dev', SEED.password);
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
    await page.goto(ROUTES.provider);
    const card = page.getByTestId('bank-transfer-methods-card');
    await expect(card).toContainText('Bank transfer accounts', {
      timeout: 30_000,
    });

    await page.getByTestId('bank-method-add').click();
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Add bank account' })
    ).toBeVisible();
    await page.getByTestId('bank-method-display-name').fill(BANK.displayName);
    await page.getByTestId('bank-method-bank-name').fill(BANK.bankName);
    await page.getByTestId('bank-method-account-name').fill(BANK.accountName);
    await page
      .getByTestId('bank-method-account-number')
      .fill(BANK.accountNumber);
    await page.getByTestId('bank-method-swift').fill(BANK.swiftCode);
    await page.getByTestId('bank-method-instructions').fill(BANK.instructions);
    await page
      .getByTestId('bank-method-reference-instructions')
      .fill(BANK.referenceInstructions);

    // A bad IBAN: refused on the form, and nothing is sent.
    const creates: string[] = [];
    page.on('request', (r) => {
      if (
        r.method() === 'POST' &&
        r.url().includes('/platform-payment-methods/bank-transfer')
      )
        creates.push(r.url());
    });
    await page.getByTestId('bank-method-iban').fill('NOT AN IBAN');
    await page.getByTestId('bank-method-save').click();
    await expect(
      dialog.getByText(
        'Enter a valid IBAN: two letters, two check digits, then the account characters.'
      )
    ).toBeVisible();
    await expect(page.getByTestId('bank-method-iban')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    await page.screenshot({ path: testInfo.outputPath('1-bad-iban.png') });
    expect(creates).toHaveLength(0);

    await page.getByTestId('bank-method-iban').fill(BANK.iban);
    const saved = page.waitForResponse(
      (r) =>
        r.request().method() === 'POST' &&
        r.url().includes('/platform-payment-methods/bank-transfer')
    );
    await page.getByTestId('bank-method-save').click();
    expect((await saved).status()).toBe(201);
    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText('Bank account added').first()).toBeVisible();
    expect(creates).toHaveLength(1);

    // The server has exactly what was typed, saved disabled.
    const method = await findMethod(request);
    expect(method, 'the new bank account is in the catalog').toBeTruthy();
    methodId = method!.id;
    methodKey = method!.key;
    expect(method!.enabled).toBe(false);
    expect(method!.manualInstructions).toMatchObject({
      type: 'manual_bank_transfer',
      bankName: BANK.bankName,
      accountNumber: BANK.accountNumber,
      iban: BANK.iban,
      swiftCode: BANK.swiftCode,
    });
  });

  test('1b: the Platform Owner enables the new account from the list', async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(120_000);
    // Each step signs in afresh; the limiter allows 10 per 15 minutes.
    await clearAuthRateLimits();
    await seedCookieDecision(page);
    await signInThroughDashboard(page, 'admin@atlas.dev', SEED.password);
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
    await page.goto(ROUTES.provider);
    const card = page.getByTestId('bank-transfer-methods-card');
    await expect(card).toContainText('Bank transfer accounts', {
      timeout: 30_000,
    });
    await page.screenshot({
      path: testInfo.outputPath('1b-list.png'),
      fullPage: true,
    });
    const row = page.getByTestId(`bank-method-row-${methodId}`);
    await expect(row, 'the new account is listed').toBeVisible({
      timeout: 15_000,
    });
    await expect(row).toContainText(BANK.displayName);
    await expect(row).toContainText(BANK.iban);
    await expect(row).toContainText('Disabled');
    await page.getByTestId(`bank-method-toggle-${methodId}`).click();
    await expect(row).toContainText('Enabled', { timeout: 15_000 });
    await expect(
      page
        .getByText(
          'Bank account enabled. Organizations can now choose it at checkout.'
        )
        .first()
    ).toBeVisible();
    expect((await findMethod(request))!.enabled).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath('1b-enabled.png'),
      fullPage: true,
    });
  });

  test('2: the Organization owner checks out Yearly, sees the bank instructions (EN and AR) and uploads a receipt', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(180_000);
    // Each step signs in afresh; the limiter allows 10 per 15 minutes.
    await clearAuthRateLimits();
    const context = await browser.newContext();
    const page = await context.newPage();
    await signInOwner(page, ownerA.email);
    await page.goto(ROUTES.checkout(PLAN.key));

    // Both cycles are offered; Yearly shows the plan's whole-year price.
    const monthly = page.getByRole('radio', { name: 'Monthly' });
    const yearly = page.getByRole('radio', { name: 'Yearly' });
    await expect(yearly).toBeVisible({ timeout: 30_000 });
    await expect(monthly).toBeVisible();
    await expect(page.getByTestId('checkout-cycle-price')).toContainText('$49');
    await expect(page.getByTestId('checkout-cycle-price')).toContainText('/mo');
    await yearly.click();
    await expect(yearly).toBeChecked();
    await expect(page.getByTestId('checkout-cycle-price')).toContainText(
      '$490'
    );
    await expect(page.getByTestId('checkout-cycle-price')).toContainText('/yr');
    await page.screenshot({
      path: testInfo.outputPath('2-checkout-yearly.png'),
      fullPage: true,
    });

    const checkoutCreated = page.waitForResponse(
      (r) =>
        r.request().method() === 'POST' &&
        r.url().includes(`/organizations/${ownerA.organizationId}/checkouts`)
    );
    await page.getByRole('button', { name: 'Start checkout' }).click();
    const checkout = await (await checkoutCreated).json();
    expect(checkout.snapshot).toMatchObject({ billingCycle: 'yearly' });
    await expect(page.getByText('Order summary')).toBeVisible();
    await expect(page.getByText(PLAN.name).first()).toBeVisible();
    await expect(page.getByText('/yr').first()).toBeVisible();

    // The bank account is offered under its checkout name; choose it.
    const option = page.locator(`#method-${methodKey}`);
    await option.scrollIntoViewIfNeeded();
    await expect(
      page.locator(`label[for="method-${methodKey}"]`)
    ).toContainText(BANK.displayName);
    await option.click();
    await page.getByRole('button', { name: 'Continue to payment' }).click();
    await page.waitForURL(
      /\/dashboard\/tenant\/billing\/payments\/[0-9a-f-]{36}/,
      {
        timeout: 30_000,
      }
    );
    paymentAId = page.url().split('/payments/')[1].split(/[?#]/)[0];

    // The instructions are the configured account's, exactly.
    await expect(page.getByText('Transfer instructions')).toBeVisible({
      timeout: 30_000,
    });
    const main = page.locator('main');
    for (const value of [
      BANK.bankName,
      BANK.accountName,
      BANK.accountNumber,
      BANK.iban,
      BANK.swiftCode,
      BANK.instructions,
      BANK.referenceInstructions,
    ]) {
      await expect(main.getByText(value, { exact: true })).toBeVisible();
    }
    await expect(main.getByText('$490').first()).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('2-payment-instructions-en.png'),
      fullPage: true,
    });

    // The same page in Arabic: RTL, the instructions still in full.
    const arContext = await browser.newContext();
    const arPage = await arContext.newPage();
    await arPage.addInitScript(() => {
      window.localStorage.setItem('atlas:language', JSON.stringify('ar'));
    });
    await seedCookieDecision(arPage);
    await arPage.goto('/auth/sign-in');
    await arPage.locator('input[type="email"]').fill(ownerA.email);
    await arPage.locator('input[type="password"]').fill(LEARNER_PASSWORD);
    await arPage.locator('form button[type="submit"]').click();
    await arPage.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30_000 });
    await arPage.goto(ROUTES.payment(paymentAId));
    await expect(arPage.getByText('تعليمات التحويل')).toBeVisible({
      timeout: 30_000,
    });
    expect(await arPage.evaluate(() => document.documentElement.dir)).toBe(
      'rtl'
    );
    await expect(
      arPage.locator('main').getByText(BANK.iban, { exact: true })
    ).toBeVisible();
    await expect(
      arPage.locator('main').getByText(BANK.bankName, { exact: true })
    ).toBeVisible();
    await expect(
      arPage.locator('main').getByText(BANK.instructions, { exact: true })
    ).toBeVisible();
    await expect(arPage.getByText('رقم الآيبان')).toBeVisible();
    await arPage.screenshot({
      path: testInfo.outputPath('2-payment-instructions-ar.png'),
      fullPage: true,
    });
    await arContext.close();

    // The receipt, through the page's own file picker.
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Choose file' }).click();
    await (
      await chooser
    ).setFiles({
      name: 'receipt.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    });
    await expect(
      page.getByRole('button', { name: 'receipt.png' })
    ).toBeVisible();
    await page.getByPlaceholder(/note/i).fill('E2E test transfer reference');
    await page.getByRole('button', { name: 'Submit for review' }).click();
    await expect(page.getByText('Awaiting review').first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByText(
        'Your proof of payment has been submitted and is awaiting review by our team.',
        {
          exact: false,
        }
      )
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('2-awaiting-review.png'),
      fullPage: true,
    });

    const payment = await (
      await apiGet(
        request,
        ownerA.session,
        `/organizations/${ownerA.organizationId}/payments/${paymentAId}`
      )
    ).json();
    expect(payment).toMatchObject({ methodKey, reviewStatus: 'pending' });
    expect(payment.proof).toMatchObject({ mimeType: 'image/png' });
    await context.close();
  });

  test('3: the Platform Owner approves it in the review UI; the owner’s billing shows the plan, yearly', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(150_000);
    // Each step signs in afresh; the limiter allows 10 per 15 minutes.
    await clearAuthRateLimits();
    const context = await browser.newContext();
    const page = await context.newPage();
    await seedCookieDecision(page);
    await signInThroughDashboard(page, 'admin@atlas.dev', SEED.password);
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

    // The queue, filtered to what awaits review; the payment opens from its row.
    await page.goto(ROUTES.review);
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Awaiting review' }).click();
    // A selectable row is exposed as a button named by its cells.
    const row = page.getByRole('button', {
      name: new RegExp(`^${ownerA.organizationId} `),
    });
    await expect(row).toBeVisible({ timeout: 30_000 });
    await page.screenshot({
      path: testInfo.outputPath('3-review-queue.png'),
      fullPage: true,
    });
    await row.click();
    await page.waitForURL(new RegExp(`${ROUTES.review}/${paymentAId}`), {
      timeout: 30_000,
    });

    await expect(page.getByText(ownerA.organizationId).first()).toBeVisible({
      timeout: 30_000,
    });
    await page
      .getByRole('textbox', { name: 'Notes (optional)' })
      .fill('E2E: receipt matches.');
    await page.screenshot({
      path: testInfo.outputPath('3-review-detail.png'),
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Approve payment' }).click();
    await expect(
      page.getByText(
        'This payment has already been reviewed and can no longer be approved or rejected.'
      )
    ).toBeVisible({ timeout: 30_000 });
    await context.close();

    const payment = await (
      await apiGet(
        request,
        ownerA.session,
        `/organizations/${ownerA.organizationId}/payments/${paymentAId}`
      )
    ).json();
    expect(payment).toMatchObject({
      status: 'succeeded',
      reviewStatus: 'approved',
    });
    const subscription = await (
      await apiGet(
        request,
        ownerA.session,
        `/organizations/${ownerA.organizationId}/subscription`
      )
    ).json();
    expect(subscription).toMatchObject({
      status: 'active',
      billingCycle: 'yearly',
    });
    expect(subscription.plan.key).toBe(PLAN.key);

    // What the owner sees.
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await signInOwner(ownerPage, ownerA.email);
    await ownerPage.goto(ROUTES.payment(paymentAId));
    await expect(
      ownerPage.getByText(
        'This payment succeeded. Your subscription has been updated.'
      )
    ).toBeVisible({ timeout: 30_000 });
    await ownerPage.goto(ROUTES.billing);
    const current = ownerPage
      .locator('div')
      .filter({ has: ownerPage.getByText('Current plan', { exact: true }) })
      .filter({ hasText: PLAN.name })
      .last();
    await expect(current).toBeVisible({ timeout: 30_000 });
    await expect(current).toContainText('Yearly');
    await ownerPage.screenshot({
      path: testInfo.outputPath('3-billing-yearly.png'),
      fullPage: true,
    });
    await ownerContext.close();
  });

  test('3b: a second organization’s payment is rejected with a note in the review UI, and its owner sees why', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(150_000);
    // Each step signs in afresh; the limiter allows 10 per 15 minutes.
    await clearAuthRateLimits();
    // Org B's owner buys the same plan monthly (API: org B's own principal).
    const base = `/organizations/${ownerB.organizationId}`;
    const checkout = await apiPost(
      request,
      ownerB.session,
      `${base}/checkouts`,
      {
        target: { type: 'plan_subscription', planKey: PLAN.key },
        billingCycle: 'monthly',
        idempotencyKey: `j16-b-${stamp}`,
      }
    );
    expect(checkout.status(), await checkout.text()).toBeLessThan(300);
    const payment = await apiPost(request, ownerB.session, `${base}/payments`, {
      checkoutId: (await checkout.json()).id,
      methodKey,
    });
    expect(payment.status(), await payment.text()).toBeLessThan(300);
    paymentBId = (await payment.json()).id;
    expect((await payment.json()).instructions).toMatchObject({
      iban: BANK.iban,
    });
    const proof = await apiPatch(
      request,
      ownerB.session,
      `${base}/payments/${paymentBId}/proof`,
      {
        fileData: dataUrl('image/png', TINY_PNG),
        fileName: 'receipt-b.png',
        mimeType: 'image/png',
      }
    );
    expect(proof.ok(), await proof.text()).toBeTruthy();

    const context = await browser.newContext();
    const page = await context.newPage();
    await seedCookieDecision(page);
    await signInThroughDashboard(page, 'admin@atlas.dev', SEED.password);
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
    await page.goto(`${ROUTES.review}/${paymentBId}`);
    const reason = page.getByRole('textbox', { name: 'Reason for rejection' });
    await expect(reason).toBeVisible({ timeout: 30_000 });
    // Too short to act on: refused on the form, nothing sent.
    let rejects = 0;
    page.on('request', (r) => {
      if (
        r.method() === 'POST' &&
        r.url().endsWith(`/payments/${paymentBId}/reject`)
      )
        rejects += 1;
    });
    await reason.fill('No.');
    await page.getByRole('button', { name: 'Reject payment' }).click();
    await expect(reason).toHaveAttribute('aria-invalid', 'true');
    expect(rejects).toBe(0);
    const note = 'E2E: the receipt amount does not match the invoice.';
    await reason.fill(note);
    await page.getByRole('button', { name: 'Reject payment' }).click();
    await expect(
      page.getByText(
        'This payment has already been reviewed and can no longer be approved or rejected.'
      )
    ).toBeVisible({ timeout: 30_000 });
    await page.screenshot({
      path: testInfo.outputPath('3b-rejected.png'),
      fullPage: true,
    });
    await context.close();
    expect(rejects).toBe(1);

    const after = await (
      await apiGet(request, ownerB.session, `${base}/payments/${paymentBId}`)
    ).json();
    expect(after).toMatchObject({
      reviewStatus: 'rejected',
      reviewNotes: note,
    });

    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await signInOwner(ownerPage, ownerB.email);
    await ownerPage.goto(ROUTES.payment(paymentBId));
    await expect(ownerPage.getByText(note)).toBeVisible({ timeout: 30_000 });
    await expect(ownerPage.getByText('Rejected').first()).toBeVisible();
    await ownerPage.screenshot({
      path: testInfo.outputPath('3b-owner-sees-rejection.png'),
      fullPage: true,
    });
    await ownerContext.close();
  });

  test('4: the second organization’s owner cannot open the first organization’s payment (UI and API)', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(120_000);
    // Each step signs in afresh; the limiter allows 10 per 15 minutes.
    await clearAuthRateLimits();
    const foreign = `/organizations/${ownerA.organizationId}/payments/${paymentAId}`;
    for (const response of [
      await apiGet(request, ownerB.session, foreign),
      await apiPatch(request, ownerB.session, `${foreign}/proof`, {
        fileData: dataUrl('image/png', TINY_PNG),
        fileName: 'x.png',
        mimeType: 'image/png',
      }),
      await apiPost(request, ownerB.session, `${foreign}/cancel`),
    ]) {
      expect([403, 404], `${response.url()} → ${response.status()}`).toContain(
        response.status()
      );
      expect(await response.text()).not.toContain(BANK.iban);
    }

    const context = await browser.newContext();
    const page = await context.newPage();
    await signInOwner(page, ownerB.email);
    const payments: number[] = [];
    page.on('response', (r) => {
      if (
        r.url().includes('/api/v1/') &&
        r.url().includes(`/payments/${paymentAId}`)
      )
        payments.push(r.status());
    });
    await page.goto(ROUTES.payment(paymentAId));
    await expect
      .poll(() => payments.length, { timeout: 30_000 })
      .toBeGreaterThan(0);
    // Every read of that payment is refused (no 2xx ever reaches the page).
    expect(
      payments.filter((status) => status !== 403 && status !== 404),
      `statuses: ${payments.join(',')}`
    ).toEqual([]);
    await page.waitForLoadState('networkidle');
    const main = page.locator('main');
    await expect(main.getByText(BANK.iban)).toHaveCount(0);
    await expect(main.getByText('Transfer instructions')).toHaveCount(0);
    await expect(main.getByText(paymentAId)).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath('4-foreign-payment.png'),
      fullPage: true,
    });
    await context.close();
  });
});
