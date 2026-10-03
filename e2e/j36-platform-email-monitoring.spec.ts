/**
 * J36 — the Platform Owner's Email & Notifications section (W3), Chromium
 * against the real stack and database.
 *
 *  - The Platform Owner sees exactly three entries under "Email &
 *    Notifications" — Compose and Send, Academy Email Activity, OTP &
 *    Security Monitoring — and each page opens.
 *  - Academy Email Activity lists a seeded academy email with a MASKED
 *    recipient; the full address and the (legacy) code in the outbox row
 *    never reach the page.
 *  - OTP & Security Monitoring shows aggregates and a masked recent event;
 *    no full address or IP is rendered. Arabic at phone width is RTL.
 *  - An organisation owner sees none of the three entries, is refused by
 *    the route guard in the browser, and gets 403 from both APIs.
 *  - All three pages in EN and AR, on a desktop and a 390 px phone: the
 *    translated heading, the document direction, no sideways scroll.
 *  - The seeded Manager and Instructor get 403 from both APIs, and the
 *    Manager is not offered the section.
 *
 * NEEDS THE INTEGRATED REBUILD: the API on :3000 serves a prebuilt dist, and
 * the W3 endpoints (`platform-communications/email-activity`,
 * `platform-security/*`) and the `security_events` table's writer only exist
 * after the coordinator rebuilds it.
 */
