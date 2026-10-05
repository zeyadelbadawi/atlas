/**
 * J42 — Academy Manual Payments, Chromium against the real stack and
 * database: an academy's OWN payment methods, a learner paying the academy
 * with proof, and the Client Owner approving or rejecting it.
 *
 *   1  The Client Owner, on the academy's Payment methods page, sets up
 *      InstaPay through its dialog (a bad address is refused in the
 *      browser), sees it "Accepting", and turns on a bank account.
 *   2  J-APPROVE: a learner registers on the academy website, buys a paid
 *      course: sees ONLY this academy's methods, the InstaPay address and
 *      the exact amount, types a reference, uploads a PNG proof, and sees
 *      it under review in My payments. The owner opens Payments, sees the
 *      reference and the proof, approves (after confirming) → the approval
 *      email is queued exactly once, the learner's My payments says
 *      Approved and the course is theirs to start.
 *   3  J-REJECT: a second learner pays by bank transfer; the owner rejects
 *      with a reason in the UI → the rejection email (with the reason) is
 *      queued once; the learner sees Rejected, the reason, and "Submit a
 *      new payment", pays again on the same order, and is approved.
 *   4  CROSS-TENANT: another organization's owner cannot list, open,
 *      approve or download the proof of these payments; another learner
 *      sees none of them.
 *
 * Shared state is restored afterwards: the academy's methods are switched
 * off, so the other journeys (which buy through Atlas Payments on the same
 * seeded academy) see exactly what they saw before.
 */
import {
  test,
  expect as baseExpect,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  API_BASE,
  LEARNER_PASSWORD,
  SEED,
  academyPath,
  apiGet,
  apiPatch,
  apiPost,
  apiSignIn,
  registerLearnerThroughWebsite,
  seedCookieDecision,
  signInThroughDashboard,
  uniqueLearnerEmail,
  uniqueLearnerName,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import {
  TINY_PNG,
  apiPut,
  createCourse,
  enrollmentForCourse,
  ensureAcademy,
  publishCourse,
  signInOnWebsite,
} from './support/phase4';
import { adminQuery, adminSql } from './support/admin-db';

test.describe.configure({ mode: 'serial', timeout: 240_000 });
const expect = baseExpect.configure({ timeout: 45_000 });

const stamp = `${Date.now()}`;
const INSTAPAY_ADDRESS = `j42.academy.${stamp.slice(-6)}@instapay`;
const BANK = {
  bankName: 'J42 Test Bank',
  accountName: 'J42 Academy Account',
  accountNumber: `J42 ${stamp.slice(-8)}`,
  instructions: 'E2E test only: transfer the exact amount.',
  referenceInstructions: 'E2E test only: write your email as the reference.',
};
const REJECT_REASON = 'The amount received was lower than the course price.';

async function signInOwnerDashboard(page: Page): Promise<void> {
  await clearAuthRateLimits();
  await seedCookieDecision(page);
  await signInThroughDashboard(page, SEED.owner, SEED.password);
  await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
}

async function outboxCount(key: string, paymentId: string): Promise<number> {
  const rows = await adminQuery<{ count: number }>(
    `select count(*)::int as count from communication_outbox where key = :'key' and entity_id = :'id'`,
    { key, id: paymentId }
  );
  return rows[0]?.count ?? 0;
}

async function setLanguage(page: Page, language: 'en' | 'ar'): Promise<void> {
  await page.evaluate(
    (lang) => localStorage.setItem('atlas:language', JSON.stringify(lang)),
    language
  );
  await page.reload();
}

/** Serious/critical axe findings (WCAG 2.0/2.1 A+AA) and horizontal overflow on the current page. */
async function accessibilityProblems(
  page: Page,
  tag: string
): Promise<string[]> {
  const problems: string[] = [];
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
  if (overflow > 1) problems.push(`${tag}: horizontal overflow ${overflow}px`);
  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  for (const violation of axe.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  )) {
    problems.push(
      `${tag}: axe ${violation.id} (${violation.impact}) × ${violation.nodes.length}: ${violation.nodes
        .slice(0, 3)
        .map((n) => n.target.join(' '))
        .join(' | ')}`
    );
  }
  return problems;
}

