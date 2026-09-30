/**
 * J4 — Certificate tenancy (P64 Phase 3 master plan §P, §H).
 *
 * A certificate issued by academy A verifies as A's on the academy host
 * and on the platform host, and is never B's: B's owner cannot list it,
 * read it, revoke it or regenerate it, and verification on B's host still
 * names A. Runs against the real stack with the same flags as J1.
 *
 * The certificate is issued MANUALLY by A's owner (`force: true`) on a
 * fresh learner's enrollment, which is the plan's edge-case path for
 * issuance and keeps this journey independent of J1's timing.
 */
import { test, expect } from '@playwright/test';
import {
  ACADEMY_PREVIEW_PARAM,
  API_BASE,
  LEARNER_PASSWORD,
  SEED,
  academyPath,
  apiGet,
  apiPost,
  apiSignIn,
  findCourseByTitle,
  registerLearnerThroughWebsite,
  requireSeed,
  uniqueLearnerEmail,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';

test.describe.configure({ mode: 'serial' });

const OTHER_ACADEMY_SLUG = 'language-learning-hub';
const OTHER_OWNER = 'omar.hassan@nextgen-learning.dev';

test.describe('J4 — certificate tenancy', () => {
  let academyId: string;
  let owner: Session;
  let otherOwner: Session;
  let otherAcademyId: string;
  let learner: Session;
  let certificateId: string;
  let verificationCode: string;
  let serial: string;

  test.beforeAll(async ({ browser, request }) => {
    // Fixture authoring plus a real website sign-up: more than one minute
    // on a cold Vite dev server.
    test.setTimeout(180_000);
    await clearAuthRateLimits();
    ({ academyId, owner } = await requireSeed(request));

    const other = await request.get(`${API_BASE}/public/websites/resolve`, {
      params: { hostname: OTHER_ACADEMY_SLUG },
    });
    expect(
      other.ok(),
      `the seeded academy "${OTHER_ACADEMY_SLUG}" must resolve`
    ).toBeTruthy();
    otherAcademyId = (await other.json()).academyId;
    otherOwner = await apiSignIn(request, {
      email: OTHER_OWNER,
      password: SEED.password,
      surface: 'management',
    });

    const context = await browser.newContext();
    const page = await context.newPage();
    const email = uniqueLearnerEmail('j4');
    await registerLearnerThroughWebsite(page, email, 'J4 Learner');
    await expect(
      page.getByText(/check your (email|inbox)|account created|your account is ready|verify/i).first()
    ).toBeVisible({ timeout: 20_000 });
    await context.close();

    learner = await apiSignIn(request, {
      email,
      password: LEARNER_PASSWORD,
      surface: 'academy',
      academyId,
    });
    const course = await findCourseByTitle(
      request,
      owner,
      academyId,
      SEED.instructorCourseTitle
    );
    const enrolled = await apiPost(
      request,
      owner,
      `/academies/${academyId}/students/${learner.userId}/enrollments`,
      { courseId: course.id }
    );
    expect(enrolled.status(), await enrolled.text()).toBeLessThan(300);
    const detail = await apiGet(
      request,
      owner,
      `/academies/${academyId}/students/${learner.userId}`
    );
    const enrollment = (
      (await detail.json()).enrollments as { id: string; courseId: string }[]
    ).find((e) => e.courseId === course.id);
    expect(enrollment).toBeTruthy();

    // Force-issue still requires the course to award certificates at all
    // (P4 Issue F: readiness follows the course's own toggle).
    const rule = await request.put(
      `${API_BASE}/academies/${academyId}/courses/${course.id}/completion-rule`,
      {
        headers: { Authorization: `Bearer ${owner.accessToken}` },
        data: { certificatesEnabled: true },
      }
    );
    expect(rule.status(), await rule.text()).toBe(200);

    const issued = await apiPost(
      request,
      owner,
      `/academies/${academyId}/enrollments/${enrollment!.id}/certificate`,
      { reason: 'J4 tenancy fixture', force: true }
    );
    expect(issued.status(), await issued.text()).toBe(201);
    const certificate = await issued.json();
    certificateId = certificate.id;
    verificationCode = certificate.verificationCode;
    serial = certificate.serial;
  });

  test('verification names academy A on A’s host, on the platform host, and on B’s host', async ({
    page,
  }) => {
    for (const path of [
      academyPath(`/verify/${verificationCode}`),
      `/verify/${verificationCode}`,
      `/verify/${verificationCode}?${ACADEMY_PREVIEW_PARAM}=${OTHER_ACADEMY_SLUG}`,
    ]) {
      await page.goto(path);
      // The fact sheet itself — the website chrome around it carries the
      // HOST academy's name, which on B's host is B; the sheet must say A.
      const sheet = page.getByTestId('certificate-verify-valid');
      await expect(sheet).toBeVisible({ timeout: 30_000 });
      await expect(sheet.getByText(SEED.academyName)).toBeVisible();
      await expect(sheet.getByText(SEED.otherAcademyName)).toHaveCount(0);
    }
  });

  test('academy B’s owner sees nothing of A’s certificate and may not act on it', async ({
    request,
  }) => {
    const list = await apiGet(
      request,
      otherOwner,
      `/academies/${otherAcademyId}/certificates`,
      {
        pageSize: '100',
      }
    );
    expect(list.status()).toBe(200);
    expect(JSON.stringify(await list.json())).not.toContain(serial);

    const read = await apiGet(
      request,
      otherOwner,
      `/academies/${otherAcademyId}/certificates/${certificateId}`
    );
    expect(read.status()).toBe(404);

    const revoke = await apiPost(
      request,
      otherOwner,
      `/academies/${otherAcademyId}/certificates/${certificateId}/revoke`,
      { reason: 'not mine' }
    );
    expect([403, 404]).toContain(revoke.status());

    // And B's owner cannot reach A's certificate through A's own route either.
    const crossRoute = await apiGet(
      request,
      otherOwner,
      `/academies/${academyId}/certificates/${certificateId}`
    );
    expect([403, 404]).toContain(crossRoute.status());

    // The certificate is untouched by all of that.
    const still = await apiGet(
      request,
      owner,
      `/academies/${academyId}/certificates/${certificateId}`
    );
    expect((await still.json()).status).toBe('issued');
  });

  test('the learner sees it under Certificates on A and nowhere else', async ({
    request,
  }) => {
    // Straight at the API, localhost is not an academy host: name A.
    const mine = await apiGet(request, learner, `/learning/certificates`, {
      academyId,
    });
    expect(mine.status()).toBe(200);
    const body = await mine.json();
    expect(body.items.map((c: { id: string }) => c.id)).toContain(
      certificateId
    );

    // The same learner on B's host (the query fallback names B): nothing.
    const onB = await apiGet(request, learner, `/learning/certificates`, {
      academyId: otherAcademyId,
    });
    expect(onB.status()).toBe(200);
    expect((await onB.json()).items).toHaveLength(0);
  });
});
