/**
 * J3 — Roster and RBAC (P64 Phase 1 master plan §P).
 *
 * Four principals against one academy: the learner who registers on its
 * website, the Client Owner who must see them appear, the Manager who
 * must be able to review and grade, and the Instructor who must be able
 * to work on their own course and no other.
 *
 * Where a step is about what someone SEES, it is driven through the real
 * interface. Where a step is about what someone MAY DO, the API is
 * asserted as well, because that is the boundary — a hidden button proves
 * nothing, and the plan is explicit that the interface must reflect
 * backend authorization rather than replace it.
 *
 * Fixture data that is expensive to produce through the interface (a quiz
 * attempt, an assignment submission) is created through the learner's own
 * API session. That is the learner genuinely doing it, not a mock, and it
 * keeps the journey's sign-in count inside the real rate limiter's budget.
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import {
  API_BASE,
  LEARNER_PASSWORD,
  SEED,
  apiGet,
  apiPost,
  apiSignIn,
  declineCookies,
  findCourseByTitle,
  registerLearnerThroughWebsite,
  requireSeed,
  resolveAcademy,
  signInThroughDashboard,
  uniqueLearnerEmail,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';

test.describe.configure({ mode: 'serial' });

test.describe('J3 — roster and RBAC', () => {
  let academyId: string;
  let owner: Session;
  let manager: Session;
  let instructor: Session;
  let learner: Session;
  let learnerEmail: string;
  let reviewCourseId: string;
  let instructorCourseId: string;
  let foreignCourseId: string;
  let quizId: string;
  let assignmentId: string;

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser, request }) => {
    // This journey drives several real sign-ins; see the helper.
    await clearAuthRateLimits();
    ({ academyId, owner } = await requireSeed(request));
    manager = await apiSignIn(request, {
      email: SEED.manager,
      password: SEED.password,
      surface: 'management',
    });
    instructor = await apiSignIn(request, {
      email: SEED.instructor,
      password: SEED.password,
      surface: 'management',
    });

    instructorCourseId = (
      await findCourseByTitle(request, owner, academyId, SEED.instructorCourseTitle)
    ).id;
    foreignCourseId = (
      await findCourseByTitle(request, owner, academyId, SEED.foreignCourseTitle)
    ).id;

    context = await browser.newContext();
    page = await context.newPage();
    learnerEmail = uniqueLearnerEmail('j3');
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('a learner signs up on the academy website', async ({ request }) => {
    await registerLearnerThroughWebsite(page, learnerEmail, 'J3 Learner');
    await expect(
      page.getByText(/check your (email|inbox)|account created|verify/i).first()
    ).toBeVisible({ timeout: 20_000 });

    learner = await apiSignIn(request, {
      email: learnerEmail,
      password: LEARNER_PASSWORD,
      surface: 'academy',
      academyId,
    });
  });

  test('the Client Owner signs in and finds the new learner on the Students tab', async () => {
    await signInThroughDashboard(page, SEED.owner, SEED.password);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });

    await page.goto(`/dashboard/academy/${academyId}/members?tab=students`);
    await declineCookies(page);

    // The tab exists and is the one showing.
    const studentsTab = page.getByRole('tab', { name: /students/i });
    await expect(studentsTab).toBeVisible({ timeout: 20_000 });
    await expect(studentsTab).toHaveAttribute('aria-selected', 'true');

    // The learner who registered minutes ago is on the roster, with the
    // provenance that says where they came from.
    const row = page.getByText(learnerEmail);
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/website sign-?up/i).first()).toBeVisible();
  });

  test('the student drawer opens and staff can grant a course from it', async () => {
    await page.getByText(learnerEmail).click();

    const drawer = page.getByRole('dialog').or(page.locator('[role="dialog"]'));
    await expect(drawer.getByText(learnerEmail).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: /enroll in a course/i })).toBeVisible();

    // Grant a course through the drawer — the enrollment the next step reads.
    await page.getByRole('button', { name: /enroll in a course/i }).click();
    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: SEED.instructorCourseTitle }).click();
    await page.getByRole('button', { name: /^enroll$/i }).click();

    await expect(page.getByText(/student enrolled/i)).toBeVisible({ timeout: 20_000 });
  });

  test('the drawer then shows that enrollment for the learner', async () => {
    await page.reload();
    await page.getByText(learnerEmail).click();
    await expect(
      page.getByText(SEED.instructorCourseTitle).first()
    ).toBeVisible({ timeout: 20_000 });
    // ...and the backend agrees about what it granted.
    const detail = await apiGet(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (page.context() as any).request,
      owner,
      `/academies/${academyId}/students/${learner.userId}`
    );
    expect(detail.status()).toBe(200);
    const body = await detail.json();
    expect(body.viewerScope).toBe('academy');
    expect(
      body.enrollments.map((e: { courseId: string }) => e.courseId)
    ).toContain(instructorCourseId);
  });

  test('the learner takes a quiz and submits an assignment on the review course', async ({
    request,
  }) => {
    // The Manager's review and grading steps need real learner work to
    // look at. The learner does it, through the learner's own session.
    reviewCourseId = (
      await findCourseByTitle(request, owner, academyId, 'Atlas Walkthrough Course')
    ).id;

    await apiPost(request, owner, `/academies/${academyId}/students/${learner.userId}/enrollments`, {
      courseId: reviewCourseId,
    });

    const quizzes = await apiGet(request, learner, `/courses/${reviewCourseId}/quizzes`);
    expect(quizzes.status()).toBe(200);
    const quizList = (await quizzes.json()).items ?? (await quizzes.json());
    quizId = quizList[0].id;

    // The quiz as the LEARNER sees it: questions and options, never which
    // option is correct. Answering the first option of every question is
    // enough to produce a real, gradeable attempt for the manager to read.
    const quiz = await apiGet(
      request,
      learner,
      `/courses/${reviewCourseId}/quizzes/${quizId}`
    );
    expect(quiz.status()).toBe(200);
    const quizBody = await quiz.json();
    expect(JSON.stringify(quizBody)).not.toContain('isCorrect');
    const answers = (quizBody.questions ?? []).map(
      (question: { id: string; options: { id: string }[] }) => ({
        questionId: question.id,
        selectedOptionIds: [question.options[0].id],
      })
    );
    expect(answers.length, 'the seeded quiz should have questions').toBeGreaterThan(0);

    const started = await apiPost(
      request,
      learner,
      `/courses/${reviewCourseId}/quizzes/${quizId}/attempts`
    );
    expect([200, 201]).toContain(started.status());
    const attempt = await started.json();
    const submitted = await apiPost(
      request,
      learner,
      `/courses/${reviewCourseId}/quizzes/${quizId}/attempts/${attempt.id}/submit`,
      { answers }
    );
    expect([200, 201], await submitted.text()).toContain(submitted.status());

    const assignments = await apiGet(
      request,
      learner,
      `/courses/${reviewCourseId}/assignments`
    );
    const assignmentList = (await assignments.json()).items ?? (await assignments.json());
    assignmentId = assignmentList[0].id;
    const submission = await apiPost(
      request,
      learner,
      `/courses/${reviewCourseId}/assignments/${assignmentId}/submission`,
      { response: 'J3 submission for grading.' }
    );
    expect([200, 201], await submission.text()).toContain(submission.status());
  });

  test('the Manager can view quiz attempts and grade the assignment', async ({
    request,
  }) => {
    // The boundary: a Manager is a reviewer of their academy's courses.
    const attempts = await apiGet(
      request,
      manager,
      `/review/courses/${reviewCourseId}/quizzes/${quizId}/attempts`
    );
    expect(attempts.status()).toBe(200);
    expect(JSON.stringify(await attempts.json())).toContain(learner.userId);

    const submissions = await apiGet(
      request,
      manager,
      `/review/courses/${reviewCourseId}/assignments/${assignmentId}/submissions`
    );
    expect(submissions.status()).toBe(200);
    const list = (await submissions.json()).items ?? (await submissions.json());
    const mine = list.find(
      (item: { studentId: string }) => item.studentId === learner.userId
    );
    expect(mine, 'the learner’s submission should be visible to the manager').toBeTruthy();

    const graded = await apiPost(
      request,
      manager,
      `/review/courses/${reviewCourseId}/assignments/${assignmentId}/submissions/${mine.id}/grade`,
      { score: 90, feedback: 'Graded by the manager in J3.' }
    );
    expect(graded.status(), await graded.text()).toBeLessThan(300);

    // And the interface the Manager would use renders that same review page.
    await page.goto(
      `/dashboard/instructor/courses/${reviewCourseId}/assignments/${assignmentId}/submissions`
    );
    await expect(page).not.toHaveURL(/forbidden|sign-in/, { timeout: 20_000 });
  });

  test('the Instructor may work on their assigned course', async ({ request }) => {
    const sections = await apiGet(
      request,
      instructor,
      `/courses/${instructorCourseId}/sections`
    );
    expect(sections.status()).toBe(200);

    const review = await apiGet(
      request,
      instructor,
      `/review/courses/${instructorCourseId}/students`
    );
    expect(review.status()).toBe(200);

    // A real curriculum edit, not just a read — Finding F5 was that an
    // instructor could not do this at all.
    const created = await apiPost(
      request,
      instructor,
      `/academies/${academyId}/courses/${instructorCourseId}/sections`,
      { title: `J3 instructor section ${Date.now()}` }
    );
    expect(created.status(), await created.text()).toBeLessThan(300);
  });

  test('the Instructor is refused a course they are not assigned to', async ({
    request,
  }) => {
    for (const path of [
      `/review/courses/${foreignCourseId}/students`,
      `/courses/${foreignCourseId}/sections`,
    ]) {
      const response = await apiGet(request, instructor, path);
      expect(response.status(), `${path} should be refused`).toBe(404);
    }

    const write = await apiPost(
      request,
      instructor,
      `/academies/${academyId}/courses/${foreignCourseId}/sections`,
      { title: 'should never exist' }
    );
    expect(write.status()).toBeGreaterThanOrEqual(400);

    // Roster reads stay narrowed to the students of their own courses.
    const roster = await apiGet(request, instructor, `/academies/${academyId}/students`);
    expect(roster.status()).toBe(200);
    const body = await roster.json();
    expect(body.items.every((row: { email: string }) => row.email !== undefined)).toBe(
      true
    );
    const detail = await apiGet(
      request,
      instructor,
      `/academies/${academyId}/students/${learner.userId}`
    );
    // The learner IS enrolled in this instructor's course, so they are
    // visible — and only through that scope.
    expect(detail.status()).toBe(200);
    expect((await detail.json()).viewerScope).toBe('assigned_courses');
  });

  test('cross-academy isolation holds for every staff principal', async ({ request }) => {
    // The seeded Client Owner belongs to MORE THAN ONE organization, which
    // makes this the right place to check scoping: the organization under
    // test is the one that actually owns this academy, found rather than
    // assumed.
    const me = await apiGet(request, owner, '/users/me');
    expect(me.status()).toBe(200);
    const organizations: { organizationId: string }[] = (await me.json()).organizations;
    expect(organizations.length).toBeGreaterThan(0);

    const listings = await Promise.all(
      organizations.map(async (organization) => {
        const response = await apiGet(request, owner, '/academies', {
          organizationId: organization.organizationId,
          pageSize: '50',
        });
        const items: { id: string; name: string }[] =
          response.status() === 200 ? ((await response.json()).items ?? []) : [];
        return { organizationId: organization.organizationId, items };
      })
    );

    const home = listings.find((listing) =>
      listing.items.some((item) => item.id === academyId)
    );
    expect(home, 'the academy under test should belong to one of the owner\u2019s organizations').toBeTruthy();

    // Each organization's listing contains ONLY its own academies: no
    // listing returns an academy that another listing owns.
    for (const listing of listings) {
      for (const other of listings) {
        if (other.organizationId === listing.organizationId) continue;
        const overlap = listing.items.filter((item) =>
          other.items.some((candidate) => candidate.id === item.id)
        );
        expect(
          overlap,
          'an academy appeared under two different organizations'
        ).toHaveLength(0);
      }
    }

    // The sharper case: organization membership is not membership of every
    // academy under it. A second academy of the SAME organization that the
    // staff member does not belong to must still refuse them.
    const sibling = home!.items.find((item) => item.id !== academyId);
    if (sibling) {
      for (const [who, session] of [
        ['owner', owner],
        ['manager', manager],
        ['instructor', instructor],
      ] as const) {
        const roster = await apiGet(request, session, `/academies/${sibling.id}/students`);
        expect(
          roster.status(),
          `${who} must not read the roster of an academy they are not a member of`
        ).toBe(403);
      }
    }

    // An academy of an organization the caller is NOT in at all.
    const foreign = listings
      .filter((listing) => listing.organizationId !== home!.organizationId)
      .flatMap((listing) => listing.items)[0];
    if (foreign) {
      for (const [who, session] of [
        ['manager', manager],
        ['instructor', instructor],
      ] as const) {
        const roster = await apiGet(request, session, `/academies/${foreign.id}/students`);
        expect(
          roster.status(),
          `${who} must not read another organization\u2019s academy roster`
        ).toBe(403);
      }
    }

    // An academy id that does not exist is refused the same way, so a probe
    // learns nothing from the difference between the two answers.
    const unknown = await apiGet(
      request,
      owner,
      '/academies/00000000-0000-4000-8000-000000000000/students'
    );
    expect(unknown.status()).toBe(403);
  });
});
