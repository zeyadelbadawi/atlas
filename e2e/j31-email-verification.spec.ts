/**
 * J31 — Email verification links (Task 2), Chromium against the real stack
 * and database.
 *
 *  - An unknown (well-formed, 43-char base64url) token: the academy page
 *    `/verify-email` and the management page `/auth/verify-email` both
 *    show the "invalid link" state, and the token is gone from the address
 *    bar at once. A signed-out reader is told to sign in for a new link.
 *  - An EXPIRED link (AR phone, RTL): the expired state, in Arabic.
 *  - Signed in and unverified: the invalid state offers "Send a new link";
 *    sending shows the "sent" state.
 *  - A VALID link verifies the account (database stamped); opening it
 *    again shows the "already used" state.
 *  - While the page is open, `<meta name="referrer" content="no-referrer">`
 *    is in the document.
 *
 * TOKENS. The verification email's link cannot be read from the browser,
 * so — as `atlas-backend/test/email-verification-link-security.e2e-spec.ts`
 * relies on — a link is a random 32-byte base64url token whose SHA-256 hex
 * digest (`hashOpaqueToken`) is stored in `email_verification_tokens`. The
 * journey writes such rows with the admin connection for its own learner
 * (registered through the API), one valid and one already expired.
 */
import { createHash, randomBytes } from 'node:crypto';
import { test, expect as baseExpect, type Page } from '@playwright/test';
import {
  API_BASE,
  LEARNER_PASSWORD,
  academyPath,
  resolveAcademy,
  seedCookieDecision,
  uniqueLearnerEmail,
} from './support/atlas';
import {
  clearAuthRateLimits,
  clearRateLimitsAndThrottles,
} from './support/global-setup';
import { signInOnWebsite } from './support/phase4';
import { adminQuery, adminSql } from './support/admin-db';

// The shared stack also serves other suites; a cold Vite page can take
// tens of seconds, so waits are generous (assertions are unchanged).
test.describe.configure({ mode: 'serial', timeout: 240_000 });
const expect = baseExpect.configure({ timeout: 45_000 });

const PHONE = { width: 390, height: 844 };

function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

async function expectTokenRemovedAndNoReferrer(page: Page): Promise<void> {
  await expect.poll(() => page.url()).not.toContain('token=');
  expect(new URL(page.url()).searchParams.has('token')).toBe(false);
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
    'content',
    'no-referrer'
  );
}

