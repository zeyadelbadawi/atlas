/**
 * J46 — customer requests ("Request a feature"), Chromium against the real
 * stack (Vite :3001 → API :3000).
 *
 *   1. The Organization Owner opens the academy dashboard, uses the
 *      contextual "Request a custom feature" card and sends a request; it is
 *      listed under Requests and its detail shows "Submitted".
 *   2. The request is routed: without a routing rule an email is queued to
 *      the Platform Owners' addresses (address recipients, no tenant id on
 *      the outbox row).
 *   3. The Platform Owner finds it in the console, moves it to "In progress"
 *      with a message, adds an INTERNAL note and a reply.
 *   4. The owner sees the new status and the reply — never the internal
 *      note (not in the page, not in the API answer).
 *   5. The academy's Manager is offered no request card and no Requests
 *      sidebar entry; made an academy Administrator (same organization
 *      permissions), she gets both — the entry follows the verified
 *      academy role, like the API.
 *   6. Phone width (360 px), Arabic: Requests list and detail have no
 *      sideways scroll.
 * The request and its events are deleted afterwards.
 */
import { expect, test, type Page } from '@playwright/test';
import { adminQuery, adminSql } from './support/admin-db';
import {
  SEED,
  seedCookieDecision,
  signInThroughDashboard,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import { PLATFORM_OWNER_EMAIL } from './support/phase4';
import { expectNoSidewaysScroll, setStoredLanguage } from './support/evidence';

test.describe.configure({ mode: 'serial', timeout: 240_000 });

const TAG = `J46-${Date.now()}`;
const TITLE = `${TAG} bulk certificate export`;
const INTERNAL_NOTE = `${TAG} internal: check with billing first`;
const REPLY = `${TAG} reply: we are scoping this now`;
const STATUS_NOTE = `${TAG} status: starting work`;

async function signIn(page: Page, email: string) {
  await clearAuthRateLimits();
  await seedCookieDecision(page);
  await signInThroughDashboard(page, email, SEED.password);
  await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
}

test.describe('J46 — customer requests', () => {
  let academyId: string;
  let requestId: string;

  test.beforeAll(async () => {
    const [row] = await adminQuery<{ id: string }>(
      `select id from academies where slug = 'web-development-academy'`
    );
    academyId = row.id;
  });

  test.afterAll(async () => {
    await adminSql(
      `delete from customer_request_events where request_id in
         (select id from customer_requests where title like :'p');
       delete from customer_requests where title like :'p'`,
      { p: `${TAG}%` }
    );
  });

  test('owner submits; Platform Owner triages; owner sees reply, never the internal note', async ({
    browser,
  }) => {
    // 1. Owner submits through the contextual card.
    const ownerContext = await browser.newContext();
    const owner = await ownerContext.newPage();
    await signIn(owner, SEED.owner);
    await owner.goto(`/dashboard/academy/${academyId}`);
    await owner
      .getByRole('button', { name: 'Request a custom feature' })
      .first()
      .click();
    const dialog = owner.getByRole('dialog', {
      name: 'Request a custom feature',
    });
    await dialog.getByRole('textbox', { name: 'Title' }).fill(TITLE);
    await dialog
      .getByRole('textbox', { name: 'Description' })
      .fill('Export every certificate issued this term as one ZIP file.');
    await dialog
      .getByRole('textbox', { name: 'Problem to solve' })
      .fill('Downloading one by one takes hours.');
    await dialog.getByRole('button', { name: 'Send request' }).click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });

    const [created] = await adminQuery<{
      id: string;
      status: string;
      type: string;
      academy_id: string;
    }>(
      `select id, status, type, academy_id from customer_requests where title = :'t'`,
      { t: TITLE }
    );
    expect(created).toMatchObject({
      status: 'submitted',
      type: 'custom_feature',
      academy_id: academyId,
    });
    requestId = created.id;

    await owner.goto(`/dashboard/academy/${academyId}/requests`);
    await expect(
      owner.getByText(TITLE).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 30_000 });
    await owner.goto(`/dashboard/academy/${academyId}/requests/${requestId}`);
    await expect(owner.getByRole('heading', { name: TITLE })).toBeVisible({
      timeout: 30_000,
    });
    await expect(owner.locator('main')).toContainText('Submitted');

    // 2. Routed to an address, with no tenant id on the outbox row.
    await expect
      .poll(
        async () =>
          (
            await adminQuery<{ n: number }>(
              `select count(*)::int as n from communication_outbox
                where key = 'customer_request.routed'
                  and recipient_email is not null
                  and organization_id is null and academy_id is null
                  and entity_id = :'r'`,
              { r: requestId }
            )
          )[0].n,
        { timeout: 30_000 }
      )
      .toBeGreaterThan(0);

    // 3. Platform Owner triages.
    const platformContext = await browser.newContext();
    const platform = await platformContext.newPage();
    await signIn(platform, PLATFORM_OWNER_EMAIL);
    await platform.goto('/dashboard/platform/customer-requests');
    await platform.getByText(TITLE).filter({ visible: true }).first().click();
    await platform.waitForURL(new RegExp(requestId), { timeout: 30_000 });

    await platform.getByTestId('customer-request-next-status').click();
    await platform.getByRole('option', { name: 'In progress' }).click();
    await platform
      .getByRole('textbox', { name: 'Message to the customer (optional)' })
      .fill(STATUS_NOTE);
    await platform.getByRole('button', { name: 'Update status' }).click();
    await expect
      .poll(
        async () =>
          (
            await adminQuery<{ status: string }>(
              `select status from customer_requests where id = :'r'`,
              { r: requestId }
            )
          )[0].status
      )
      .toBe('in_progress');

    const composer = platform.getByTestId('platform-request-composer');
    await composer.getByRole('radio', { name: 'Internal note' }).click();
    await platform.getByTestId('platform-request-message').fill(INTERNAL_NOTE);
    await composer.getByRole('button', { name: 'Add note' }).click();
    await expect(platform.locator('main')).toContainText(INTERNAL_NOTE, {
      timeout: 30_000,
    });
    await composer.getByRole('radio', { name: 'Reply to customer' }).click();
    await platform.getByTestId('platform-request-message').fill(REPLY);
    await composer.getByRole('button', { name: 'Send reply' }).click();
    await expect(platform.locator('main')).toContainText(REPLY, {
      timeout: 30_000,
    });

    // 4. Owner: status + reply visible; the internal note nowhere.
    const apiBodies: string[] = [];
    owner.on('response', async (response) => {
      if (response.url().includes(`/customer-requests/${requestId}`)) {
        apiBodies.push(await response.text().catch(() => ''));
      }
    });
    await owner.reload();
    const main = owner.locator('main');
    await expect(main).toContainText(REPLY, { timeout: 30_000 });
    await expect(main).toContainText(STATUS_NOTE);
    await expect(main).toContainText('In progress');
    await expect(main).not.toContainText(INTERNAL_NOTE);
    expect(apiBodies.length).toBeGreaterThan(0);
    for (const body of apiBodies) expect(body).not.toContain(INTERNAL_NOTE);

    await platformContext.close();
    await ownerContext.close();
  });

  test('the Manager is offered no request card', async ({ page }) => {
    await signIn(page, SEED.manager);
    await page.goto(`/dashboard/academy/${academyId}`);
    await expect(page.locator('main')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('button', { name: 'Request a custom feature' })
    ).toHaveCount(0);
    await expect(
      page.getByRole('navigation').getByRole('link', { name: 'Requests' })
    ).toHaveCount(0);
    await page.goto(`/dashboard/academy/${academyId}/requests`);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByText(TITLE)).toHaveCount(0);
  });

  test('an academy Administrator gets the Requests entry and the card', async ({
    page,
  }) => {
    // The seeded Manager, made an administrator of THIS academy for the
    // test — her organization permissions stay the manager set, so only
    // the verified academy role can show her the entry. Restored after.
    const roleSql = (role: string) =>
      adminSql(
        `update academy_members set role = :'role'::academy_member_role
          where academy_id = :'a'
            and user_id = (select id from users where email = :'e')`,
        { role, a: academyId, e: SEED.manager }
      );
    await roleSql('administrator');
    try {
      await signIn(page, SEED.manager);
      await page.goto(`/dashboard/academy/${academyId}`);
      const entry = page
        .getByRole('navigation')
        .getByRole('link', { name: 'Requests' });
      await expect(entry).toBeVisible({ timeout: 30_000 });
      await expect(
        page.getByRole('button', { name: 'Request a custom feature' }).first()
      ).toBeVisible();
      await entry.click();
      await page.waitForURL(new RegExp(`/academy/${academyId}/requests`));
      await expect(
        page.getByText(TITLE).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 30_000 });
    } finally {
      await roleSql('manager');
    }
  });

  test('phone width, Arabic: list and detail have no sideways scroll', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 360, height: 780 },
    });
    const page = await context.newPage();
    await signIn(page, SEED.owner);
    await setStoredLanguage(page, 'ar');
    await page.goto(`/dashboard/academy/${academyId}/requests`);
    await expect(
      page.getByText(TITLE).filter({ visible: true }).first()
    ).toBeVisible({
      timeout: 30_000,
    });
    await expectNoSidewaysScroll(page);
    await page.screenshot({
      path: `test-results/j46-requests-ar-360.png`,
      fullPage: true,
    });
    await page.goto(`/dashboard/academy/${academyId}/requests/${requestId}`);
    await expect(page.getByRole('heading', { name: TITLE })).toBeVisible({
      timeout: 30_000,
    });
    await expectNoSidewaysScroll(page);
    await page.screenshot({
      path: `test-results/j46-request-detail-ar-360.png`,
      fullPage: true,
    });
    await context.close();
  });
});
