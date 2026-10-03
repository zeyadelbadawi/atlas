/**
 * J27 — Academy Orders and the Platform payment lists (Task 4), Chromium
 * against the real stack and database.
 *
 *  - The Organization Owner opens Academy → Orders: a course order made by
 *    a learner of this academy is listed with the buyer's NAME and MASKED
 *    email (the full address never reaches the page); search and the
 *    status filter live in the URL; the order's detail opens from the row,
 *    and Back returns to the same filtered list.
 *  - Phone (390×844) in Arabic: RTL, translated title, the row, no
 *    horizontal page scroll.
 *  - The seeded Manager is not offered Orders in the sidebar, and the
 *    address itself lands on the permission state.
 *  - The Platform Owner's course payments and subscription payment review
 *    lists name the academy / course / organization instead of raw ids;
 *    search and filters put their state in the URL (EN desktop, AR phone).
 *
 * FIXTURE. The product has no API that leaves a course order with a
 * manual payment awaiting review without changing the seeded
 * organization's payment-collection mode (which the API cannot set back to
 * `unconfigured`). So, exactly as `atlas-backend/test/academy-course-
 * orders.e2e-spec.ts` seeds them, the order, its payment and its proof are
 * written with the admin connection, for a paid course the owner creates
 * through the API and a learner who registers on the academy through the
 * API. Everything is removed again in `afterAll`.
 */
