/**
 * J5 — Revocation (P64 Phase 4 master plan §P).
 *
 * A learner buys a paid course, is enrolled when the platform owner
 * approves the payment, and receives a protected-content grant for a
 * file lesson in the player. The order is then refunded — and the
 * journey proves that the refund is what ends access: the next grant
 * request is refused with `accessEnded`, a heartbeat on the lease the
 * learner already held is refused the same way, and the player, asked
 * for the lesson again, shows the blocked state instead of the file.
 *
 * REAL STACK ONLY: Vite on :3001 proxying to the Nest API on :3000
 * (`VITE_DEV_PROXY_HOST=<academy slug>` so the request host names the
 * academy), PostgreSQL, Redis and the S3-compatible store. Nothing is
 * mocked; a mock would assert the mock.
 *
 * WHO REFUNDS. The only refund route in the product is
 * `POST /course-orders/:id/refund`, and it is buyer-scoped and
 * buyer-initiated (a self-service full refund inside the refund window —
 * see `CourseOrderRefundsService`'s own doc comment). There is no
 * platform-owner refund route, so the learner requests the refund here.
 * The revocation that follows is the same server-side path whoever
 * triggers it.
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import {
  LEARNER_PASSWORD,
  academyPath,
  apiGet,
  apiPost,
  apiSignIn,
  registerLearnerThroughWebsite,
  uniqueLearnerEmail,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import {
  PROXIED_API_BASE,
  addProtectedFileLesson,
  browserAccessToken,
  buyCourseThroughApi,
  createCourse,
  ensureAcademy,
  ensurePaymentCollection,
  enrollmentForCourse,
  publishCourse,
  signInOnWebsite,
  signInPlatformOwner,
  type PaymentMethodFixture,
} from './support/phase4';

test.describe.configure({ mode: 'serial' });

test.describe('J5 — revocation after refund', () => {
  let academyId: string;
  let owner: Session;
  let platformOwner: Session;
  let learner: Session;
  let learnerEmail: string;
  let method: PaymentMethodFixture;
  let courseId: string;
  let lessonId: string;
  let fileName: string;
  let orderId: string;
  /** The lease the browser was granted while the learner still had access. */
  let leaseId: string | null = null;

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser, request }) => {
    test.setTimeout(240_000);
    await clearAuthRateLimits();

    let organizationId: string;
    ({ academyId, organizationId, owner } = await ensureAcademy(request));
    platformOwner = await signInPlatformOwner(request);
    method = await ensurePaymentCollection(request, owner, platformOwner, organizationId);

    /* ---------- the owner authors a paid course with a protected file lesson ---------- */
    const stamp = `${Date.now()}`;
    courseId = await createCourse(request, owner, academyId, {
      title: `J5 Paid Course ${stamp}`,
      pricing: { type: 'paid', amount: 120, currency: 'USD' },
      level: 'intermediate',
      description: 'Playwright journey J5: access ends with the refund.',
    });
    ({ lessonId, fileName } = await addProtectedFileLesson(
      request,
      owner,
      academyId,
      courseId,
      'Course notes'
    ));
    await publishCourse(request, owner, academyId, courseId);

    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('a learner registers on the academy website, buys the course, and is enrolled once the payment is approved', async ({
    request,
  }) => {
    test.setTimeout(120_000);
    learnerEmail = uniqueLearnerEmail('j5');
    await registerLearnerThroughWebsite(page, learnerEmail, 'J5 Learner');
    // Mirrors J1: this assertion is the synchronisation barrier. The
    // helper only clicks Sign up, so without waiting for the success
    // state the API sign-in below races the registration request and
    // fails with `invalidCredentials`.
    await expect(
      page.getByText(/check your (email|inbox)|account created|verify/i).first()
    ).toBeVisible({ timeout: 20_000 });

    learner = await apiSignIn(request, {
      email: learnerEmail,
      password: LEARNER_PASSWORD,
      surface: 'academy',
      academyId,
    });

    // Before buying: no enrollment, and the content is not for them.
    expect(await enrollmentForCourse(request, learner, courseId)).toBeNull();

    ({ orderId } = await buyCourseThroughApi(request, learner, platformOwner, courseId, method));

    const order = await apiGet(request, learner, `/course-orders/${orderId}`);
    expect((await order.json()).status).toBe('paid');
    const enrollment = await enrollmentForCourse(request, learner, courseId);
    expect(enrollment?.status).toBe('enrolled');
  });

  test('the player receives a protected grant for the file lesson', async () => {
    test.setTimeout(120_000);
    await signInOnWebsite(page, learnerEmail);

    const grantResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`/lessons/${lessonId}/content`) &&
        response.request().method() === 'GET',
      { timeout: 60_000 }
    );
    await page.goto(academyPath(`/my/courses/${courseId}/learn/${lessonId}`));
    const grant = await grantResponse;
    expect(grant.status(), await grant.text()).toBe(200);
    const grantBody = await grant.json();
    expect(grantBody.kind).toBe('file');
    // The signed URL is short-lived by contract, never a durable link.
    expect(Date.parse(grantBody.expiresAt)).toBeGreaterThan(Date.now());
    leaseId = grantBody.playbackLease?.leaseId ?? null;

    // What the learner sees: the file lesson, with its personal link.
    await expect(
      page.getByText('This lesson is a file. The link below is personal to you', {
        exact: false,
      })
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('link', { name: fileName })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('after the refund, the next grant is refused, the held lease is refused, and the player shows the blocked state', async ({
    request,
  }) => {
    test.setTimeout(120_000);

    /* ---------- the refund ---------- */
    const refund = await apiPost(request, learner, `/course-orders/${orderId}/refund`, {
      idempotencyKey: `e2e-refund-${orderId}`,
      reason: 'J5 revocation check',
    });
    expect(refund.status() < 300, `refund refused: ${refund.status()} ${await refund.text()}`).toBeTruthy();
    const refundBody = await refund.json();
    expect(refundBody.courseOrderId).toBe(orderId);

    // Idempotent: asking again returns the same refund, never a second one.
    const again = await apiPost(request, learner, `/course-orders/${orderId}/refund`, {
      idempotencyKey: `e2e-refund-${orderId}`,
    });
    expect(again.status() < 300, await again.text()).toBeTruthy();
    expect((await again.json()).id).toBe(refundBody.id);

    const order = await apiGet(request, learner, `/course-orders/${orderId}`);
    expect((await order.json()).status).toBe('refunded');

    // The enrollment is revoked, not deleted: history stays, access goes.
    const enrollment = await enrollmentForCourse(request, learner, courseId);
    expect(enrollment?.status).toBe('unavailable');
    expect(enrollment?.revokedAt).toBeTruthy();

    /* ---------- the next grant request, made AS THE BROWSER ---------- */
    // Through the same proxy the player uses (the request host names the
    // academy) with the token and device cookie the browser holds.
    const token = await browserAccessToken(page);
    const headers = { Authorization: `Bearer ${token}` };
    const contentUrl = `${PROXIED_API_BASE}/learning/courses/${courseId}/lessons/${lessonId}/content`;

    const refused = await page.request.get(contentUrl, { headers });
    expect(refused.status()).toBe(403);
    expect(await refused.text()).toContain('errors.learning.accessEnded');

    const refreshRefused = await page.request.post(
      `${PROXIED_API_BASE}/learning/courses/${courseId}/lessons/${lessonId}/playback/refresh`,
      { headers, data: {} }
    );
    expect(refreshRefused.status()).toBe(403);
    expect(await refreshRefused.text()).toContain('errors.learning.accessEnded');

    // The lease the learner already held does not survive the refund either.
    // The heartbeat path answers a deliberately ambiguous 404 for an
    // enrollment that is no longer active (`assertActiveEnrollment`), so
    // it is asserted as "refused, and never a lease", not by one status.
    if (leaseId) {
      const heartbeat = await page.request.post(
        `${PROXIED_API_BASE}/learning/courses/${courseId}/playback`,
        { headers, data: { lessonId, positionSeconds: 5, leaseId } }
      );
      expect([403, 404]).toContain(heartbeat.status());
      expect(await heartbeat.text()).not.toContain('"leaseHeld":true');
    }

    /* ---------- the player, asked for the lesson again ---------- */
    await page.reload();
    const blocked = page.getByRole('alert');
    await expect(blocked).toBeVisible({ timeout: 30_000 });
    await expect(blocked).toContainText('Your access to this course has ended');
    await expect(blocked).toContainText('Its content can no longer be opened');
    await expect(page.getByRole('link', { name: fileName })).toHaveCount(0);
  });
});
