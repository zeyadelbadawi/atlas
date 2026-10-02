/**
 * J19 — the Academy Owner's Messages page (2 Oct 2026), Chromium against
 * the real stack and database.
 *
 * A visitor sends a message through the Academy website's Contact form;
 * the Owner finds it on Website → Messages: searched, filtered by status,
 * opened (which marks it read, and shows the text as text, never HTML),
 * archived and restored. Another Academy's Owner cannot read it, in the
 * UI or the API.
 */
import { test, expect, type Page } from '@playwright/test';
import {
  API_BASE,
  SEED,
  academyPath,
  apiGet,
  apiSignIn,
  requireSeed,
  seedCookieDecision,
  signInThroughDashboard,
  type Session,
} from './support/atlas';
import { clearRateLimitsAndThrottles } from './support/global-setup';

test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
const visitorName = `J19 Visitor ${stamp}`;
const visitorEmail = `j19.visitor.${stamp}@example.com`;
const message = `Hello <b>from J19</b> ${stamp}\nSecond line.`;
const apiName = `J19 Api ${stamp}`;

test.describe('J19 — Academy Messages', () => {
  let academyId: string;
  let owner: Session;

  test.beforeAll(async ({ request }) => {
    await clearRateLimitsAndThrottles();
    ({ academyId, owner } = await requireSeed(request));
  });

  async function openMessages(page: Page) {
    await seedCookieDecision(page);
    await signInThroughDashboard(page, SEED.owner, SEED.password);
    await page.waitForURL(/dashboard/, { timeout: 30_000 });
    await page.goto(`/dashboard/academy/${academyId}/website/messages`);
    await expect(
      page.getByRole('heading', { name: 'Messages' }).first()
    ).toBeVisible({
      timeout: 30_000,
    });
  }

  /** Each message in the table (the shared DataTable makes a selectable row a button). */
  const rowsOf = (page: Page) =>
    page.getByRole('region', { name: 'Website messages' }).getByRole('button');

  const search = (page: Page) =>
    page
      .getByRole('searchbox')
      .or(page.getByLabel('Search by name, email or message'))
      .first();

  test("a visitor's Contact form message reaches the Owner's Messages page", async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(150_000);
    const visitor = await page.context().browser()!.newPage();
    await seedCookieDecision(visitor);
    await visitor.goto(academyPath('/contact'));
    const form = visitor
      .locator('form')
      .filter({ has: visitor.locator('textarea') })
      .first();
    await expect(form).toBeVisible({ timeout: 30_000 });
    await form.locator('input[name="name"]').fill(visitorName);
    await form.locator('input[name="email"]').fill(visitorEmail);
    await form.locator('textarea').fill(message);
    const sent = visitor.waitForResponse((r) =>
      r.url().includes(`/public/websites/${academyId}/contact`)
    );
    await form.locator('button[type="submit"]').click();
    expect((await sent).status()).toBe(201);
    await visitor.close();

    // A second one through the same public endpoint, for the filters.
    const api = await request.post(
      `${API_BASE}/public/websites/${academyId}/contact`,
      {
        data: {
          name: apiName,
          email: `j19.api.${stamp}@example.com`,
          message: 'Second message',
        },
      }
    );
    expect(api.status()).toBe(201);

    await openMessages(page);
    await search(page).fill(String(stamp));
    const rows = rowsOf(page).filter({ hasText: String(stamp) });
    await expect(rows).toHaveCount(2, { timeout: 15_000 });
    await expect(page.getByText(/Showing 1–2 of 2 messages/)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`search=${stamp}`));
    await page.screenshot({
      path: testInfo.outputPath('messages-list.png'),
      fullPage: true,
    });

    // Refresh keeps the search.
    await page.reload();
    await expect(search(page)).toHaveValue(String(stamp), { timeout: 30_000 });
    await expect(rowsOf(page).filter({ hasText: String(stamp) })).toHaveCount(
      2
    );
  });

  test('opening marks it read and shows the text as text; status filters, archive and restore', async ({
    page,
  }, testInfo) => {
    test.setTimeout(150_000);
    await openMessages(page);
    await search(page).fill(visitorName);
    const row = rowsOf(page).filter({ hasText: visitorName });
    await expect(row).toHaveCount(1, { timeout: 15_000 });
    await row.click();

    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    const body = sheet.getByTestId('contact-submission-message');
    await expect(body).toContainText(`Hello <b>from J19</b> ${stamp}`);
    await expect(body.locator('b')).toHaveCount(0);
    await expect(
      sheet.getByRole('link', { name: 'Reply by email' })
    ).toHaveAttribute(
      'href',
      new RegExp(`^mailto:${visitorEmail.replace(/\./g, '\\.')}`)
    );
    await expect(sheet.getByText('Read', { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({ path: testInfo.outputPath('message-sheet.png') });

    await sheet.getByRole('button', { name: 'Archive' }).click();
    await expect(page.getByText('Message archived')).toBeVisible();
    await page.keyboard.press('Escape');

    const tabs = page.getByRole('tablist', { name: 'Filter by status' });
    await tabs.getByRole('tab', { name: /^New/ }).click();
    await expect(rowsOf(page).filter({ hasText: visitorName })).toHaveCount(0);
    await tabs.getByRole('tab', { name: /^Archived/ }).click();
    await expect(rowsOf(page).filter({ hasText: visitorName })).toHaveCount(1);
    await expect(page).toHaveURL(/status=archived/);

    await rowsOf(page).filter({ hasText: visitorName }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Restore' })
      .click();
    await expect(page.getByText('Message restored')).toBeVisible();
  });

  test("another Academy's Owner cannot read these messages", async ({
    request,
  }) => {
    const other = await apiSignIn(request, {
      email: 'omar.hassan@nextgen-learning.dev',
      password: SEED.password,
      surface: 'management',
    });
    const refused = await apiGet(
      request,
      other,
      `/academies/${academyId}/contact-submissions`
    );
    expect([403, 404]).toContain(refused.status());
    const own = await apiGet(
      request,
      owner,
      `/academies/${academyId}/contact-submissions?search=${stamp}`
    );
    expect(((await own.json()).items as unknown[]).length).toBe(2);
  });
});