import { test, expect as baseExpect, type Page } from '@playwright/test';
import {
  API_BASE,
  LEARNER_PASSWORD,
  SEED,
  apiGet,
  authHeader,
  requireSeed,
  seedCookieDecision,
  signInThroughDashboard,
  uniqueLearnerEmail,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import { PLATFORM_OWNER_EMAIL, createCourse } from './support/phase4';
import { adminQuery, adminSql } from './support/admin-db';

// The shared stack also serves other suites; a cold Vite page can take
// tens of seconds, so waits are generous (assertions are unchanged).
test.describe.configure({ mode: 'serial', timeout: 240_000 });
const expect = baseExpect.configure({ timeout: 45_000 });

const PHONE = { width: 390, height: 844 };
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

async function signIn(page: Page, email: string): Promise<void> {
  await clearAuthRateLimits();
  await seedCookieDecision(page);
  await signInThroughDashboard(page, email, SEED.password);
  await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
}

async function setLanguage(page: Page, language: 'en' | 'ar'): Promise<void> {
  await page.evaluate(
    (lang) => localStorage.setItem('atlas:language', JSON.stringify(lang)),
    language
  );
  await page.reload();
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
}

test.describe('J27 — Academy Orders and Platform payment lists', () => {
  const stamp = `${Date.now()}`;
  const buyerName = `J27 Buyer ${stamp}`;
  const buyerEmail = uniqueLearnerEmail('j27');
  const courseTitle = `J27 Paid Course ${stamp}`;
  const reference = `J27-REF-${stamp}`;
  let academyId: string;
  let academyName: string;
  let organizationId: string;
  let owner: Session;
  let courseId: string;
  let orderId = '';
  let paymentId = '';
  let maskedEmail = '';

  test.beforeAll(async ({ request }) => {
    test.setTimeout(120_000);
    await clearAuthRateLimits();
    ({ academyId, owner } = await requireSeed(request));
    const academy = await (
      await apiGet(request, owner, `/academies/${academyId}`)
    ).json();
    organizationId = academy.organizationId;
    academyName = academy.name;

    courseId = await createCourse(request, owner, academyId, {
      title: courseTitle,
      pricing: { type: 'paid', amount: 75, currency: 'USD' },
      description: 'Playwright journey J27: an order to list.',
    });

    // The buyer registers on THIS academy through the real API.
    const registered = await request.post(`${API_BASE}/auth/register`, {
      data: {
        name: buyerName,
        email: buyerEmail,
        password: LEARNER_PASSWORD,
        academyId,
      },
    });
    expect(registered.status(), await registered.text()).toBe(201);
    const [buyer] = await adminQuery<{ id: string }>(
      `select id from users where email = :'email'`,
      { email: buyerEmail }
    );
    expect(buyer, 'the registered buyer exists').toBeTruthy();

    // Order → manual payment awaiting review → its proof (as the backend e2e seeds them).
    const createdAt = new Date().toISOString();
    orderId = await adminSql(
      `insert into course_orders (id, student_id, course_id, academy_id, organization_id,
         snapshot, status, expires_at, idempotency_key, created_at, updated_at)
       values (gen_random_uuid()::text, :'student', :'course', :'academy', :'org',
         jsonb_build_object('course', jsonb_build_object('id', :'course', 'title', :'title'),
           'price', jsonb_build_object('amountMinorUnits', 7500, 'currency', 'USD'),
           'capturedAt', :'createdAt'),
         'pending_payment', now() + interval '3 days', :'idem', now(), now())
       returning id;`,
      {
        student: buyer.id,
        course: courseId,
        academy: academyId,
        org: organizationId,
        title: courseTitle,
        createdAt,
        idem: `j27-idem-${stamp}`,
      }
    );
    paymentId = await adminSql(
      `insert into payments (id, payer_user_id, payee_academy_id, course_order_id,
         method_key, method_type, provider, amount_minor_units, currency, status,
         review_status, provider_reference, commission_rate_basis_points_snapshot,
         commission_amount_minor_units, payment_collection_mode_snapshot, created_at, updated_at)
       values (gen_random_uuid()::text, :'student', :'academy', :'order',
         :'methodKey', 'manual_bank_transfer', 'atlas_manual', 7500, 'USD', 'pending',
         'pending', :'reference', 1000, 750, 'atlas_payments', now(), now())
       returning id;`,
      {
        student: buyer.id,
        academy: academyId,
        order: orderId,
        methodKey: `j27-bank-${stamp}`,
        reference,
      }
    );
    await adminSql(
      `insert into payment_proofs (id, payment_id, file_name, storage_key, mime_type, note)
       values (gen_random_uuid()::text, :'payment', 'receipt.png', :'key', 'image/png', 'J27 proof');`,
      { payment: paymentId, key: `payment-proofs/j27-${stamp}` }
    );

    // What the owner's API sends for this row: the masked address, never the real one.
    const list = await apiGet(
      request,
      owner,
      `/academies/${academyId}/course-orders`,
      { search: buyerName }
    );
    expect(list.ok(), await list.text()).toBeTruthy();
    const body = await list.json();
    const row = body.items.find((o: { id: string }) => o.id === orderId);
    expect(row, 'the owner API lists the fixture order').toBeTruthy();
    maskedEmail = row.student.maskedEmail;
    expect(maskedEmail).toBeTruthy();
    expect(maskedEmail).not.toBe(buyerEmail);
    expect(JSON.stringify(body)).not.toContain(buyerEmail);
  });

  test.afterAll(async ({ request }) => {
    if (paymentId) {
      await adminSql(
        `delete from payment_proofs where payment_id = :'p'; delete from payments where id = :'p';`,
        { p: paymentId }
      );
    }
    if (orderId) {
      await adminSql(`delete from course_orders where id = :'o';`, {
        o: orderId,
      });
    }
    if (courseId) {
      await request
        .delete(`${API_BASE}/academies/${academyId}/courses/${courseId}`, {
          headers: authHeader(owner),
        })
        .catch(() => undefined);
    }
  });

  test('owner (desktop, EN): the order row shows name + masked email; search and filter live in the URL; Back from the detail keeps them', async ({
    page,
  }, testInfo) => {
    await signIn(page, SEED.owner);
    await page.goto(`/dashboard/academy/${academyId}/orders`);
    await expect(
      page.getByRole('heading', { name: 'Orders', exact: true })
    ).toBeVisible({ timeout: 90_000 });

    const row = page.locator('tbody tr', { hasText: buyerName });
    await expect(row).toBeVisible({ timeout: 90_000 });
    await expect(row).toContainText(maskedEmail);
    await expect(row).toContainText(courseTitle);
    await expect(row).toContainText(orderId.slice(0, 8));
    // The real address is nowhere on the page.
    await expect(page.locator('body')).not.toContainText(buyerEmail);
    await page.screenshot({
      path: testInfo.outputPath('orders-owner-en.png'),
      fullPage: true,
    });

    // Search → URL.
    await page
      .getByRole('searchbox', { name: 'Search by student, course or order ID' })
      .fill(buyerName);
    await expect(page).toHaveURL(/[?&]search=J27(\+|%20)Buyer/);
    // Status filter → URL.
    await page.locator('#academy-orders-status').click();
    await page.getByRole('option', { name: 'Awaiting payment' }).click();
    await expect(page).toHaveURL(/[?&]status=pending_payment/);
    await expect(row).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(1);
    const filteredUrl = page.url();

    // Detail from the row.
    await row.click();
    await page.waitForURL(new RegExp(`/orders/${orderId}$`));
    await expect(
      page.getByRole('heading', { name: 'Order details' })
    ).toBeVisible();
    await expect(page.getByText(orderId)).toBeVisible();
    await expect(page.getByText(maskedEmail)).toBeVisible();
    await expect(page.getByText(reference)).toBeVisible();
    await expect(page.locator('body')).not.toContainText(buyerEmail);
    await page.screenshot({ path: testInfo.outputPath('order-detail-en.png') });

    // Back keeps the filters.
    await page.goBack();
    await expect(page).toHaveURL(filteredUrl);
    await expect(row).toBeVisible();
    await expect(
      page.getByRole('searchbox', {
        name: 'Search by student, course or order ID',
      })
    ).toHaveValue(buyerName);
    await expect(page.locator('#academy-orders-status')).toContainText(
      'Awaiting payment'
    );
  });

  test('owner (phone, AR): RTL, translated title, the row, no horizontal scroll', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(PHONE);
    await signIn(page, SEED.owner);
    await page.goto(`/dashboard/academy/${academyId}/orders`);
    await setLanguage(page, 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(
      page.getByRole('heading', { name: 'الطلبات', exact: true })
    ).toBeVisible({ timeout: 90_000 });
    const row = page.locator('tbody tr', { hasText: buyerName });
    await expect(row).toBeVisible({ timeout: 90_000 });
    await expect(row).toContainText(maskedEmail);
    await expect(
      page.getByRole('searchbox', {
        name: 'ابحث باسم الطالب أو الدورة أو رقم الطلب',
      })
    ).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: testInfo.outputPath('orders-owner-ar-phone.png'),
      fullPage: true,
    });
    await setLanguage(page, 'en');
  });

  test('manager: no Orders entry in the sidebar, and the address shows the permission state', async ({
    page,
  }, testInfo) => {
    await signIn(page, SEED.manager);
    await page.goto(`/dashboard/academy?academyId=${academyId}`);
    const nav = page.getByRole('navigation').first();
    await expect(nav).toBeVisible({ timeout: 90_000 });
    // The sidebar has rendered its academy section (Courses is a manager entry).
    await expect(
      page.getByRole('link', { name: 'Courses', exact: true }).first()
    ).toBeVisible({ timeout: 90_000 });
    await expect(
      page.getByRole('link', { name: 'Orders', exact: true })
    ).toHaveCount(0);

    await page.goto(`/dashboard/academy/${academyId}/orders`);
    const guard = page.getByText('You do not have access');
    const pageState = page.getByText(
      'Only the organization owner can see orders'
    );
    await expect(guard.or(pageState)).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('tbody tr', { hasText: buyerName })).toHaveCount(
      0
    );
    await page.screenshot({ path: testInfo.outputPath('orders-manager.png') });
  });

  test('platform owner (desktop, EN): course payments name the academy and course; search and filters go to the URL', async ({
    page,
  }, testInfo) => {
    await signIn(page, PLATFORM_OWNER_EMAIL);
    await page.goto('/dashboard/platform/commerce/course-payments');
    await expect(
      page.getByRole('heading', { name: 'Course payments', exact: true })
    ).toBeVisible({ timeout: 90_000 });

    await page
      .getByRole('searchbox', {
        name: 'Search by academy, course, reference or payment ID',
      })
      .fill(courseTitle);
    await expect(page).toHaveURL(/[?&]search=J27(\+|%20)Paid/);
    const row = page.locator('tbody tr', { hasText: courseTitle });
    await expect(row).toBeVisible({ timeout: 90_000 });
    await expect(row).toContainText(academyName);
    await expect(row).toContainText('Bank transfer');
    // Names, not ids.
    expect(await row.innerText()).not.toMatch(UUID);

    await page.locator('#course-payments-method').click();
    await page.getByRole('option', { name: 'Bank transfer' }).click();
    await expect(page).toHaveURL(/[?&]methodType=manual_bank_transfer/);
    await expect(row).toBeVisible();

    await page.locator('#course-payments-review').click();
    await page.getByRole('option', { name: 'Approved' }).click();
    await expect(page).toHaveURL(/[?&]reviewStatus=approved/);
    await expect(row).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath('course-payments-en.png'),
      fullPage: true,
    });

    // A reload restores the same slice from the URL.
    await page.reload();
    await expect(
      page.getByRole('searchbox', {
        name: 'Search by academy, course, reference or payment ID',
      })
    ).toHaveValue(courseTitle, { timeout: 90_000 });

    // Subscription payment review: organization and plan by name.
    await page.goto('/dashboard/platform/payments?reviewStatus=all');
    await expect(
      page.getByRole('heading', { name: 'Payment Review', exact: true })
    ).toBeVisible({ timeout: 90_000 });
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 90_000 });
    const firstText = await firstRow.innerText();
    expect(firstText).not.toMatch(UUID);
    expect(firstText).not.toContain('Organization unavailable');
    const orgName = (await firstRow.locator('td').first().innerText()).trim();
    expect(orgName.length).toBeGreaterThan(1);

    await page
      .getByRole('searchbox', {
        name: 'Search by organization, reference or payment ID',
      })
      .fill(orgName);
    await expect(page).toHaveURL(/[?&]search=/);
    await expect(
      page.locator('tbody tr', { hasText: orgName }).first()
    ).toBeVisible({ timeout: 90_000 });
    await page.locator('#platform-payments-status').click();
    await page.getByRole('option', { name: 'Pending', exact: true }).click();
    await expect(page).toHaveURL(/[?&]status=pending/);
    await page.screenshot({
      path: testInfo.outputPath('subscription-payments-en.png'),
      fullPage: true,
    });
  });

  test('platform owner (phone, AR): both payment lists are translated and RTL', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(PHONE);
    await signIn(page, PLATFORM_OWNER_EMAIL);
    await page.goto(
      `/dashboard/platform/commerce/course-payments?search=${encodeURIComponent(courseTitle)}`
    );
    await setLanguage(page, 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(
      page.getByRole('heading', { name: 'مدفوعات الدورات', exact: true })
    ).toBeVisible({ timeout: 90_000 });
    const row = page.locator('tbody tr', { hasText: courseTitle });
    await expect(row).toBeVisible({ timeout: 90_000 });
    await expect(row).toContainText(academyName);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: testInfo.outputPath('course-payments-ar-phone.png'),
      fullPage: true,
    });

    await page.goto('/dashboard/platform/payments?reviewStatus=all');
    await expect(
      page.getByRole('heading', { name: 'مراجعة المدفوعات', exact: true })
    ).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('tbody tr').first()).toBeVisible({
      timeout: 90_000,
    });
    expect(await page.locator('tbody tr').first().innerText()).not.toMatch(
      UUID
    );
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: testInfo.outputPath('subscription-payments-ar-phone.png'),
      fullPage: true,
    });
    await setLanguage(page, 'en');
  });
});
