/**
 * J20 — E-wallet and InstaPay for Atlas subscriptions (2 Oct 2026),
 * Chromium against the real stack and database.
 *
 * The manual-payment card on the console's Atlas Payment Provider page
 * grew two tabs beside Bank transfer: E-wallets (Vodafone Cash, Orange
 * Cash, Etisalat Cash, WE Pay, other) and InstaPay. They feed the SAME
 * checkout, payment page and review queue as Bank Transfer (J16). Here:
 *
 *   1  the Platform Owner opens the E-wallets and InstaPay tabs, sees the
 *      seeded placeholder rows flagged ("Placeholder — replace before
 *      enabling") and the placeholder summary; adds a Vodafone Cash wallet
 *      through the dialog — an invalid number is refused in the browser
 *      with nothing sent — with English and Arabic holder/instructions, the
 *      server stores the number normalized, and enables it from its row;
 *      then adds and enables an InstaPay address the same way (an invalid
 *      address refused first);
 *   2  Organization owner A checks out a dedicated plan, sees the three
 *      kinds distinguished (Bank transfer / E-wallet + "Vodafone Cash" /
 *      InstaPay), picks the wallet, gets the wallet's provider, number
 *      (with a working copy button) and holder; the same page in Arabic is
 *      RTL with the Arabic holder and instructions; uploads a PNG receipt
 *      → awaiting review;
 *   3  the Platform Owner approves it in the review UI → A's subscription
 *      is active on that plan;
 *   4  Organization owner B pays with InstaPay (address + holder shown),
 *      uploads a receipt, is rejected with a note in the review UI and
 *      sees "Rejected" and the note;
 *   5  owner B cannot open owner A's wallet payment: "Payment not found"
 *      in the UI, 403/404 from the API, the wallet number never shown.
 *
 * Accounts, organizations, the plan and both methods are this journey's
 * own; every value is test-only (the wallet number 01000000001 and the
 * address j20test@instapay are dummies). The SHARED placeholder rows
 * (`wallet_vodafone_cash`, `wallet_orange_cash`, `wallet_etisalat_cash`,
 * `instapay`) are only looked at — never edited or enabled — and afterAll
 * checks they are still disabled placeholders. Afterwards this journey's
 * methods are disabled and its plan archived, so nothing stays on offer.
 *
 * Production refusing to enable a placeholder is NOT asserted: the local
 * stack runs as development.
 *
 * Both the console and the checkout read every page of the catalog (the
 * paging fix), so no local step is needed however many methods the local
 * database holds.
 */
