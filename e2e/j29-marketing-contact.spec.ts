/**
 * J29 — the Atlas marketing contact form and the Platform Owner's inbox
 * (Task 7), Chromium against the real stack and database.
 *
 *  - A visitor on the Atlas marketing home page (the platform host — the
 *    plain dashboard origin, without the academy preview selector) submits
 *    the empty form and sees an error on every required field (EN desktop,
 *    AR phone with RTL and Arabic messages).
 *  - The visitor fills it in, waits past the server's minimum fill time
 *    (`PLATFORM_CONTACT_MIN_FILL_MS` = 3 s, measured from when the form was
 *    first shown — a faster submission is silently discarded), sends it and
 *    sees the success state.
 *  - The Platform Owner finds the enquiry on Contact enquiries, opens the
 *    sheet (opening marks it read; it is toggled unread → read explicitly
 *    as well), deletes it through the confirmation dialog, and the row
 *    disappears without a reload. The database no longer has the row.
 *
 * The public endpoint is throttled (5 per 10 min per IP) and deduplicates
 * email + message, so the message is unique per run and the throttle
 * counters are cleared first (loopback Redis only).
 */
import { test, expect as baseExpect, type Page } from '@playwright/test';
import {
  LEARNER_EMAIL_DOMAIN,
  SEED,
  seedCookieDecision,
  signInThroughDashboard,
} from './support/atlas';
import {
  clearAuthRateLimits,
  clearRateLimitsAndThrottles,
} from './support/global-setup';
import { PLATFORM_OWNER_EMAIL } from './support/phase4';
import { adminQuery, adminSql } from './support/admin-db';

// The shared stack also serves other suites; a cold Vite page can take
// tens of seconds, so waits are generous (assertions are unchanged).
test.describe.configure({ mode: 'serial', timeout: 240_000 });
const expect = baseExpect.configure({ timeout: 45_000 });

const PHONE = { width: 390, height: 844 };
/** The backend's minimum fill time is 3 000 ms; wait comfortably past it. */
const FILL_WAIT_MS = 4_000;

async function openContactSection(page: Page, language: 'en' | 'ar') {
  await seedCookieDecision(page);
  await page.addInitScript((lang) => {
    window.localStorage.setItem('atlas:language', JSON.stringify(lang));
  }, language);
  await page.goto('/#contact');
  const form = page.getByRole('form', {
    name: language === 'ar' ? 'تواصل مع فريق أطلس' : 'Contact the Atlas team',
  });
  await expect(form).toBeVisible({ timeout: 120_000 });
  await form.scrollIntoViewIfNeeded();
  return form;
}