/** A learner registered on the academy website, with an API session too. */
async function newLearner(
  page: Page,
  request: APIRequestContext,
  academyId: string,
  label: string
): Promise<{ email: string; session: Session }> {
  await clearAuthRateLimits();
  const email = uniqueLearnerEmail(label);
  await registerLearnerThroughWebsite(
    page,
    email,
    uniqueLearnerName(`J42 ${label}`)
  );
  await expect(
    page
      .getByText(
        /check your (email|inbox)|account created|your account is ready|verify/i
      )
      .first()
  ).toBeVisible({ timeout: 30_000 });
  const session = await apiSignIn(request, {
    email,
    password: LEARNER_PASSWORD,
    surface: 'academy',
    academyId,
  });
  await signInOnWebsite(page, email);
  return { email, session };
}

/** The learner's newest payment for a course, as My payments lists it. */
async function latestPayment(
  request: APIRequestContext,
  learner: Session,
  academyId: string,
  courseId: string
): Promise<{ id: string; courseOrderId: string; reviewStatus: string }> {
  const res = await apiGet(request, learner, '/course-payments', { academyId });
  expect(res.ok(), await res.text()).toBeTruthy();
  const items: {
    id: string;
    courseOrderId: string;
    reviewStatus: string;
    course: { id: string };
  }[] = (await res.json()).items;
  const found = items.find((item) => item.course.id === courseId);
  expect(found, 'the learner has a payment for the course').toBeTruthy();
  return found!;
}