import { test, expect as baseExpect } from '@playwright/test';
import {
  SEED,
  apiGet,
  apiSignIn,
  seedCookieDecision,
  signInThroughDashboard,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import { PLATFORM_OWNER_EMAIL } from './support/phase4';
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
const LEGACY_CODE = '583920';
const IP_HASH = 'f'.repeat(56) + 'a1b2c3d4';

function masked(email: string): string {
  return `${email[0]}•••${email.slice(email.indexOf('@'))}`;
}

test.describe('J36 — Platform Owner email & security monitoring', () => {
  const stamp = `${Date.now()}`;
  let outboxId = '';
  let eventId = '';

  test.beforeAll(async () => {
    await clearAuthRateLimits();
    const [owner] = await adminQuery<{ id: string; academy_id: string }>(
      `select u.id, a.id as academy_id
         from users u
         join academies a on a.name = :'academy'
        where u.email = :'email'`,
      { email: SEED.owner, academy: SEED.academyName }
    );
    outboxId = (
      await adminSql(
        `insert into communication_outbox
           (id, key, category, recipient_user_id, academy_id, locale, branding,
            values, channels, state, attempts, created_at, dispatched_at)
         values (gen_random_uuid()::text, 'auth.email.otp', 'security', :'uid', :'aid',
                 'en', 'academy', jsonb_build_object('code', :'code', 'stamp', :'stamp'),
                 '{"inApp":false,"email":"always"}'::jsonb, 'failed', 6, now(), null)
         returning id;`,
        { uid: owner.id, aid: owner.academy_id, code: LEGACY_CODE, stamp }
      )
    ).split('\n')[0];
    eventId = (
      await adminSql(
        `insert into security_events
           (id, event_type, surface, user_id, ip_hash, academy_id, reason, attempts_remaining, created_at)
         values (gen_random_uuid()::text, 'otp_failed', 'management', :'uid', :'ip', :'aid',
                 'invalid_code', 2, now())
         returning id;`,
        { uid: owner.id, ip: IP_HASH, aid: owner.academy_id }
      )
    ).split('\n')[0];
  });

  test.afterAll(async () => {
    await adminSql(`delete from communication_outbox where id = :'id';`, {
      id: outboxId,
    });
    await adminSql(`delete from security_events where id = :'id';`, {
      id: eventId,
    });
  });

  test('platform owner: three entries, Academy Email Activity masks the recipient and never shows the code', async ({
    page,
  }, testInfo) => {
    await seedCookieDecision(page);
    await signInThroughDashboard(page, PLATFORM_OWNER_EMAIL, SEED.password);
    await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
    await page.goto('/dashboard/platform/email/activity');

    const nav = page.getByRole('navigation').first();
    await expect(
      nav.getByText('Email & Notifications', { exact: true })
    ).toBeVisible({
      timeout: 90_000,
    });
    for (const name of [
      'Compose and Send',
      'Academy Email Activity',
      'OTP & Security Monitoring',
    ]) {
      await expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
    }

    await expect(
      page.getByRole('heading', { name: 'Academy Email Activity', exact: true })
    ).toBeVisible({ timeout: 90_000 });
    const row = page
      .locator('tbody tr', { hasText: masked(SEED.owner) })
      .first();
    await expect(row).toBeVisible();
    await expect(row).toContainText('auth.email.otp');
    await expect(row).toContainText('Failed');
    const body = (await page.locator('main').textContent()) ?? '';
    expect(body).not.toContain(SEED.owner);
    expect(body).not.toContain(LEGACY_CODE);
    await page.screenshot({
      path: testInfo.outputPath('activity-en.png'),
      fullPage: true,
    });

    await nav
      .getByRole('link', { name: 'Compose and Send', exact: true })
      .click();
    await expect(page).toHaveURL(/\/dashboard\/platform\/email\/compose/);
  });

  test('platform owner: OTP & Security Monitoring shows aggregates and a masked event (EN, then AR phone RTL)', async ({
    page,
  }, testInfo) => {
    await clearAuthRateLimits();
    await seedCookieDecision(page);
    await signInThroughDashboard(page, PLATFORM_OWNER_EMAIL, SEED.password);
    await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
    await page.goto('/dashboard/platform/email/security');
    await expect(
      page.getByRole('heading', {
        name: 'OTP & Security Monitoring',
        exact: true,
      })
    ).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText('Codes sent', { exact: true })).toBeVisible();
    await expect(page.getByText('Verify rate', { exact: true })).toBeVisible();
    const row = page
      .locator('tbody tr', { hasText: masked(SEED.owner) })
      .first();
    await expect(row).toBeVisible();
    await expect(row).toContainText('Code failed');
    await expect(row).toContainText('IP ref');
    const body = (await page.locator('main').textContent()) ?? '';
    expect(body).not.toContain(SEED.owner);
    expect(body).not.toContain(IP_HASH);
    await page.screenshot({
      path: testInfo.outputPath('security-en.png'),
      fullPage: true,
    });

    await page.setViewportSize(PHONE);
    await page.evaluate(() =>
      window.localStorage.setItem('atlas:language', JSON.stringify('ar'))
    );
    await page.reload();
    await expect(
      page.getByRole('heading', {
        name: 'مراقبة رموز التحقق والأمان',
        exact: true,
      })
    ).toBeVisible({ timeout: 90_000 });
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: testInfo.outputPath('security-ar-phone.png'),
      fullPage: true,
    });
  });

  test('organisation owner: no entries, refused in the browser, 403 from both APIs', async ({
    page,
    request,
  }) => {
    await clearAuthRateLimits();
    const session = await apiSignIn(request, {
      email: SEED.owner,
      password: SEED.password,
      surface: 'management',
    });
    for (const path of [
      '/platform-communications/email-activity',
      '/platform-communications/email-activity/summary',
      '/platform-security/summary',
      '/platform-security/events',
    ]) {
      expect((await apiGet(request, session, path)).status(), path).toBe(403);
    }

    await seedCookieDecision(page);
    await signInThroughDashboard(page, SEED.owner, SEED.password);
    await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
    await expect(
      page.getByText('Email & Notifications', { exact: true })
    ).toHaveCount(0);
    for (const path of [
      '/dashboard/platform/email/activity',
      '/dashboard/platform/email/security',
    ]) {
      await page.goto(path);
      await expect(
        page.getByRole('heading', {
          name: 'Academy Email Activity',
          exact: true,
        })
      ).toHaveCount(0);
      await expect(
        page.getByRole('heading', {
          name: 'OTP & Security Monitoring',
          exact: true,
        })
      ).toHaveCount(0);
      const body = (await page.locator('body').textContent()) ?? '';
      expect(body).not.toContain(masked(SEED.owner));
    }
  });

  test('platform owner: the three pages in EN and AR, desktop and phone', async ({
    page,
  }) => {
    await clearAuthRateLimits();
    await seedCookieDecision(page);
    await signInThroughDashboard(page, PLATFORM_OWNER_EMAIL, SEED.password);
    await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
    const pages = [
      {
        slug: 'compose',
        path: '/dashboard/platform/email/compose',
        en: 'Compose and Send',
        ar: 'إنشاء وإرسال',
      },
      {
        slug: 'activity',
        path: '/dashboard/platform/email/activity',
        en: 'Academy Email Activity',
        ar: 'نشاط بريد الأكاديميات',
      },
      {
        slug: 'security',
        path: '/dashboard/platform/email/security',
        en: 'OTP & Security Monitoring',
        ar: 'مراقبة رموز التحقق والأمان',
      },
    ];
    try {
      for (const entry of pages) {
        await page.goto(entry.path);
        for (const variant of VARIANTS) {
          await applyVariant(page, variant);
          await expect(
            page.getByRole('heading', {
              name: entry[variant.language],
              exact: true,
            })
          ).toBeVisible({ timeout: 90_000 });
          await expectNoSidewaysScroll(page);
          const body = (await page.locator('main').textContent()) ?? '';
          expect(body).not.toContain(SEED.owner);
          await captureEvidence(
            page,
            `platform-email-${entry.slug}-${variant.name}`
          );
        }
      }
    } finally {
      await setStoredLanguage(page, 'en');
    }
  });

  test('manager and instructor: 403 from both APIs; the manager is not offered the section', async ({
    page,
    request,
  }) => {
    for (const email of [SEED.manager, SEED.instructor]) {
      await clearAuthRateLimits();
      const session = await apiSignIn(request, {
        email,
        password: SEED.password,
        surface: 'management',
      });
      for (const path of [
        '/platform-communications/email-activity',
        '/platform-security/summary',
        '/platform-security/events',
      ]) {
        expect(
          (await apiGet(request, session, path)).status(),
          `${email} ${path}`
        ).toBe(403);
      }
    }

    await clearAuthRateLimits();
    await seedCookieDecision(page);
    await signInThroughDashboard(page, SEED.manager, SEED.password);
    await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
    await expect(
      page.getByText('Email & Notifications', { exact: true })
    ).toHaveCount(0);
    await page.goto('/dashboard/platform/email/security');
    await expect(
      page.getByRole('heading', {
        name: 'OTP & Security Monitoring',
        exact: true,
      })
    ).toHaveCount(0);
  });
});
