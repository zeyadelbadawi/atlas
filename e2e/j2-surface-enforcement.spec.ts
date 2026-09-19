/**
 * J2 — Surface Enforcement (P64 Phase 1 master plan §P).
 *
 * One learner, created through the academy website in this journey, is
 * followed across both surfaces: they get everything the academy surface
 * owes them, and are refused the management surface at the door, in the
 * router, and at the API — three independent places, asserted separately
 * so a pass cannot come from any one of them alone.
 *
 * The API assertions matter most. Routing and hidden navigation are
 * convenience; the 403 from `ManagementSurfaceGuard` is the control, and
 * it is checked with a raw token against management controllers, with no
 * browser in the way.
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import {
  ACADEMY_SLUG,
  LEARNER_PASSWORD,
  SEED,
  academyPath,
  apiGet,
  apiSignIn,
  declineCookies,
  registerLearnerThroughWebsite,
  requireSeed,
  signOutInBrowser,
  uniqueLearnerEmail,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';

test.describe.configure({ mode: 'serial' });

test.describe('J2 — surface enforcement', () => {
  let academyId: string;
  let learnerEmail: string;
  let learner: Session;

  /*
    One browser context for the whole journey, created here rather than
    taken from the per-test `page` fixture. The journey follows ONE
    learner across surfaces, and a fresh context per step would discard
    their session between steps — which would then "pass" the
    dashboard-redirect assertions for the wrong reason, by being signed
    out rather than by being a learner.
  */
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser, request }) => {
    // This journey drives several real sign-ins; see the helper.
    await clearAuthRateLimits();
    ({ academyId } = await requireSeed(request));
    learnerEmail = uniqueLearnerEmail('j2');
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('a learner is created through the academy website', async ({ request }) => {
    await registerLearnerThroughWebsite(page, learnerEmail, 'J2 Learner');

    // The page confirms the account, and the backend has the membership
    // bound to THIS academy — the two halves of "registered on the academy
    // website", checked independently of each other.
    await expect(
      page.getByText(/check your (email|inbox)|account created|verify/i).first()
    ).toBeVisible({ timeout: 20_000 });

    const session = await apiSignIn(request, {
      email: learnerEmail,
      password: LEARNER_PASSWORD,
      surface: 'academy',
      academyId,
    });
    const me = await apiGet(request, session, '/users/me');
    expect(me.ok()).toBeTruthy();
    const body = await me.json();
    expect(body.principalKind).toBe('learner');
    expect(body.academies.map((a: { academyId: string }) => a.academyId)).toContain(
      academyId
    );
  });

  test('the same credentials are refused on the central management sign-in', async () => {
    await signOutInBrowser(page);
    await page.goto('/auth/sign-in');
    await declineCookies(page);
    await page.locator('input[type="email"]').fill(learnerEmail);
    await page.locator('input[type="password"]').fill(LEARNER_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    // The refusal names the surface and points at the learner's academy.
    await expect(page.getByText(/you are a student/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(new RegExp(SEED.academyName, 'i')).first()).toBeVisible();

    // And it is a refusal, not a redirect after a successful sign-in:
    // nothing was stored, so the browser holds no management session.
    const stored = await page.evaluate(() =>
      window.localStorage.getItem('atlas:auth-tokens')
    );
    expect(stored).toBeNull();
    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test('the learner signs in on the academy website and lands on their learning surface', async () => {
    await signOutInBrowser(page);
    await page.goto(academyPath('/sign-in'));
    await page.locator('input[type="email"]').fill(learnerEmail);
    await page.locator('input[type="password"]').fill(LEARNER_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/my-learning/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: /my learning/i })).toBeVisible();
  });

  test('a signed-in learner cannot open /dashboard/platform', async () => {
    // Reuses the academy session established above: the redirect must
    // happen BECAUSE they are a learner, not because they are signed out.
    await page.goto('/dashboard/platform');
    await expect(page).toHaveURL(/\/academy-chooser/, { timeout: 20_000 });
  });

  test('a signed-in learner cannot open /dashboard/organization/create', async () => {
    await page.goto('/dashboard/organization/create');
    await expect(page).toHaveURL(/\/academy-chooser/, { timeout: 20_000 });
  });

  test('the academy chooser sends the learner back to their own academy', async () => {
    await page.goto('/academy-chooser');
    await expect(page.getByRole('heading', { name: /choose your academy/i })).toBeVisible(
      { timeout: 20_000 }
    );
    // The academy is offered by name, and a way out is always present.
    await expect(page.getByText(new RegExp(SEED.academyName, 'i')).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
  });

  test('a learner token is refused by every management controller', async ({
    request,
  }) => {
    learner = await apiSignIn(request, {
      email: learnerEmail,
      password: LEARNER_PASSWORD,
      surface: 'academy',
      academyId,
    });

    const managementEndpoints = [
      `/academies/${academyId}`,
      `/academies/${academyId}/students`,
      `/academies/${academyId}/courses`,
      `/academies/${academyId}/invites`,
      `/academies/${academyId}/registration-policy`,
      '/instructor/courses',
      '/review/courses',
      '/platform-users',
      '/organizations',
      '/search',
      '/trial-policy',
      '/subdomains/availability',
    ];

    for (const path of managementEndpoints) {
      const response = await apiGet(request, learner, path);
      expect(
        response.status(),
        `${path} should refuse a learner token with 403`
      ).toBe(403);
      const body = await response.json();
      expect(body.error.messageKey, `${path} should refuse on the SURFACE`).toBe(
        'errors.auth.managementSurfaceOnly'
      );
    }
  });

  test('the learner keeps everything the academy surface owes them', async ({
    request,
  }) => {
    // The refusals above must not be a blanket lockout: the same token
    // still reads the learner's own world.
    const me = await apiGet(request, learner, '/users/me');
    expect(me.status()).toBe(200);
    expect((await me.json()).managementSurfaceEnforced).toBe(true);

    const enrollments = await apiGet(request, learner, '/enrollments');
    expect(enrollments.status()).toBe(200);
  });

  test('a learner cannot sign in against an academy they do not belong to', async ({
    request,
  }) => {
    const other = await request.get(
      `${process.env.E2E_API_BASE_URL ?? 'http://localhost:3000/api/v1'}/public/websites/resolve`,
      { params: { hostname: ACADEMY_SLUG } }
    );
    expect(other.ok()).toBeTruthy();

    // A host that serves one academy must refuse a sign-in claiming another.
    const response = await request.post(
      `${process.env.E2E_API_BASE_URL ?? 'http://localhost:3000/api/v1'}/auth/sign-in`,
      {
        headers: { Host: `${ACADEMY_SLUG}.atlass.dpdns.org` },
        data: {
          email: learnerEmail,
          password: LEARNER_PASSWORD,
          surface: 'academy',
          academyId: '00000000-0000-4000-8000-000000000000',
        },
      }
    );
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });
});