test.describe('J42 — academy manual payments: approve, reject, isolation', () => {
  let academyId: string;
  let owner: Session;
  let courseId: string;
  let courseTitle: string;
  let ownerContext: BrowserContext;
  let ownerPage: Page;
  let approvedPaymentId: string;
  let rejectedPaymentId: string;

  test.beforeAll(async ({ browser, request }) => {
    test.setTimeout(240_000);
    await clearAuthRateLimits();
    ({ academyId, owner } = await ensureAcademy(request));
    // A clean slate for THIS journey's academy methods (a previous run left
    // them switched off). Local disposable database only — payments keep
    // their frozen instructions, and their method link is SET NULL.
    await adminSql(
      `delete from academy_payment_methods where academy_id = :'id'`,
      {
        id: academyId,
      }
    );

    courseTitle = `J42 Paid Course ${stamp}`;
    courseId = await createCourse(request, owner, academyId, {
      title: courseTitle,
      pricing: { type: 'paid', amount: 1500, currency: 'EGP' },
      level: 'beginner',
      outcomes: ['Pay an academy directly'],
      requirements: ['A bank or InstaPay account'],
      description: 'A paid course sold with the academy’s own methods.',
    });
    await publishCourse(request, owner, academyId, courseId);

    ownerContext = await browser.newContext();
    ownerPage = await ownerContext.newPage();
    await signInOwnerDashboard(ownerPage);
  });

  test.afterAll(async ({ request }) => {
    // Restore the shared academy: its own methods off again.
    if (!owner || !academyId) return;
    for (const segment of ['bank-transfer', 'instapay', 'wallet']) {
      const res = await apiPut(
        request,
        owner,
        `/academies/${academyId}/payment-methods/${segment}`,
        { enabled: false }
      );
      // A method never set up answers 400 (nothing to switch off) — fine.
      expect([200, 400]).toContain(res.status());
    }
    await ownerContext?.close();
  });

  test('1 — the owner sets up InstaPay in the UI and turns on a bank account', async ({
    request,
  }) => {
    await ownerPage.goto(`/dashboard/academy/${academyId}/payment-methods`);
    await expect(
      ownerPage.getByRole('heading', { name: 'Payment methods', level: 1 })
    ).toBeVisible();

    const instapayCard = ownerPage.getByTestId('academy-method-instapay');
    await instapayCard.getByTestId('academy-method-instapay-setup').click();
    const dialog = ownerPage.getByRole('dialog');
    await dialog.getByTestId('academy-instapay-address').fill('not-an-address');
    await dialog
      .getByTestId('academy-instapay-account-name')
      .fill('J42 Academy');
    await dialog
      .getByTestId('academy-instapay-instructions')
      .fill('E2E: send the amount by InstaPay.');
    await dialog
      .getByTestId('academy-instapay-reference-instructions')
      .fill('E2E: use your name as the reference.');
    await dialog.getByTestId('academy-method-save').click();
    // Refused in the browser, before any request.
    await expect(dialog.getByText(/InstaPay address/i).first()).toBeVisible();
    await expect(dialog).toBeVisible();

    await dialog.getByTestId('academy-instapay-address').fill(INSTAPAY_ADDRESS);
    await dialog.getByTestId('academy-method-save').click();
    await expect(dialog).toBeHidden();
    await expect(instapayCard).toContainText('Accepting');
    await expect(instapayCard).toContainText(INSTAPAY_ADDRESS);

    // The bank account through the same API the bank dialog uses.
    const bank = await apiPut(
      request,
      owner,
      `/academies/${academyId}/payment-methods/bank-transfer`,
      { enabled: true, instructions: BANK }
    );
    expect(bank.ok(), await bank.text()).toBeTruthy();
    await ownerPage.reload();
    await expect(ownerPage.getByTestId('academy-method-bank')).toContainText(
      'Accepting'
    );
    await expect(ownerPage.getByTestId('academy-method-wallet')).toContainText(
      'Not set up'
    );
  });

  test('2 — J-APPROVE: a learner pays by InstaPay with proof; the owner approves; access and one email', async ({
    browser,
    request,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const learner = await newLearner(page, request, academyId, 'j42-approve');

    await page.goto(academyPath(`/my/courses/${courseId}/checkout`));
    await expect(
      page.getByTestId('checkout-method-manual_instapay')
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      page.getByTestId('checkout-method-manual_bank_transfer')
    ).toBeVisible();
    // Only this academy's methods: no wallet (not set up), no Atlas method.
    await expect(page.locator('[data-testid^="checkout-method-"]')).toHaveCount(
      2
    );

    await page.getByTestId('checkout-method-manual_instapay').click();
    await page.getByRole('button', { name: 'Continue' }).click();
    const instructions = page.getByTestId('checkout-instructions');
    await expect(instructions).toContainText(INSTAPAY_ADDRESS);
    await expect(page.getByTestId('checkout-amount-to-send')).toContainText(
      '1,500'
    );

    await page.getByTestId('checkout-reference').fill(`IPN-${stamp}`);
    await page.getByTestId('checkout-proof-file').setInputFiles({
      name: 'instapay-receipt.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    });
    await page.getByTestId('checkout-submit-proof').click();
    await expect(page.getByText('Payment submitted')).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole('link', { name: 'View my payments' }).click();
    await expect(page.getByTestId('learner-payments')).toContainText(
      courseTitle
    );
    await expect(page.getByTestId('learner-payment-status').first()).toHaveText(
      'Under review'
    );
    expect(
      await enrollmentForCourse(request, learner.session, courseId)
    ).toBeNull();

    const pending = await latestPayment(
      request,
      learner.session,
      academyId,
      courseId
    );
    approvedPaymentId = pending.id;
    expect(pending.reviewStatus).toBe('pending');
    // The Client Owner was told there is a payment to review.
    const ownerWork = await adminQuery<{ count: number }>(
      `select count(*)::int as count from communication_outbox
        where key = 'academy.payment.submitted' and recipient_user_id = :'owner'
          and values->>'paymentId' = :'payment'`,
      { owner: owner.userId, payment: approvedPaymentId }
    );
    expect(ownerWork[0].count).toBe(1);

    // The owner reviews it.
    await ownerPage.goto(`/dashboard/academy/${academyId}/payments`);
    await expect(
      ownerPage.getByTestId('academy-payments-tab-pending')
    ).toBeVisible();
    await ownerPage.getByText(courseTitle).first().click();
    const sheet = ownerPage.getByTestId('academy-payment-sheet');
    await expect(sheet.getByTestId('academy-payment-reference')).toHaveText(
      `IPN-${stamp}`
    );
    await expect(
      sheet.getByTestId('academy-payment-proof-image')
    ).toBeVisible();
    await sheet.getByTestId('academy-payment-approve').click();
    await ownerPage
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Approve payment' })
      .click();
    await expect(sheet).toContainText('Approved');

    await expect
      .poll(() => outboxCount('course.payment.approved', approvedPaymentId))
      .toBe(1);
    expect(
      (await enrollmentForCourse(request, learner.session, courseId))?.status
    ).toBe('enrolled');

    await page.reload();
    await expect(page.getByTestId('learner-payment-status').first()).toHaveText(
      'Approved'
    );
    await page.goto(academyPath(`/courses/${courseId}`));
    await expect(
      page.getByRole('button', { name: 'Start course' })
    ).toBeVisible({ timeout: 30_000 });
    await context.close();
  });

  test('3 — J-REJECT: the owner rejects with a reason; the learner sees it, pays again and is approved', async ({
    browser,
    request,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const learner = await newLearner(page, request, academyId, 'j42-reject');

    await page.goto(academyPath(`/my/courses/${courseId}/checkout`));
    await page
      .getByTestId('checkout-method-manual_bank_transfer')
      .click({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByTestId('checkout-instructions')).toContainText(
      BANK.accountNumber
    );
    await page.getByTestId('checkout-proof-file').setInputFiles({
      name: 'bank-receipt.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    });
    await page.getByTestId('checkout-submit-proof').click();
    await expect(page.getByText('Payment submitted')).toBeVisible({
      timeout: 30_000,
    });

    const pending = await latestPayment(
      request,
      learner.session,
      academyId,
      courseId
    );
    rejectedPaymentId = pending.id;

    await ownerPage.goto(
      `/dashboard/academy/${academyId}/payments?payment=${rejectedPaymentId}`
    );
    const sheet = ownerPage.getByTestId('academy-payment-sheet');
    await sheet.getByTestId('academy-payment-reject').click();
    await sheet
      .getByTestId('academy-payment-reject-reason')
      .fill(REJECT_REASON);
    await sheet.getByTestId('academy-payment-reject-confirm').click();
    await ownerPage
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Reject payment' })
      .click();
    await expect(sheet).toContainText(REJECT_REASON);

    await expect
      .poll(() => outboxCount('course.payment.rejected', rejectedPaymentId))
      .toBe(1);
    const [email] = await adminQuery<{ reason: string }>(
      `select values->>'reason' as reason from communication_outbox where key = 'course.payment.rejected' and entity_id = :'id'`,
      { id: rejectedPaymentId }
    );
    expect(email.reason).toBe(REJECT_REASON);
    expect(
      await enrollmentForCourse(request, learner.session, courseId)
    ).toBeNull();

    await page.goto(academyPath('/my/payments'));
    await expect(page.getByTestId('learner-payment-status').first()).toHaveText(
      'Rejected'
    );
    await expect(page.getByText(REJECT_REASON)).toBeVisible();
    await page.getByTestId('learner-payment-retry').click();

    // Pay again on the same order.
    await page
      .getByTestId('checkout-method-manual_instapay')
      .click({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByTestId('checkout-proof-file').setInputFiles({
      name: 'second.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    });
    await page.getByTestId('checkout-submit-proof').click();
    await expect(page.getByText('Payment submitted')).toBeVisible({
      timeout: 30_000,
    });

    const second = await latestPayment(
      request,
      learner.session,
      academyId,
      courseId
    );
    expect(second.id).not.toBe(rejectedPaymentId);
    expect(second.courseOrderId).toBe(pending.courseOrderId);
    const approved = await apiPost(
      request,
      owner,
      `/academies/${academyId}/course-payments/${second.id}/approve`,
      {}
    );
    expect(approved.ok(), await approved.text()).toBeTruthy();
    expect(
      (await enrollmentForCourse(request, learner.session, courseId))?.status
    ).toBe('enrolled');
    await context.close();
  });

  test('4 — CROSS-TENANT: another organization’s owner and another learner reach none of it', async ({
    request,
  }) => {
    // A brand-new organization owner (self-service signup + organization).
    const email = uniqueLearnerEmail('j42-other-owner');
    const registered = await request.post(`${API_BASE}/auth/register`, {
      data: { name: 'J42 Other Owner', email, password: LEARNER_PASSWORD },
    });
    expect(registered.status(), await registered.text()).toBe(201);
    let other = await apiSignIn(request, {
      email,
      password: LEARNER_PASSWORD,
      surface: 'management',
    });
    const org = await apiPost(request, other, '/organizations', {
      name: `J42 Other Org ${stamp}`,
    });
    expect(org.status(), await org.text()).toBe(201);
    other = await apiSignIn(request, {
      email,
      password: LEARNER_PASSWORD,
      surface: 'management',
    });

    for (const [method, path] of [
      ['get', `/academies/${academyId}/course-payments`],
      ['get', `/academies/${academyId}/course-payments/${approvedPaymentId}`],
      [
        'get',
        `/academies/${academyId}/course-payments/${rejectedPaymentId}/proof/file`,
      ],
      ['get', `/academies/${academyId}/payment-methods`],
      [
        'post',
        `/academies/${academyId}/course-payments/${rejectedPaymentId}/approve`,
      ],
    ] as const) {
      const res =
        method === 'get'
          ? await apiGet(request, other, path)
          : await apiPost(request, other, path, {});
      expect([403, 404], `${method} ${path} → ${res.status()}`).toContain(
        res.status()
      );
    }
    const sneak = await apiPatch(
      request,
      other,
      `/academies/${academyId}/payment-methods/instapay`,
      {}
    );
    expect([403, 404, 405]).toContain(sneak.status());

    // Another learner sees only their own payments (none).
    const strangerEmail = uniqueLearnerEmail('j42-stranger');
    const stranger = await request.post(`${API_BASE}/auth/register`, {
      data: {
        name: 'J42 Stranger',
        email: strangerEmail,
        password: LEARNER_PASSWORD,
      },
    });
    expect(stranger.status(), await stranger.text()).toBe(201);
    const strangerSession = await apiSignIn(request, {
      email: strangerEmail,
      password: LEARNER_PASSWORD,
      surface: 'management',
    });
    const theirs = await apiGet(request, strangerSession, '/course-payments', {
      academyId,
    });
    expect(theirs.ok(), await theirs.text()).toBeTruthy();
    expect((await theirs.json()).items).toEqual([]);

    // Proofs are never public: the raw route without a session is refused.
    const anonymous = await request.get(
      `${API_BASE}/academies/${academyId}/course-payments/${approvedPaymentId}/proof/file`
    );
    expect(anonymous.status()).toBe(401);
  });

  test('5 — accessibility, Arabic RTL and phone width of the new pages', async ({
    browser,
    request,
  }) => {
    const problems: string[] = [];
    for (const language of ['en', 'ar'] as const) {
      for (const viewport of [
        { width: 1280, height: 900 },
        { width: 390, height: 844 },
      ]) {
        await ownerPage.setViewportSize(viewport);
        await ownerPage.goto(`/dashboard/academy/${academyId}/payment-methods`);
        await setLanguage(ownerPage, language);
        await expect(
          ownerPage.getByTestId('academy-method-bank')
        ).toBeVisible();
        expect(await ownerPage.locator('html').getAttribute('dir')).toBe(
          language === 'ar' ? 'rtl' : 'ltr'
        );
        problems.push(
          ...(await accessibilityProblems(
            ownerPage,
            `methods ${language} ${viewport.width}`
          ))
        );

        await ownerPage.goto(
          `/dashboard/academy/${academyId}/payments?tab=all&payment=${rejectedPaymentId}`
        );
        await expect(
          ownerPage.getByTestId('academy-payment-sheet')
        ).toBeVisible();
        problems.push(
          ...(await accessibilityProblems(
            ownerPage,
            `review ${language} ${viewport.width}`
          ))
        );
      }
    }
    await setLanguage(ownerPage, 'en');
    await ownerPage.setViewportSize({ width: 1280, height: 900 });

    // The learner's pages, Arabic on a phone.
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await newLearner(page, request, academyId, 'j42-a11y');
    await page.goto(academyPath(`/ar/my/courses/${courseId}/checkout`));
    await expect(
      page.getByTestId('checkout-method-manual_instapay')
    ).toBeVisible({
      timeout: 60_000,
    });
    expect(await page.locator('[dir="rtl"]').count()).toBeGreaterThan(0);
    problems.push(...(await accessibilityProblems(page, 'checkout ar 390')));
    await page.getByTestId('checkout-method-manual_instapay').click();
    await page.getByRole('button', { name: 'متابعة' }).click();
    await expect(page.getByTestId('checkout-instructions')).toBeVisible();
    problems.push(
      ...(await accessibilityProblems(page, 'checkout proof ar 390'))
    );
    await page.goto(academyPath('/ar/my/payments'));
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    problems.push(...(await accessibilityProblems(page, 'my payments ar 390')));
    await context.close();

    expect(problems, problems.join('\n')).toEqual([]);
  });
});