test.describe('J31 — email verification links', () => {
  const learnerEmail = uniqueLearnerEmail('j31');
  const learnerName = `J31 Learner ${Date.now()}`;
  let userId: string;

  /** Stores a link for the journey's learner and returns its raw token. */
  async function insertToken(expiresInMs: number): Promise<string> {
    const raw = randomToken();
    const hash = createHash('sha256').update(raw).digest('hex');
    await adminSql(
      `insert into email_verification_tokens (id, user_id, token_hash, expires_at)
       values (gen_random_uuid()::text, :'user', :'hash', now() + (:'ms' || ' milliseconds')::interval);`,
      { user: userId, hash, ms: String(expiresInMs) }
    );
    return raw;
  }

  test.beforeAll(async ({ request }) => {
    await clearRateLimitsAndThrottles();
    const academy = await resolveAcademy(request);
    const registered = await request.post(`${API_BASE}/auth/register`, {
      data: {
        name: learnerName,
        email: learnerEmail,
        password: LEARNER_PASSWORD,
        academyId: academy.id,
      },
    });
    expect(registered.status(), await registered.text()).toBe(201);
    const [user] = await adminQuery<{ id: string; verified: string | null }>(
      `select id, email_verified_at as verified from users where email = :'e'`,
      { e: learnerEmail }
    );
    expect(user).toBeTruthy();
    expect(user.verified, 'a new account starts unverified').toBeNull();
    userId = user.id;
  });

  test('desktop (EN), signed out: an unknown token → invalid state on both hosts; token removed from the URL; no-referrer meta', async ({
    page,
  }, testInfo) => {
    await seedCookieDecision(page);
    await page.goto(academyPath(`/verify-email?token=${randomToken()}`));
    const error = page.getByTestId('verify-email-error');
    await expect(error).toBeVisible({ timeout: 90_000 });
    await expect(error).toHaveAttribute('data-state', 'invalid');
    await expect(error).toContainText('We could not verify this link');
    await expectTokenRemovedAndNoReferrer(page);
    // The academy selector survives the clean-up; only the token goes.
    expect(page.url()).toContain('__atlas_academy_preview=');
    await expect(error).toContainText(
      'Need a new link? Sign in and request one here.'
    );
    await expect(
      page.getByRole('button', { name: 'Send a new link' })
    ).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath('invalid-academy-en.png'),
    });

    // The management host's page behaves the same.
    await page.goto(`/auth/verify-email?token=${randomToken()}`);
    const mgmt = page.getByTestId('verify-email-error');
    await expect(mgmt).toBeVisible({ timeout: 90_000 });
    await expect(mgmt).toHaveAttribute('data-state', 'invalid');
    await expectTokenRemovedAndNoReferrer(page);
    await page.screenshot({
      path: testInfo.outputPath('invalid-management-en.png'),
    });
  });

  test('phone (AR): an expired link → the expired state in Arabic, RTL, token removed', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(PHONE);
    await seedCookieDecision(page);
    const expired = await insertToken(-60 * 60 * 1000);
    await page.goto(academyPath(`/ar/verify-email?token=${expired}`));
    const error = page.getByTestId('verify-email-error');
    await expect(error).toBeVisible({ timeout: 90_000 });
    await expect(error).toHaveAttribute('data-state', 'expired');
    await expect(error).toContainText('انتهت صلاحية رابط التأكيد هذا');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expectTokenRemovedAndNoReferrer(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      )
    ).toBeLessThanOrEqual(1);
    // Nothing was verified.
    const [user] = await adminQuery<{ verified: string | null }>(
      `select email_verified_at as verified from users where id = :'id'`,
      { id: userId }
    );
    expect(user.verified).toBeNull();
    await page.screenshot({
      path: testInfo.outputPath('expired-ar-phone.png'),
    });
  });

  test('desktop (EN), signed in and unverified: the resend button is offered and sending shows the sent state', async ({
    page,
  }, testInfo) => {
    await clearAuthRateLimits();
    await seedCookieDecision(page);
    await signInOnWebsite(page, learnerEmail);
    await page.goto(academyPath(`/verify-email?token=${randomToken()}`));
    const error = page.getByTestId('verify-email-error');
    await expect(error).toBeVisible({ timeout: 90_000 });
    await expect(error).toHaveAttribute('data-state', 'invalid');
    await expectTokenRemovedAndNoReferrer(page);
    const resend = page.getByRole('button', { name: 'Send a new link' });
    await expect(resend).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('resend-offered-en.png'),
    });
    await resend.click();
    const sent = page.getByTestId('verify-email-resend-sent');
    await expect(sent).toBeVisible();
    await expect(sent).toContainText('A new verification link is on its way.');
    await expect(sent).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath('resend-sent-en.png') });
  });

  test('desktop (EN): a valid link verifies the account; reusing it shows "already used"', async ({
    page,
  }, testInfo) => {
    await seedCookieDecision(page);
    // Created after the resend above, so it is the account's live link.
    const valid = await insertToken(60 * 60 * 1000);
    await page.goto(academyPath(`/verify-email?token=${valid}`));
    const success = page.getByTestId('verify-email-success');
    await expect(success).toBeVisible({ timeout: 90_000 });
    await expect(success).toContainText('Your email is verified');
    await expectTokenRemovedAndNoReferrer(page);
    await page.screenshot({ path: testInfo.outputPath('verified-en.png') });

    const [user] = await adminQuery<{ verified: string | null }>(
      `select email_verified_at as verified from users where id = :'id'`,
      { id: userId }
    );
    expect(user.verified).not.toBeNull();

    // The same link again.
    await page.goto(academyPath(`/verify-email?token=${valid}`));
    const error = page.getByTestId('verify-email-error');
    await expect(error).toBeVisible({ timeout: 90_000 });
    await expect(error).toHaveAttribute('data-state', 'used');
    await expect(error).toContainText('This link has already been used');
    await expectTokenRemovedAndNoReferrer(page);
    await page.screenshot({ path: testInfo.outputPath('reused-en.png') });
  });
});