test.describe('J29 — marketing contact form → Platform Owner inbox', () => {
  const stamp = `${Date.now()}`;
  const visitorName = `J29 Visitor ${stamp}`;
  const visitorEmail = `j29.${stamp}@${LEARNER_EMAIL_DOMAIN}`;
  const message = `J29 enquiry ${stamp}: we would like to move our academy to Atlas.`;

  test.beforeAll(async () => {
    await clearRateLimitsAndThrottles();
  });

  test.afterAll(async () => {
    // Only if a failure left it behind; the journey deletes it in the UI.
    await adminSql(
      `delete from platform_contact_submissions where message = :'m';`,
      { m: message }
    );
  });

  test('visitor (phone, AR): the empty form shows an Arabic error on every required field, RTL', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(PHONE);
    const form = await openContactSection(page, 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await form.getByRole('button', { name: 'إرسال الرسالة' }).click();
    await expect(form.getByText('أدخل اسمك.')).toBeVisible();
    await expect(form.getByText('أدخل بريدك الإلكتروني.')).toBeVisible();
    await expect(form.getByText('اختر موضوعًا.')).toBeVisible();
    await expect(form.getByText('أدخل رسالتك.')).toBeVisible();
    await expect(form.getByLabel('اسمك')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    // Nothing was sent: the form is still there, no success state.
    await expect(page.getByTestId('marketing-contact-success')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      )
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: testInfo.outputPath('contact-errors-ar-phone.png'),
    });
  });

  test('visitor (desktop, EN): validation, then a real submission after the minimum fill time → success', async ({
    page,
  }, testInfo) => {
    await clearRateLimitsAndThrottles();
    const form = await openContactSection(page, 'en');
    const shownAt = Date.now();

    await form.getByRole('button', { name: 'Send message' }).click();
    await expect(form.getByText('Enter your name.')).toBeVisible();
    await expect(form.getByText('Enter your email address.')).toBeVisible();
    await expect(form.getByText('Choose a topic.')).toBeVisible();
    await expect(form.getByText('Enter a message.')).toBeVisible();
    // Focus moves to the first invalid field.
    await expect(form.getByLabel('Your name')).toBeFocused();
    await page.screenshot({
      path: testInfo.outputPath('contact-errors-en.png'),
    });

    await form.getByLabel('Your name').fill(visitorName);
    await form.getByLabel('Work email').fill(visitorEmail);
    await form.getByLabel('Organization (optional)').fill('J29 Academy Group');
    await form.getByRole('combobox', { name: 'Topic' }).click();
    await page.getByRole('option', { name: 'Plans and pricing' }).click();
    await form.getByLabel('Message').fill(message);
    await expect(form.getByText('Enter your name.')).toHaveCount(0);

    const elapsed = Date.now() - shownAt;
    if (elapsed < FILL_WAIT_MS)
      await page.waitForTimeout(FILL_WAIT_MS - elapsed);

    const sent = page.waitForResponse(
      (r) =>
        r.url().includes('/api/v1/public/contact') &&
        r.request().method() === 'POST'
    );
    await form.getByRole('button', { name: 'Send message' }).click();
    expect((await sent).ok()).toBeTruthy();
    const success = page.getByTestId('marketing-contact-success');
    await expect(success).toBeVisible();
    await expect(success).toContainText('Message sent');
    await expect(
      success.getByRole('button', { name: 'Send another message' })
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('contact-success-en.png'),
    });

    // Stored once (not discarded as too fast or as a duplicate).
    await expect
      .poll(
        async () =>
          (
            await adminQuery<{ n: number }>(
              `select count(*)::int as n from platform_contact_submissions where message = :'m'`,
              { m: message }
            )
          )[0].n,
        { timeout: 20_000 }
      )
      .toBe(1);
  });

  test('platform owner: finds the enquiry, opens it (read), deletes it with confirmation — gone at once, and from the database', async ({
    page,
  }, testInfo) => {
    await clearAuthRateLimits();
    await seedCookieDecision(page);
    await signInThroughDashboard(page, PLATFORM_OWNER_EMAIL, SEED.password);
    await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
    await page.goto('/dashboard/platform/contact-submissions');
    await expect(
      page.getByRole('heading', { name: 'Contact enquiries', exact: true })
    ).toBeVisible({ timeout: 90_000 });

    const row = page.locator('tbody tr', { hasText: visitorName });
    await expect(row).toBeVisible();
    await expect(row).toContainText('New');
    await expect(row).toContainText('Plans and pricing');
    await page.screenshot({
      path: testInfo.outputPath('inbox-en.png'),
      fullPage: true,
    });

    // Search lives in the URL.
    await page
      .getByRole('searchbox', {
        name: 'Search name, email, organization or message',
      })
      .fill(visitorName);
    await expect(page).toHaveURL(/[?&](q|search)=J29/);
    await expect(page.locator('tbody tr')).toHaveCount(1);

    // Opening reads it.
    await row.click();
    const sheet = page.getByRole('dialog', { name: 'Enquiry' });
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText(visitorEmail);
    await expect(sheet).toContainText(message);
    await expect(
      sheet.getByRole('button', { name: 'Mark as unread' })
    ).toBeVisible();
    await expect(row).toContainText('Read');

    // And explicitly: unread → read.
    await sheet.getByRole('button', { name: 'Mark as unread' }).click();
    await expect(page.getByText('Marked as unread').first()).toBeVisible();
    await sheet.getByRole('button', { name: 'Mark as read' }).click();
    await expect(page.getByText('Marked as read').first()).toBeVisible();
    await expect(
      sheet.getByRole('button', { name: 'Mark as unread' })
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('enquiry-sheet-en.png'),
    });

    // Delete, confirmed.
    await sheet.getByRole('button', { name: 'Delete' }).click();
    const confirm = page.getByRole('alertdialog', {
      name: 'Delete this enquiry?',
    });
    await expect(confirm).toBeVisible();
    await expect(confirm).toContainText(visitorName);
    await page.screenshot({
      path: testInfo.outputPath('delete-confirm-en.png'),
    });
    await confirm.getByRole('button', { name: 'Delete permanently' }).click();
    await expect(page.getByText('Enquiry deleted').first()).toBeVisible();
    await expect(confirm).toBeHidden();
    await expect(sheet).toBeHidden();
    // Gone from the list without a reload.
    await expect(
      page.locator('tbody tr', { hasText: visitorName })
    ).toHaveCount(0);
    await expect(page.getByText('No enquiries match')).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('inbox-after-delete-en.png'),
    });

    const rows = await adminQuery<{ n: number }>(
      `select count(*)::int as n from platform_contact_submissions where message = :'m'`,
      { m: message }
    );
    expect(rows[0].n).toBe(0);
  });
});
