/**
 * J37 — person-authored messages (W3-compose), Chromium against the real
 * stack and database. NEEDS THE INTEGRATED REBUILD: the API it calls ships
 * with the W3-compose backend.
 *
 *  - Academy owner (EN desktop): Academy → Messages shows the monthly
 *    quota meter; a message to the seeded Manager (staff by role) is
 *    previewed (1 recipient), confirmed and accepted; it appears in the
 *    history, and the LOCAL outbox holds exactly one email row linked to
 *    the campaign. That row is the evidence — nothing here claims a real
 *    provider delivered anything (the stack runs the stub provider).
 *  - The same page on a phone (390×844) in Arabic: RTL, no horizontal
 *    scroll, the quota meter and the composer visible.
 *  - The seeded Manager is not offered Messages, and the API refuses their
 *    preview with 403 (owner/administrator only, server-side). The same
 *    for the seeded Instructor.
 *  - Academy owner: the Messages page in EN and AR, desktop and phone
 *    (heading, direction, quota meter, composer, no sideways scroll).
 *  - Platform Owner: Email & Notifications → Compose and send previews an
 *    audience and sends an in-app-only broadcast; it shows in the history
 *    and creates no email outbox rows and no academy quota usage.
 */
import { test, expect as baseExpect, type Page } from '@playwright/test';
import {
  API_BASE,
  SEED,
  apiSignIn,
  authHeader,
  requireSeed,
  seedCookieDecision,
  signInThroughDashboard,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import { PLATFORM_OWNER_EMAIL } from './support/phase4';
import { adminQuery } from './support/admin-db';
import {
  VARIANTS,
  applyVariant,
  captureEvidence,
  expectNoSidewaysScroll,
} from './support/evidence';

test.describe.configure({ mode: 'serial', timeout: 240_000 });
const expect = baseExpect.configure({ timeout: 45_000 });

const PHONE = { width: 390, height: 844 };

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

async function writeMessage(
  page: Page,
  subject: string,
  body: string
): Promise<void> {
  await page.getByTestId('message-subject').fill(subject);
  const editor = page.getByTestId('message-body-editor');
  await editor.click();
  await page.keyboard.type(body);
}

async function eventually<T>(
  read: () => Promise<T>,
  done: (value: T) => boolean,
  timeoutMs = 90_000
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await read();
    if (done(value) || Date.now() > deadline) return value;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

test.describe('J37 — email composer', () => {
  const stamp = `${Date.now()}`;
  let academyId: string;
  let owner: Session;

  test.beforeAll(async ({ request }) => {
    await clearAuthRateLimits();
    ({ academyId, owner } = await requireSeed(request));
  });

  test('academy owner: preview, confirm and send to staff; history and local outbox evidence', async ({
    page,
  }, testInfo) => {
    const subject = `J37 staff note ${stamp}`;
    await signIn(page, SEED.owner);
    await page.goto(`/dashboard/academy/${academyId}/messages`);

    await expect(
      page.getByRole('heading', { name: 'Messages', exact: true })
    ).toBeVisible({
      timeout: 90_000,
    });
    await expect(page.getByTestId('quota-meter')).toContainText(
      'emails used this month'
    );

    await page.getByTestId('audience-staff').click();
    await page.getByTestId('audience-role-manager').click();
    await page.getByTestId('channel-in-app').click(); // email only
    await writeMessage(page, subject, 'Team meeting moved to Thursday.');

    const send = page.getByTestId('message-send-button');
    await expect(send).toBeDisabled();
    await page.getByTestId('message-preview-button').click();
    await expect(page.getByTestId('preview-recipients')).toHaveText('1');
    await expect(page.getByTestId('preview-emails')).toHaveText('1');

    await send.click();
    const dialog = page.getByTestId('confirm-send-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(subject);
    await page.getByTestId('confirm-send').click();
    await expect(dialog).toBeHidden();

    const item = page
      .getByTestId('campaign-history-item')
      .filter({ hasText: subject });
    await expect(item).toBeVisible();

    const [campaign] = await adminQuery<{
      id: string;
      recipient_count: number;
    }>(
      `select id, recipient_count from communication_campaigns
        where academy_id = :'aid' and subject = :'subject'`,
      { aid: academyId, subject }
    );
    expect(campaign?.recipient_count).toBe(1);
    const rows = await eventually(
      () =>
        adminQuery<{ key: string; state: string }>(
          `select key, state from communication_outbox where campaign_id = :'cid'`,
          { cid: campaign.id }
        ),
      (value) => value.length > 0
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe('academy.message.sent');
    await page.screenshot({
      path: testInfo.outputPath('messages-en.png'),
      fullPage: true,
    });
  });

  test('academy owner on a phone in Arabic: RTL, no horizontal scroll', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(PHONE);
    await signIn(page, SEED.owner);
    await page.goto(`/dashboard/academy/${academyId}/messages`);
    await setLanguage(page, 'ar');
    await expect(
      page.getByRole('heading', { name: 'الرسائل', exact: true })
    ).toBeVisible({
      timeout: 90_000,
    });
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByTestId('quota-meter')).toBeVisible();
    await expect(page.getByTestId('message-subject')).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: testInfo.outputPath('messages-ar-phone.png'),
      fullPage: true,
    });
    await setLanguage(page, 'en');
  });

  test('manager: not offered Messages; the API refuses the preview (403)', async ({
    page,
    request,
  }) => {
    await signIn(page, SEED.manager);
    await page.goto(`/dashboard/academy/${academyId}`);
    const nav = page.getByRole('navigation').first();
    await expect(
      nav.getByRole('link', { name: 'Courses' }).first()
    ).toBeVisible({
      timeout: 90_000,
    });
    await expect(
      nav.getByRole('link', { name: 'Messages', exact: true })
    ).toHaveCount(0);

    await clearAuthRateLimits();
    const manager = await apiSignIn(request, {
      email: SEED.manager,
      password: SEED.password,
      surface: 'management',
    });
    const res = await request.post(
      `${API_BASE}/academies/${academyId}/messages/preview`,
      {
        headers: authHeader(manager),
        data: {
          audience: { type: 'learners' },
          channels: { email: true, inApp: true },
        },
      }
    );
    expect(res.status()).toBe(403);
  });

  test('platform owner: compose and send an in-app broadcast; no email rows, no academy quota', async ({
    page,
  }) => {
    const subject = `J37 platform notice ${stamp}`;
    const usageBefore = await adminQuery<{ used: number }>(
      `select coalesce(sum(used), 0)::int as used from tenant_email_usage_periods`
    );
    await signIn(page, PLATFORM_OWNER_EMAIL);
    await page.goto('/dashboard/platform/email/compose');
    await expect(
      page.getByRole('heading', { name: 'Compose and Send', exact: true })
    ).toBeVisible({ timeout: 90_000 });

    await page.getByTestId('audience-academy_owners_admins').click();
    await page.getByTestId('channel-email').click(); // in-app only
    await writeMessage(
      page,
      subject,
      'Scheduled maintenance on Sunday at 02:00 UTC.'
    );
    await page.getByTestId('message-preview-button').click();
    await expect(page.getByTestId('preview-recipients')).not.toHaveText('0');

    await page.getByTestId('message-send-button').click();
    const confirmLarge = page.getByTestId('confirm-large-audience');
    if (await confirmLarge.isVisible()) await confirmLarge.click();
    await page.getByTestId('confirm-send').click();
    await expect(
      page.getByTestId('campaign-history-item').filter({ hasText: subject })
    ).toBeVisible();

    const [campaign] = await adminQuery<{ id: string }>(
      `select id from communication_campaigns where scope = 'platform' and subject = :'subject'`,
      { subject }
    );
    const notified = await eventually(
      () =>
        adminQuery<{ n: number }>(
          `select count(*)::int as n from notifications where dedupe_key = :'key'`,
          { key: `campaign:${campaign.id}` }
        ),
      (value) => (value[0]?.n ?? 0) > 0
    );
    expect(notified[0].n).toBeGreaterThan(0);
    const emails = await adminQuery<{ n: number }>(
      `select count(*)::int as n from communication_outbox where campaign_id = :'cid'`,
      { cid: campaign.id }
    );
    expect(emails[0].n).toBe(0);
    const usageAfter = await adminQuery<{ used: number }>(
      `select coalesce(sum(used), 0)::int as used from tenant_email_usage_periods`
    );
    expect(usageAfter[0].used).toBe(usageBefore[0].used);
  });

  test('academy owner: Messages in EN and AR, desktop and phone', async ({
    page,
  }) => {
    await signIn(page, SEED.owner);
    await page.goto(`/dashboard/academy/${academyId}/messages`);
    try {
      for (const variant of VARIANTS) {
        await applyVariant(page, variant);
        await expect(
          page.getByRole('heading', {
            name: variant.language === 'ar' ? 'الرسائل' : 'Messages',
            exact: true,
          })
        ).toBeVisible({ timeout: 90_000 });
        await expect(page.getByTestId('quota-meter')).toBeVisible();
        await expect(page.getByTestId('message-subject')).toBeVisible();
        await expect(page.getByTestId('message-preview-button')).toBeVisible();
        await expectNoSidewaysScroll(page);
        await captureEvidence(page, `academy-messages-${variant.name}`);
      }
    } finally {
      await setLanguage(page, 'en');
    }
  });

  test('instructor: not offered Messages; the API refuses the preview (403)', async ({
    page,
    request,
  }) => {
    await signIn(page, SEED.instructor);
    await page.goto(`/dashboard/academy/${academyId}`);
    const nav = page.getByRole('navigation').first();
    await expect(nav.getByRole('link').first()).toBeVisible({
      timeout: 90_000,
    });
    await expect(
      nav.getByRole('link', { name: 'Messages', exact: true })
    ).toHaveCount(0);

    await clearAuthRateLimits();
    const instructor = await apiSignIn(request, {
      email: SEED.instructor,
      password: SEED.password,
      surface: 'management',
    });
    const res = await request.post(
      `${API_BASE}/academies/${academyId}/messages/preview`,
      {
        headers: authHeader(instructor),
        data: {
          audience: { type: 'learners' },
          channels: { email: true, inApp: true },
        },
      }
    );
    expect(res.status()).toBe(403);
  });
});