import {
  test,
  expect,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
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
import { clearRateLimitsAndThrottles } from './support/global-setup';
import { TINY_PNG, dataUrl, signInPlatformOwner } from './support/phase4';

test.describe.configure({ mode: 'serial' });

const stamp = `${Date.now()}`;
const HOLDER = { en: 'Ziad Gehad', ar: 'زياد جهاد' };
const WALLET = {
  displayName: `J20 Vodafone Cash ${stamp}`,
  /** Typed with spaces, as people write it; the server stores it normalized. */
  typedNumber: '010 0000 0001',
  number: '01000000001',
  invalidNumber: '0123',
  instructions:
    'J20 test only: send the exact amount to this test wallet, then upload the receipt.',
  instructionsAr:
    'اختبار J20 فقط: حوّل المبلغ المطلوب بالضبط إلى هذه المحفظة التجريبية ثم ارفع الإيصال.',
  referenceInstructions:
    'J20 test only: write your organization name in the transfer note.',
  referenceInstructionsAr: 'اختبار J20 فقط: اكتب اسم مؤسستك في ملاحظة التحويل.',
};
const INSTAPAY = {
  displayName: `J20 InstaPay ${stamp}`,
  address: 'j20test@instapay',
  invalidAddress: 'j20test@instapay.com',
  instructions:
    'J20 test only: send the exact amount to this test InstaPay address, then upload the receipt.',
  instructionsAr:
    'اختبار J20 فقط: حوّل المبلغ المطلوب بالضبط إلى عنوان إنستاباي التجريبي ثم ارفع الإيصال.',
  referenceInstructions:
    'J20 test only: write your organization name in the transfer note.',
};
const PLAN = {
  key: `j20-wallet-${stamp}`,
  name: `J20 Wallet Plan ${stamp}`,
  monthly: 39,
};
/** The shared, seeded placeholder rows — read only, never changed. */
const PLACEHOLDER_KEYS = [
  'wallet_vodafone_cash',
  'wallet_orange_cash',
  'wallet_etisalat_cash',
  'instapay',
] as const;
/** Dashboard routes (`src/app/routes/route-paths.ts`). */
const ROUTES = {
  provider: '/dashboard/platform/atlas-payment-provider',
  review: '/dashboard/platform/payments',
  checkout: (planKey: string) =>
    `/dashboard/tenant/billing/checkout/plan_subscription/${planKey}`,
  payment: (paymentId: string) =>
    `/dashboard/tenant/billing/payments/${paymentId}`,
};
const WALLET_NUMBER_ERROR =
  'Enter an Egyptian mobile wallet number: 010, 011, 012 or 015 followed by 8 digits.';
const INSTAPAY_ADDRESS_ERROR =
  'Enter a valid InstaPay address, like name@instapay.';

interface OrgOwner {
  email: string;
  session: Session;
  organizationId: string;
  /** Unique per run; the review queue and detail show it (not the id). */
  organizationName: string;
}

interface CatalogMethod {
  id: string;
  key: string;
  type: string;
  displayName: string;
  enabled: boolean;
  manualInstructions?: Record<string, unknown> & { placeholder?: boolean };
  page: number;
}

/**
 * A new Organization owner: registered on the management surface (the
 * self-service signup) and creating its own Organization — as J16.
 */
async function createOrganizationOwner(
  request: APIRequestContext,
  label: string
): Promise<OrgOwner> {
  const email = uniqueLearnerEmail(label);
  const registered = await request.post(`${API_BASE}/auth/register`, {
    data: { name: `J20 ${label} Owner`, email, password: LEARNER_PASSWORD },
  });
  expect(registered.status(), await registered.text()).toBe(201);
  let session = await apiSignIn(request, {
    email,
    password: LEARNER_PASSWORD,
    surface: 'management',
  });
  const organizationName = `J20 ${label} Org ${stamp}`;
  const created = await apiPost(request, session, '/organizations', {
    name: organizationName,
  });
  expect(created.status(), await created.text()).toBe(201);
  const organizationId: string = (await created.json()).id;
  // A fresh token carries the new membership.
  session = await apiSignIn(request, {
    email,
    password: LEARNER_PASSWORD,
    surface: 'management',
  });
  return { email, session, organizationId, organizationName };
}

async function signInOwner(page: Page, email: string): Promise<void> {
  await seedCookieDecision(page);
  await signInThroughDashboard(page, email, LEARNER_PASSWORD);
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30_000 });
}

async function signInAdmin(page: Page): Promise<void> {
  await seedCookieDecision(page);
  await signInThroughDashboard(page, 'admin@atlas.dev', SEED.password);
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

/** The same owner, in a context whose UI language is Arabic (as J16). */
async function arabicOwnerPage(
  browser: Browser,
  email: string
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.localStorage.setItem('atlas:language', JSON.stringify('ar'));
  });
  await seedCookieDecision(page);
  await page.goto('/auth/sign-in');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(LEARNER_PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30_000 });
  return { context, page };
}

/** Uploads TINY_PNG through the payment page's own picker and submits it. */
async function uploadReceipt(page: Page, fileName: string): Promise<void> {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose file' }).click();
  await (
    await chooser
  ).setFiles({ name: fileName, mimeType: 'image/png', buffer: TINY_PNG });
  await expect(page.getByRole('button', { name: fileName })).toBeVisible();
  await page.getByPlaceholder(/note/i).fill('J20 test transfer reference');
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByText('Awaiting review').first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByText(
      'Your proof of payment has been submitted and is awaiting review by our team.',
      { exact: false }
    )
  ).toBeVisible();
}

