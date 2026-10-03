/**
 * J11 — the quiz/exam lifecycle across roles (P7), Chromium against the
 * real stack and database. The fifteen steps of the brief, in order:
 *
 *  1–3   the Instructor creates the quiz IN THE DASHBOARD UI, sets
 *        integrity to Warn and turns on "Require full screen"; the setting
 *        survives a reload and an edit (and the server has it);
 *  4     the quiz is published and placed in the course (owner, API);
 *  5–13  a Student, in ARABIC, signs in, reads the rules, starts with a
 *        click, is in full screen (browser state checked), answers with
 *        autosave, leaves full screen (gate) and returns, loses the
 *        network and recovers without losing answers, reloads mid-attempt
 *        and resumes, submits, and sees the result;
 *  14    the Instructor and the Manager open the auditable review: policy,
 *        signals with evidence, timeline;
 *  15    another organization's owner cannot read or change any of it.
 *
 * Failure cases on the way: a second submit, an invalid event payload, a
 * learner tampering with quiz settings or reading the review, a stale
 * (invalid) session. Role coverage: Organization + Academy Owner (Sarah,
 * owns Org A and Academy A1), Manager (Nora), Instructor (Jane), Student
 * (registered here), and the other tenant's owner (Omar, Org B).
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import {
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
  seedCookieDecision,
  signInThroughDashboard,
  uniqueLearnerEmail,
  type Session,
  uniqueLearnerName,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';

test.describe.configure({ mode: 'serial' });

const OTHER_ORG_OWNER = 'omar.hassan@nextgen-learning.dev';

test.describe('J11 — quiz lifecycle across roles (EN dashboard, AR student)', () => {
  let academyId: string;
  let owner: Session;
  let instructor: Session;
  let manager: Session;
  let otherOwner: Session;
  let learner: Session;
  let learnerEmail: string;
  let courseId: string;
  let sectionId: string;
  let quizId: string;
  let attemptId: string;
  const title = `J11 Exam ${Date.now()}`;

  test.beforeAll(async ({ browser, request }) => {
    test.setTimeout(180_000);
    await clearAuthRateLimits();
    ({ academyId, owner } = await requireSeed(request));
    instructor = await apiSignIn(request, {
      email: SEED.instructor,
      password: SEED.password,
      surface: 'management',
    });
    manager = await apiSignIn(request, {
      email: SEED.manager,
      password: SEED.password,
      surface: 'management',
    });
    otherOwner = await apiSignIn(request, {
      email: OTHER_ORG_OWNER,
      password: SEED.password,
      surface: 'management',
    });
    // A course of its own (a seeded course's progression would lock the
    // exam behind its lessons), with the Instructor assigned to it.
    const stamp = `${Date.now()}`;
    const created = await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses`,
      {
        title: `J11 Exam Course ${stamp}`,
        slug: `j11-exam-course-${stamp}`,
        shortDescription: 'Playwright journey J11.',
        pricing: { type: 'free' },
        visibility: 'public',
      }
    );
    expect(created.status(), await created.text()).toBe(201);
    courseId = (await created.json()).id;
    const section = await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses/${courseId}/sections`,
      { title: 'Exam' }
    );
    sectionId = (await section.json()).id;
    const assigned = await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses/${courseId}/instructors`,
      {
        userId: instructor.userId,
      }
    );
    expect(assigned.status(), await assigned.text()).toBeLessThan(300);

    learnerEmail = uniqueLearnerEmail('j11');
    const page = await browser.newPage();
    await seedCookieDecision(page);
    await registerLearnerThroughWebsite(
      page,
      learnerEmail,
      uniqueLearnerName('طالب J11')
    );
    await expect(
      page
        .getByText(
          /check your (email|inbox)|account created|your account is ready|verify/i
        )
        .first()
    ).toBeVisible({ timeout: 20_000 });
    await page.close();
    learner = await apiSignIn(request, {
      email: learnerEmail,
      password: LEARNER_PASSWORD,
      surface: 'academy',
      academyId,
    });
  });

  test('1–3: the Instructor creates the exam in the dashboard; full screen persists after reload and edit', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(180_000);
    const context = await browser.newContext();
    const page = await context.newPage();
    await seedCookieDecision(page);
    await signInThroughDashboard(page, SEED.instructor, SEED.password);
    await page.waitForURL(/dashboard/, { timeout: 30_000 });
    await page.goto(
      `/dashboard/academy/${academyId}/courses/${courseId}/quizzes/create`
    );

    await page.getByRole('textbox', { name: 'Title' }).fill(title);
    await page.getByRole('combobox', { name: /^Status/ }).click();
    await page.getByRole('option', { name: 'Published' }).click();
    // W7 — integrity and full screen live behind "Advanced options",
    // collapsed by default for a new quiz. Open it first.
    const advanced = page.getByRole('button', { name: /Advanced options/ });
    await expect(advanced).toHaveAttribute('aria-expanded', 'false');
    await advanced.click();
    await expect(advanced).toHaveAttribute('aria-expanded', 'true');
    // Integrity off → the full-screen switch is not offered, and the form says why.
    await expect(
      page.getByTestId('fullscreen-requires-integrity')
    ).toBeVisible();
    await page.getByRole('combobox', { name: 'Integrity mode' }).click();
    await page.getByRole('option', { name: 'Warn' }).click();
    const fullscreenSwitch = page.getByRole('switch', {
      name: 'Require full screen',
    });
    await fullscreenSwitch.click();
    await expect(fullscreenSwitch).toBeChecked();
    await page.getByRole('spinbutton', { name: /Max attempts/ }).fill('3');

    await page.getByRole('textbox', { name: 'Prompt' }).fill('What is 2 + 2?');
    await page.getByRole('textbox', { name: 'Option 1' }).fill('4');
    await page.getByRole('textbox', { name: 'Option 2' }).fill('5');
    await page.getByRole('radio', { name: 'Correct' }).first().check();
    await page.screenshot({
      path: testInfo.outputPath('1-create-exam.png'),
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Save Quiz' }).click();

    // The server has it.
    await expect
      .poll(
        async () => {
          const list = await apiGet(
            request,
            owner,
            `/courses/${courseId}/quizzes/authoring`
          );
          const items = ((await list.json()).items ?? (await list.json())) as {
            id: string;
            title: string;
          }[];
          return items.find((q) => q.title === title)?.id ?? '';
        },
        { timeout: 20_000 }
      )
      .not.toBe('');
    const list = await apiGet(
      request,
      owner,
      `/courses/${courseId}/quizzes/authoring`
    );
    quizId = (
      ((await list.json()).items ?? (await list.json())) as {
        id: string;
        title: string;
      }[]
    ).find((q) => q.title === title)!.id;
    const authoring = await (
      await apiGet(
        request,
        owner,
        `/courses/${courseId}/quizzes/${quizId}/authoring`
      )
    ).json();
    expect(authoring.settings ?? authoring).toMatchObject({
      integrityMode: 'warn',
      requireFullscreen: true,
    });

    // Reload the editor: the switch is still on — and "Advanced options"
    // opened by itself, because this quiz customises integrity (W7).
    const editUrl = `/dashboard/academy/${academyId}/courses/${courseId}/quizzes/${quizId}`;
    await page.goto(editUrl);
    await expect(
      page.getByRole('switch', { name: 'Require full screen' })
    ).toBeChecked({ timeout: 30_000 });
    await expect(
      page.getByRole('button', { name: /Advanced options/ })
    ).toHaveAttribute('aria-expanded', 'true');
    await expect(
      page.getByRole('combobox', { name: 'Integrity mode' })
    ).toContainText('Warn');

    // Edit something else and save: still on.
    await page
      .getByRole('textbox', { name: 'Title' })
      .fill(`${title} (edited)`);
    await page.getByRole('button', { name: 'Save Quiz' }).click();
    await expect
      .poll(
        async () =>
          (
            await (
              await apiGet(
                request,
                owner,
                `/courses/${courseId}/quizzes/${quizId}/authoring`
              )
            ).json()
          ).title,
        { timeout: 20_000 }
      )
      .toBe(`${title} (edited)`);
    await page.goto(editUrl);
    await expect(
      page.getByRole('switch', { name: 'Require full screen' })
    ).toBeChecked({ timeout: 30_000 });
    await context.close();
  });

  test('4: the quiz is published and placed in the course; the student is enrolled', async ({
    request,
  }) => {
    const attached = await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses/${courseId}/sections/${sectionId}/items/attach`,
      { type: 'quiz', itemId: quizId }
    );
    expect(attached.status(), await attached.text()).toBeLessThan(300);
    const published = await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses/${courseId}/publish`
    );
    expect(published.status(), await published.text()).toBeLessThan(300);
    const enrolled = await apiPost(
      request,
      owner,
      `/academies/${academyId}/students/${learner.userId}/enrollments`,
      { courseId }
    );
    expect(enrolled.status(), await enrolled.text()).toBeLessThan(300);
    const learnerView = await apiGet(
      request,
      learner,
      `/courses/${courseId}/quizzes/${quizId}`
    );
    expect(learnerView.status()).toBe(200);
    expect((await learnerView.json()).settings).toMatchObject({
      integrityMode: 'warn',
      requireFullscreen: true,
    });
  });

  test('5–13: the Student (Arabic) takes the exam: rules, gesture, full screen, saving, exit and return, offline, reload, submit, result', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(240_000);
    const context: BrowserContext = await browser.newContext({ locale: 'ar' });
    const page: Page = await context.newPage();
    await seedCookieDecision(page);
    await page.goto(academyPath('/ar/sign-in'));
    await page.locator('input[type="email"]').fill(learnerEmail);
    await page.locator('input[type="password"]').fill(LEARNER_PASSWORD);
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/my/, { timeout: 30_000 });

    await page.goto(
      academyPath(`/ar/my/courses/${courseId}/activities/${quizId}`)
    );
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    // 6: the rules, in Arabic, before Start.
    await expect(
      page.getByText(/يُفتح هذا الاختبار في وضع ملء الشاشة/)
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText(/لا يستخدم أطلس الكاميرا أو الميكروفون/)
    ).toBeVisible();
    await page.locator('#quiz-integrity-ack').click();
    await page.screenshot({
      path: testInfo.outputPath('5-rules-ar.png'),
      fullPage: true,
    });

    // 7–8: a real click; the document is in full screen.
    await page.getByTestId('quiz-start').click();
    await expect(page.getByTestId('quiz-runner')).toBeVisible({
      timeout: 30_000,
    });
    await expect
      .poll(() => page.evaluate(() => document.fullscreenElement !== null))
      .toBe(true);

    // 9: answer; autosave confirms.
    await page
      .getByTestId('quiz-question-1')
      .getByText('4', { exact: true })
      .click();
    await expect(page.getByTestId('quiz-save-state')).toBeVisible();
    await expect
      .poll(
        async () => {
          const s = await (
            await apiGet(
              request,
              learner,
              `/courses/${courseId}/quizzes/${quizId}/attempts`
            )
          ).json();
          attemptId =
            (s.items as { id: string; status: string }[]).find(
              (a) => a.status === 'in_progress'
            )?.id ?? '';
          if (!attemptId) return 0;
          const session = await (
            await apiGet(
              request,
              learner,
              `/courses/${courseId}/quizzes/${quizId}/attempts/${attemptId}`
            )
          ).json();
          return (session.answers as unknown[]).length;
        },
        { timeout: 20_000 }
      )
      .toBe(1);

    // 10–11: leave full screen → gate (Arabic), answers kept; return.
    await page.waitForTimeout(5_500); // past the warm-up, so the exit counts
    await page.evaluate(() => document.exitFullscreen());
    await expect(page.getByTestId('quiz-fullscreen-gate')).toContainText(
      'عُد إلى ملء الشاشة'
    );
    await page.screenshot({ path: testInfo.outputPath('11-gate-ar.png') });
    // Out for a few seconds, as a real exit is (sub-2 s blips are not reported).
    await page.waitForTimeout(3_000);
    await page
      .getByTestId('quiz-fullscreen-gate')
      .getByRole('button')
      .first()
      .click();
    await expect
      .poll(() => page.evaluate(() => document.fullscreenElement !== null))
      .toBe(true);
    await expect(
      page.getByTestId('quiz-question-1').getByRole('radio', { checked: true })
    ).toHaveCount(1);

    // 12a: network interruption — change the answer offline, recover online.
    await context.setOffline(true);
    await page
      .getByTestId('quiz-question-1')
      .getByText('5', { exact: true })
      .click();
    await page.waitForTimeout(2_000);
    await context.setOffline(false);
    await page
      .getByTestId('quiz-question-1')
      .getByText('4', { exact: true })
      .click();
    await expect
      .poll(
        async () => {
          const session = await (
            await apiGet(
              request,
              learner,
              `/courses/${courseId}/quizzes/${quizId}/attempts/${attemptId}`
            )
          ).json();
          return JSON.stringify(session.answers);
        },
        { timeout: 30_000 }
      )
      .toContain('selectedOptionIds');

    // 12b: reload mid-attempt — the same attempt resumes with its answer.
    await page.reload();
    await expect(page.getByTestId('quiz-runner')).toBeVisible({
      timeout: 30_000,
    });
    // Full screen does not survive a reload: the gate asks for one click.
    await expect(page.getByTestId('quiz-fullscreen-gate')).toBeVisible();
    await page
      .getByTestId('quiz-fullscreen-gate')
      .getByRole('button')
      .first()
      .click();
    await expect(
      page.getByTestId('quiz-question-1').getByRole('radio', { checked: true })
    ).toHaveCount(1);

    // 13: submit; the result shows; full screen ends.
    const warning = page.getByRole('alertdialog');
    if (await warning.isVisible().catch(() => false))
      await warning.getByRole('button').first().click();
    await page.getByTestId('quiz-submit').click();
    await page.getByRole('alertdialog').getByRole('button').last().click();
    await expect(page.getByTestId('quiz-score')).toBeVisible({
      timeout: 30_000,
    });
    await expect
      .poll(() => page.evaluate(() => document.fullscreenElement !== null))
      .toBe(false);
    await page.screenshot({
      path: testInfo.outputPath('13-result-ar.png'),
      fullPage: true,
    });
    await context.close();
  });

  test('failure cases: repeated submit, invalid payload, tampering, stale session', async ({
    request,
  }) => {
    const base = `/courses/${courseId}/quizzes/${quizId}`;
    // A repeated submit is idempotent (a network retry must be safe): the
    // finished attempt comes back unchanged — the empty answers it carries
    // are not applied and nothing is re-graded.
    const before = await (
      await apiGet(request, learner, `${base}/attempts/${attemptId}/results`)
    ).json();
    const again = await apiPost(
      request,
      learner,
      `${base}/attempts/${attemptId}/submit`,
      { answers: [], revision: 99 }
    );
    expect(again.status(), await again.text()).toBe(201);
    const replay = await again.json();
    expect({
      status: replay.status,
      score: replay.score,
      submittedAt: replay.submittedAt,
    }).toEqual({
      status: before.status,
      score: before.score,
      submittedAt: before.submittedAt,
    });
    const after = await (
      await apiGet(request, learner, `${base}/attempts/${attemptId}/results`)
    ).json();
    expect(after.score).toBe(before.score);
    // Invalid event payload.
    const invalid = await apiPost(
      request,
      learner,
      `${base}/attempts/${attemptId}/events`,
      { events: [{ type: 'teleport' }] }
    );
    expect(invalid.status()).toBe(400);
    // The learner cannot change the quiz's rules, nor read the review.
    const tamper = await request.patch(`${API_BASE}${base}`, {
      headers: { Authorization: `Bearer ${learner.accessToken}` },
      data: { requireFullscreen: false, integrityMode: 'off' },
    });
    expect([403, 404]).toContain(tamper.status());
    const review = await apiGet(
      request,
      learner,
      `/review${base}/attempts/${attemptId}`
    );
    expect([403, 404]).toContain(review.status());
    const still = await (
      await apiGet(request, owner, `${base}/authoring`)
    ).json();
    expect(still.settings ?? still).toMatchObject({
      integrityMode: 'warn',
      requireFullscreen: true,
    });
    // A stale/invalid session is refused.
    const stale = await request.get(`${API_BASE}${base}/attempts`, {
      headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.invalid' },
    });
    expect(stale.status()).toBe(401);
  });

  test('14: the Instructor and the Manager review an auditable integrity report', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(150_000);
    const review = await (
      await apiGet(
        request,
        instructor,
        `/review/courses/${courseId}/quizzes/${quizId}/attempts/${attemptId}`
      )
    ).json();
    expect(review.requireFullscreen).toBe(true);
    expect(review.integrityMode).toBe('warn');
    expect(
      (review.signals as { key: string }[]).map((s) => s.key),
      JSON.stringify({
        mode: review.integrityMode,
        events: review.events,
        signals: review.signals,
      }).slice(0, 3000)
    ).toContain('fullscreen_left');
    expect((review.events as { type: string }[]).map((e) => e.type)).toEqual(
      expect.arrayContaining(['fullscreen_enter', 'fullscreen_exit'])
    );
    const asManager = await apiGet(
      request,
      manager,
      `/review/courses/${courseId}/quizzes/${quizId}/attempts/${attemptId}`
    );
    expect(asManager.status()).toBe(200);

    const context = await browser.newContext();
    const page = await context.newPage();
    await seedCookieDecision(page);
    await signInThroughDashboard(page, SEED.instructor, SEED.password);
    await page.waitForURL(/dashboard/, { timeout: 30_000 });
    await page.goto(
      `/dashboard/instructor/courses/${courseId}/quizzes/${quizId}/attempts/${attemptId}`
    );
    await expect(page.getByTestId('integrity-policy')).toContainText(
      'warn mode',
      { timeout: 30_000 }
    );
    await expect(page.getByTestId('integrity-policy')).toContainText(
      'Full screen was required.'
    );
    const left = page.getByTestId('integrity-signal-fullscreen_left');
    await expect(left).toBeVisible();
    await left.getByRole('button', { name: 'Show in timeline' }).click();
    await expect(page.locator('[data-highlighted]').first()).toBeVisible();
    // No untranslated keys anywhere on the review (the grading status once
    // printed `quizResults.gradingStatus.not_required`: the API's enum value
    // had no label).
    await expect(page.getByText('Automatic', { exact: true })).toBeVisible();
    expect(await page.locator('main').innerText()).not.toMatch(
      /\b(instructor|learning|common):|\b(quizResults|attemptReview|signals|events)\.[a-zA-Z_]/
    );
    await page.screenshot({
      path: testInfo.outputPath('14-review.png'),
      fullPage: true,
    });
    await context.close();
  });

  test('15: another organization cannot read or change this exam, its attempts or its report', async ({
    request,
  }) => {
    const base = `/courses/${courseId}/quizzes/${quizId}`;
    for (const path of [
      `${base}/authoring`,
      `/review${base}/attempts/${attemptId}`,
      `${base}/attempts`,
    ]) {
      const response = await apiGet(request, otherOwner, path);
      expect([403, 404], `${path} → ${response.status()}`).toContain(
        response.status()
      );
      expect(await response.text()).not.toContain(learnerEmail);
    }
    const change = await request.patch(`${API_BASE}${base}`, {
      headers: { Authorization: `Bearer ${otherOwner.accessToken}` },
      data: { title: 'hijacked' },
    });
    expect([403, 404]).toContain(change.status());
    // And the instructor cannot author in a course they are not assigned to.
    const foreign = await findCourseByTitle(
      request,
      owner,
      academyId,
      SEED.foreignCourseTitle
    );
    // A valid quiz, so it is the permission that answers, not validation.
    const refused = await apiPost(
      request,
      instructor,
      `/courses/${foreign.id}/quizzes`,
      {
        title: 'not mine',
        status: 'draft',
        questions: [
          {
            prompt: 'x?',
            type: 'single_choice',
            points: 1,
            options: [
              { label: 'a', isCorrect: true },
              { label: 'b', isCorrect: false },
            ],
          },
        ],
      }
    );
    expect([403, 404]).toContain(refused.status());
  });
});