test.describe('J20 — E-wallet and InstaPay: configure, checkout, review', () => {
  let platformOwner: Session;
  let ownerA: OrgOwner;
  let ownerB: OrgOwner;
  let walletId: string;
  let walletKey: string;
  let instapayId: string;
  let instapayKey: string;
  let paymentAId: string;
  let paymentBId: string;

  /** The Platform Owner's catalog, every page, until `match` finds a row. */
  async function findMethod(
    request: APIRequestContext,
    match: (method: CatalogMethod) => boolean
  ): Promise<CatalogMethod | null> {
    for (let page = 1; page < 50; page += 1) {
      const response = await apiGet(
        request,
        platformOwner,
        '/platform-payment-methods',
        { page: String(page), pageSize: '100' }
      );
      expect(response.ok(), await response.text()).toBeTruthy();
      const body = await response.json();
      const found = (body.items as Omit<CatalogMethod, 'page'>[]).find((m) =>
        match({ ...m, page })
      );
      if (found) return { ...found, page };
      if (page >= body.pagination.totalPages) return null;
    }
    return null;
  }

  /** Every row of the catalog, every page — what the console card shows. */
  async function wholeCatalog(
    request: APIRequestContext
  ): Promise<CatalogMethod[]> {
    const rows: CatalogMethod[] = [];
    for (let page = 1; page < 50; page += 1) {
      const response = await apiGet(
        request,
        platformOwner,
        '/platform-payment-methods',
        { page: String(page), pageSize: '100' }
      );
      expect(response.ok(), await response.text()).toBeTruthy();
      const body = await response.json();
      rows.push(
        ...(body.items as Omit<CatalogMethod, 'page'>[]).map((m) => ({
          ...m,
          page,
        }))
      );
      if (page >= body.pagination.totalPages) break;
    }
    return rows;
  }

  test.beforeAll(async ({ request }) => {
    test.setTimeout(120_000);
    await clearRateLimitsAndThrottles();
    platformOwner = await signInPlatformOwner(request);

    // A dedicated, customer-facing plan priced monthly.
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
      description: 'Playwright journey J20 (test plan).',
      displayOrder: 900,
      limits: starter.limits,
      features: starter.features,
      pricing: {
        amount: PLAN.monthly,
        currency: 'USD',
        billingCycle: 'monthly',
      },
    });
    expect(plan.status(), await plan.text()).toBe(201);

    ownerA = await createOrganizationOwner(request, 'j20a');
    ownerB = await createOrganizationOwner(request, 'j20b');
  });

  test.afterAll(async ({ request }) => {
    // Nothing this journey created stays on offer.
    for (const id of [walletId, instapayId]) {
      if (!id) continue;
      const disabled = await apiPatch(
        request,
        platformOwner,
        `/platform-payment-methods/${id}`,
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
    // The shared placeholders are exactly as they were: disabled placeholders.
    for (const key of PLACEHOLDER_KEYS) {
      const row = await findMethod(request, (m) => m.key === key);
      expect(row, `placeholder ${key} exists`).toBeTruthy();
      expect(row!.enabled, `placeholder ${key} stays disabled`).toBe(false);
      expect(row!.manualInstructions?.placeholder).toBe(true);
    }
  });

  test('1: the Platform Owner sees the placeholders, adds a Vodafone Cash wallet (bad number refused) and enables it', async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(180_000);
    await clearRateLimitsAndThrottles();
    await signInAdmin(page);

    // --- The placeholders, flagged on their rows and summarized. ---
    const shown = await wholeCatalog(request);
    const placeholders = shown.filter((m) => m.manualInstructions?.placeholder);
    for (const key of PLACEHOLDER_KEYS) {
      expect(
        placeholders.map((m) => m.key),
        `${key} is in the catalog`
      ).toContain(key);
    }
    await page.goto(ROUTES.provider);
    const card = page.getByTestId('manual-payment-methods-card');
    await expect(card).toContainText('Manual payment methods', {
      timeout: 30_000,
    });
    await expect(
      page.getByTestId('manual-methods-placeholder-summary')
    ).toHaveText(
      `${placeholders.length} methods still have placeholder details. Replace them before enabling any of them.`
    );

    await page.getByTestId('manual-methods-tab-wallet-method').click();
    const walletSection = page.getByTestId('wallet-methods-section');
    await expect(walletSection).toBeVisible();
    for (const key of [
      'wallet_vodafone_cash',
      'wallet_orange_cash',
      'wallet_etisalat_cash',
    ]) {
      const id = placeholders.find((m) => m.key === key)!.id;
      const row = page.getByTestId(`wallet-method-row-${id}`);
      await expect(row).toContainText('Placeholder — replace before enabling');
      await expect(row).toContainText('Disabled');
      await expect(row).toContainText('PLACEHOLDER-NOT-A-WALLET');
      await expect(
        page.getByTestId(`wallet-method-placeholder-${id}`)
      ).toContainText('These details are placeholders, not a real account.');
    }
    await expect(
      page.getByTestId(
        `wallet-method-provider-${placeholders.find((m) => m.key === 'wallet_vodafone_cash')!.id}`
      )
    ).toHaveText('Vodafone Cash');
    await page.screenshot({
      path: testInfo.outputPath('1-console-ewallets-placeholders.png'),
      fullPage: true,
    });

    await page.getByTestId('manual-methods-tab-instapay-method').click();
    const instapayPlaceholder = placeholders.find((m) => m.key === 'instapay')!;
    const instapayPlaceholderRow = page.getByTestId(
      `instapay-method-row-${instapayPlaceholder.id}`
    );
    await expect(instapayPlaceholderRow).toContainText(
      'Placeholder — replace before enabling'
    );
    await expect(instapayPlaceholderRow).toContainText(
      'PLACEHOLDER-NOT-AN-ADDRESS'
    );
    await expect(instapayPlaceholderRow).toContainText('Disabled');
    await page.screenshot({
      path: testInfo.outputPath('1-console-instapay-placeholders.png'),
      fullPage: true,
    });

    // --- Add a wallet. ---
    await page.goto(ROUTES.provider);
    await expect(card).toContainText('Manual payment methods', {
      timeout: 30_000,
    });
    await page.getByTestId('manual-methods-tab-wallet-method').click();
    await page.getByTestId('wallet-method-add').click();
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Add e-wallet' })
    ).toBeVisible();
    await page.getByTestId('wallet-method-provider-vodafone_cash').click();
    await page
      .getByTestId('wallet-method-display-name')
      .fill(WALLET.displayName);
    await page.getByTestId('wallet-method-account-name').fill(HOLDER.en);
    await page.getByTestId('wallet-method-account-name-ar').fill(HOLDER.ar);
    await expect(
      page.getByTestId('wallet-method-account-name-ar')
    ).toHaveAttribute('dir', 'rtl');
    await page
      .getByTestId('wallet-method-instructions')
      .fill(WALLET.instructions);
    await page
      .getByTestId('wallet-method-instructions-ar')
      .fill(WALLET.instructionsAr);
    await page
      .getByTestId('wallet-method-reference-instructions')
      .fill(WALLET.referenceInstructions);
    await page
      .getByTestId('wallet-method-reference-instructions-ar')
      .fill(WALLET.referenceInstructionsAr);

    // An invalid number: refused on the form, and nothing is sent.
    const creates: string[] = [];
    page.on('request', (r) => {
      if (
        r.method() === 'POST' &&
        /\/platform-payment-methods\/(wallet|instapay)$/.test(r.url())
      )
        creates.push(r.url());
    });
    await page.getByTestId('wallet-method-number').fill(WALLET.invalidNumber);
    await page.getByTestId('wallet-method-save').click();
    await expect(dialog.getByText(WALLET_NUMBER_ERROR)).toBeVisible();
    await expect(page.getByTestId('wallet-method-number')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    await page.screenshot({
      path: testInfo.outputPath('1-wallet-invalid-number.png'),
    });
    expect(creates).toHaveLength(0);

    await page.getByTestId('wallet-method-number').fill(WALLET.typedNumber);
    const saved = page.waitForResponse(
      (r) =>
        r.request().method() === 'POST' &&
        r.url().endsWith('/platform-payment-methods/wallet')
    );
    await page.getByTestId('wallet-method-save').click();
    const savedResponse = await saved;
    expect(savedResponse.status()).toBe(201);
    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(page.getByText('E-wallet added').first()).toBeVisible();
    expect(creates).toHaveLength(1);

    // The server has what was typed — the number normalized — saved disabled.
    const created = await savedResponse.json();
    walletId = created.id;
    walletKey = created.key;
    const wallet = await findMethod(request, (m) => m.id === walletId);
    expect(wallet, 'the new wallet is in the catalog').toBeTruthy();
    expect(wallet!.displayName).toBe(WALLET.displayName);
    expect(wallet!.type).toBe('manual_wallet_transfer');
    expect(wallet!.enabled).toBe(false);
    expect(wallet!.manualInstructions).toMatchObject({
      type: 'manual_wallet_transfer',
      walletProvider: 'vodafone_cash',
      walletNumber: WALLET.number,
      accountName: HOLDER.en,
      accountNameAr: HOLDER.ar,
      instructions: WALLET.instructions,
      instructionsAr: WALLET.instructionsAr,
      referenceInstructions: WALLET.referenceInstructions,
      referenceInstructionsAr: WALLET.referenceInstructionsAr,
    });
    expect(wallet!.manualInstructions?.placeholder).toBeFalsy();

    // Enable it from its row.
    await page.reload();
    await expect(card).toContainText('Manual payment methods', {
      timeout: 30_000,
    });
    await page.getByTestId('manual-methods-tab-wallet-method').click();
    const walletRow = page.getByTestId(`wallet-method-row-${walletId}`);
    await expect(walletRow, 'the new wallet is listed').toBeVisible({
      timeout: 15_000,
    });
    await expect(walletRow).toContainText(WALLET.displayName);
    await expect(walletRow).toContainText(WALLET.number);
    await expect(walletRow).toContainText(HOLDER.en);
    await expect(
      page.getByTestId(`wallet-method-provider-${walletId}`)
    ).toHaveText('Vodafone Cash');
    await expect(walletRow).not.toContainText('Placeholder');
    await expect(walletRow).toContainText('Disabled');
    await page.getByTestId(`wallet-method-toggle-${walletId}`).click();
    // A real method enables at once — no placeholder confirmation.
    await expect(page.getByTestId('placeholder-enable-confirm')).toHaveCount(0);
    await expect(walletRow).toContainText('Enabled', { timeout: 15_000 });
    await expect(
      page
        .getByText(
          'E-wallet enabled. Organizations can now choose it at checkout.'
        )
        .first()
    ).toBeVisible();
    expect((await findMethod(request, (m) => m.id === walletId))!.enabled).toBe(
      true
    );
    await walletRow.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath('1-console-ewallets-enabled.png'),
      fullPage: true,
    });

    // --- InstaPay: an invalid address refused, then a valid one. ---
    await page.getByTestId('manual-methods-tab-instapay-method').click();
    await page.getByTestId('instapay-method-add').click();
    await expect(
      dialog.getByRole('heading', { name: 'Add InstaPay address' })
    ).toBeVisible();
    await page
      .getByTestId('instapay-method-display-name')
      .fill(INSTAPAY.displayName);
    await page.getByTestId('instapay-method-account-name').fill(HOLDER.en);
    await page.getByTestId('instapay-method-account-name-ar').fill(HOLDER.ar);
    await page
      .getByTestId('instapay-method-instructions')
      .fill(INSTAPAY.instructions);
    await page
      .getByTestId('instapay-method-instructions-ar')
      .fill(INSTAPAY.instructionsAr);
    await page
      .getByTestId('instapay-method-reference-instructions')
      .fill(INSTAPAY.referenceInstructions);
    await page
      .getByTestId('instapay-method-address')
      .fill(INSTAPAY.invalidAddress);
    await page.getByTestId('instapay-method-save').click();
    await expect(dialog.getByText(INSTAPAY_ADDRESS_ERROR)).toBeVisible();
    await expect(page.getByTestId('instapay-method-address')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    await page.screenshot({
      path: testInfo.outputPath('1-instapay-invalid-address.png'),
    });
    expect(creates).toHaveLength(1);

    await page.getByTestId('instapay-method-address').fill(INSTAPAY.address);
    const savedInstapay = page.waitForResponse(
      (r) =>
        r.request().method() === 'POST' &&
        r.url().endsWith('/platform-payment-methods/instapay')
    );
    await page.getByTestId('instapay-method-save').click();
    const savedInstapayResponse = await savedInstapay;
    expect(savedInstapayResponse.status()).toBe(201);
    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(
      page.getByText('InstaPay address added').first()
    ).toBeVisible();
    expect(creates).toHaveLength(2);
    const createdInstapay = await savedInstapayResponse.json();
    instapayId = createdInstapay.id;
    instapayKey = createdInstapay.key;
    const instapay = await findMethod(request, (m) => m.id === instapayId);
    expect(instapay!.enabled).toBe(false);
    expect(instapay!.manualInstructions).toMatchObject({
      type: 'manual_instapay',
      instapayAddress: INSTAPAY.address,
      accountName: HOLDER.en,
      accountNameAr: HOLDER.ar,
      instructions: INSTAPAY.instructions,
      instructionsAr: INSTAPAY.instructionsAr,
    });

    await page.reload();
    await expect(card).toContainText('Manual payment methods', {
      timeout: 30_000,
    });
    await page.getByTestId('manual-methods-tab-instapay-method').click();
    const instapayRow = page.getByTestId(`instapay-method-row-${instapayId}`);
    await expect(instapayRow).toBeVisible({ timeout: 15_000 });
    await expect(instapayRow).toContainText(INSTAPAY.address);
    await expect(instapayRow).toContainText(HOLDER.en);
    await expect(instapayRow).toContainText('Disabled');
    await page.getByTestId(`instapay-method-toggle-${instapayId}`).click();
    await expect(instapayRow).toContainText('Enabled', { timeout: 15_000 });
    await expect(
      page
        .getByText(
          'InstaPay enabled. Organizations can now choose it at checkout.'
        )
        .first()
    ).toBeVisible();
    expect(
      (await findMethod(request, (m) => m.id === instapayId))!.enabled
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath('1-console-instapay-enabled.png'),
      fullPage: true,
    });

    // The shared placeholders were not touched.
    for (const key of PLACEHOLDER_KEYS) {
      const row = await findMethod(request, (m) => m.key === key);
      expect(row!.enabled).toBe(false);
    }
  });

  test('2: owner A checks out, sees the three kinds, pays by wallet (EN and AR) and uploads a receipt', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(180_000);
    await clearRateLimitsAndThrottles();
    const context = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    await signInOwner(page, ownerA.email);
    await page.goto(ROUTES.checkout(PLAN.key));
    await expect(page.getByTestId('checkout-cycle-price')).toContainText(
      `$${PLAN.monthly}`,
      { timeout: 30_000 }
    );

    const checkoutCreated = page.waitForResponse(
      (r) =>
        r.request().method() === 'POST' &&
        r.url().includes(`/organizations/${ownerA.organizationId}/checkouts`)
    );
    await page.getByRole('button', { name: 'Start checkout' }).click();
    expect((await checkoutCreated).ok()).toBeTruthy();
    await expect(page.getByText('Order summary')).toBeVisible();
    await expect(page.getByText(PLAN.name).first()).toBeVisible();

    // The three kinds, each spelled out.
    await expect(
      page.locator(`label[for="method-${walletKey}"]`)
    ).toContainText(WALLET.displayName, { timeout: 30_000 });
    await expect(
      page.getByTestId(`checkout-method-type-${walletKey}`)
    ).toHaveText('E-wallet');
    await expect(
      page.getByTestId(`checkout-method-provider-${walletKey}`)
    ).toHaveText('Vodafone Cash');
    await expect(
      page.locator(`label[for="method-${instapayKey}"]`)
    ).toContainText(INSTAPAY.displayName);
    await expect(
      page.getByTestId(`checkout-method-type-${instapayKey}`)
    ).toHaveText('InstaPay');
    await expect(
      page.getByTestId(`checkout-method-provider-${instapayKey}`)
    ).toHaveCount(0);
    await expect(
      page
        .locator('[data-testid^="checkout-method-type-"]')
        .filter({ hasText: /^Bank transfer$/ })
        .first(),
      'a bank transfer method is offered beside them'
    ).toBeVisible();
    // The disabled placeholders are not offered.
    for (const key of PLACEHOLDER_KEYS) {
      await expect(page.locator(`[id="method-${key}"]`)).toHaveCount(0);
    }
    await expect(
      page.locator('[data-testid^="checkout-method-placeholder-"]')
    ).toHaveCount(0);
    await page
      .locator(`label[for="method-${walletKey}"]`)
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath('2-checkout-methods.png'),
      fullPage: true,
    });

    await page.locator(`[id="method-${walletKey}"]`).click();
    await page.getByRole('button', { name: 'Continue to payment' }).click();
    await page.waitForURL(
      /\/dashboard\/tenant\/billing\/payments\/[0-9a-f-]{36}/,
      { timeout: 30_000 }
    );
    paymentAId = page.url().split('/payments/')[1].split(/[?#]/)[0];

    // Provider, wallet number (copyable) and holder — the configured ones.
    await expect(page.getByText('Transfer instructions')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('payment-instructions-provider')).toHaveText(
      'Vodafone Cash'
    );
    await expect(
      page.getByTestId('payment-instructions-wallet-number')
    ).toHaveText(WALLET.number);
    await expect(
      page.getByTestId('payment-instructions-wallet-number')
    ).toHaveAttribute('dir', 'ltr');
    await expect(
      page.getByTestId('payment-instructions-account-name')
    ).toHaveText(HOLDER.en);
    await expect(page.getByTestId('payment-instructions-text')).toHaveText(
      WALLET.instructions
    );
    await expect(page.getByTestId('payment-instructions-reference')).toHaveText(
      WALLET.referenceInstructions
    );
    await expect(
      page.locator('main').getByText('E-wallet').first()
    ).toBeVisible();
    await expect(
      page.getByTestId('payment-placeholder-banner'),
      'a real wallet carries no placeholder banner'
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Copy Wallet number' }).click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(WALLET.number);
    await page.screenshot({
      path: testInfo.outputPath('2-wallet-payment-en.png'),
      fullPage: true,
    });

    // The same page in Arabic: RTL, the Arabic holder and instructions.
    const ar = await arabicOwnerPage(browser, ownerA.email);
    await ar.page.goto(ROUTES.payment(paymentAId));
    await expect(ar.page.getByText('تعليمات التحويل')).toBeVisible({
      timeout: 30_000,
    });
    expect(await ar.page.evaluate(() => document.documentElement.dir)).toBe(
      'rtl'
    );
    await expect(
      ar.page.getByTestId('payment-instructions-account-name')
    ).toHaveText(HOLDER.ar);
    await expect(ar.page.getByTestId('payment-instructions-text')).toHaveText(
      WALLET.instructionsAr
    );
    await expect(
      ar.page.getByTestId('payment-instructions-text')
    ).toHaveAttribute('dir', 'rtl');
    await expect(
      ar.page.getByTestId('payment-instructions-reference')
    ).toHaveText(WALLET.referenceInstructionsAr);
    await expect(
      ar.page.getByTestId('payment-instructions-provider')
    ).toHaveText('فودافون كاش');
    await expect(
      ar.page.getByTestId('payment-instructions-wallet-number')
    ).toHaveText(WALLET.number);
    await expect(ar.page.getByText('رقم المحفظة')).toBeVisible();
    await expect(ar.page.getByText('إثبات الدفع')).toBeVisible();
    await ar.page.screenshot({
      path: testInfo.outputPath('2-wallet-payment-ar.png'),
      fullPage: true,
    });
    await ar.context.close();

    await uploadReceipt(page, 'receipt-wallet.png');
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
    expect(payment).toMatchObject({
      methodKey: walletKey,
      methodType: 'manual_wallet_transfer',
      reviewStatus: 'pending',
    });
    expect(payment.instructions).toMatchObject({
      type: 'manual_wallet_transfer',
      walletNumber: WALLET.number,
      accountNameAr: HOLDER.ar,
    });
    expect(payment.proof).toMatchObject({ mimeType: 'image/png' });
    await context.close();
  });

  test('3: the Platform Owner approves the wallet payment in the review UI; A’s subscription is active', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(150_000);
    await clearRateLimitsAndThrottles();
    const context = await browser.newContext();
    const page = await context.newPage();
    await signInAdmin(page);

    // The queue, filtered to what awaits review; the payment opens from its row.
    await page.goto(ROUTES.review);
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: 'Awaiting review' }).click();
    const row = page.getByRole('button', {
      name: new RegExp(`^${ownerA.organizationName} `),
    });
    await expect(row).toBeVisible({ timeout: 30_000 });
    await row.click();
    await page.waitForURL(new RegExp(`${ROUTES.review}/${paymentAId}`), {
      timeout: 30_000,
    });
    await expect(page.getByText(ownerA.organizationName).first()).toBeVisible({
      timeout: 30_000,
    });
    await page
      .getByRole('textbox', { name: 'Notes (optional)' })
      .fill('J20: wallet receipt matches.');
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
      billingCycle: 'monthly',
    });
    expect(subscription.plan.key).toBe(PLAN.key);
  });

  test('4: owner B pays with InstaPay, is rejected with a note in the review UI and sees why', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(180_000);
    await clearRateLimitsAndThrottles();
    const context = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const page = await context.newPage();
    await signInOwner(page, ownerB.email);
    await page.goto(ROUTES.checkout(PLAN.key));
    await expect(page.getByTestId('checkout-cycle-price')).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole('button', { name: 'Start checkout' }).click();
    await expect(page.getByText('Order summary')).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByTestId(`checkout-method-type-${instapayKey}`)
    ).toHaveText('InstaPay', { timeout: 30_000 });
    await page.locator(`[id="method-${instapayKey}"]`).click();
    await page.getByRole('button', { name: 'Continue to payment' }).click();
    await page.waitForURL(
      /\/dashboard\/tenant\/billing\/payments\/[0-9a-f-]{36}/,
      { timeout: 30_000 }
    );
    paymentBId = page.url().split('/payments/')[1].split(/[?#]/)[0];

    await expect(page.getByText('Transfer instructions')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('payment-instructions-provider')).toHaveText(
      'InstaPay'
    );
    await expect(
      page.getByTestId('payment-instructions-instapay-address')
    ).toHaveText(INSTAPAY.address);
    await expect(
      page.getByTestId('payment-instructions-account-name')
    ).toHaveText(HOLDER.en);
    await expect(page.getByTestId('payment-instructions-text')).toHaveText(
      INSTAPAY.instructions
    );
    await page.getByRole('button', { name: 'Copy InstaPay address' }).click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe(INSTAPAY.address);
    // Owner B never sees the other method's wallet number.
    await expect(page.locator('main').getByText(WALLET.number)).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath('4-instapay-payment-en.png'),
      fullPage: true,
    });
    await uploadReceipt(page, 'receipt-instapay.png');
    await context.close();

    const base = `/organizations/${ownerB.organizationId}`;
    const pending = await (
      await apiGet(request, ownerB.session, `${base}/payments/${paymentBId}`)
    ).json();
    expect(pending).toMatchObject({
      methodKey: instapayKey,
      methodType: 'manual_instapay',
      reviewStatus: 'pending',
    });
    expect(pending.instructions).toMatchObject({
      instapayAddress: INSTAPAY.address,
    });

    // The Platform Owner rejects it with a note, in the review UI.
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await signInAdmin(adminPage);
    await adminPage.goto(`${ROUTES.review}/${paymentBId}`);
    const reason = adminPage.getByRole('textbox', {
      name: 'Reason for rejection',
    });
    await expect(reason).toBeVisible({ timeout: 30_000 });
    let rejects = 0;
    adminPage.on('request', (r) => {
      if (
        r.method() === 'POST' &&
        r.url().endsWith(`/payments/${paymentBId}/reject`)
      )
        rejects += 1;
    });
    const note = 'J20: the InstaPay receipt amount does not match the invoice.';
    await reason.fill(note);
    await adminPage.getByRole('button', { name: 'Reject payment' }).click();
    await expect(
      adminPage.getByText(
        'This payment has already been reviewed and can no longer be approved or rejected.'
      )
    ).toBeVisible({ timeout: 30_000 });
    await adminPage.screenshot({
      path: testInfo.outputPath('4-review-rejected.png'),
      fullPage: true,
    });
    await adminContext.close();
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
      path: testInfo.outputPath('4-owner-sees-rejection.png'),
      fullPage: true,
    });
    await ownerContext.close();
  });

  test('5: owner B cannot open owner A’s wallet payment (UI and API)', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(120_000);
    await clearRateLimitsAndThrottles();
    const foreign = `/organizations/${ownerA.organizationId}/payments/${paymentAId}`;
    for (const response of [
      await apiGet(request, ownerB.session, foreign),
      await apiGet(request, ownerB.session, `${foreign}/proof/file`),
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
      expect(await response.text()).not.toContain(WALLET.number);
    }

    const context = await browser.newContext();
    const page = await context.newPage();
    await signInOwner(page, ownerB.email);
    const statuses: number[] = [];
    page.on('response', (r) => {
      if (
        r.url().includes('/api/v1/') &&
        r.url().includes(`/payments/${paymentAId}`)
      )
        statuses.push(r.status());
    });
    await page.goto(ROUTES.payment(paymentAId));
    await expect(page.getByText('Payment not found')).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByText(
        "This payment doesn't exist, or it belongs to another organization."
      )
    ).toBeVisible();
    expect(statuses.length).toBeGreaterThan(0);
    expect(
      statuses.filter((status) => status !== 403 && status !== 404),
      `statuses: ${statuses.join(',')}`
    ).toEqual([]);
    const main = page.locator('main');
    await expect(main.getByText(WALLET.number)).toHaveCount(0);
    await expect(main.getByText(HOLDER.en)).toHaveCount(0);
    await expect(main.getByText('Transfer instructions')).toHaveCount(0);
    expect(await page.content()).not.toContain(WALLET.number);
    await page.screenshot({
      path: testInfo.outputPath('5-foreign-payment.png'),
      fullPage: true,
    });
    await context.close();
  });
});
