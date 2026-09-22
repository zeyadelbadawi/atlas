/**
 * J1 — Assessment and certificate (P64 Phase 3 master plan §P).
 *
 * One learner, one freshly authored course, driven end to end against
 * the REAL stack (Vite on :3001 → Nest on the port `E2E_API_BASE_URL`
 * names → PostgreSQL, Redis and the S3-compatible store), with the
 * Phase 3 flags on for the backend under test:
 *
 *   FLAG_QUIZ_ENGINE_V2_MODE=on FLAG_QUIZ_INTEGRITY_MODE=on
 *   FLAG_CERTIFICATES_MODE=on FLAG_LEARNER_DASHBOARD_V2_MODE=on
 *   FLAG_PLAYER_V2_MODE=on
 *
 * and the Vite proxy presenting the academy host
 * (`VITE_DEV_PROXY_HOST=web-development-academy.atlass.dpdns.org`) so the
 * host-resolved learner endpoints answer on localhost.
 *
 * The journey the plan names, in order: timed quiz with autosave →
 * reload resumes → timer expiry auto-submits → results → assignment
 * draft → submit → manager grades → feedback visible → required rules
 * met → completion screen → certificate appears → download works →
 * `/verify/:code` valid → revoke → verification shows revoked → retake
 * with a higher score → certificate score unchanged.
 *
 * Fixture authoring (course, quiz, assignment, completion rule) goes
 * through the owner's API session — that IS the owner authoring it, not
 * a mock — and everything the learner does that the plan describes as a
 * screen is done on the screen.
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
  declineCookies,
  registerLearnerThroughWebsite,
  requireSeed,
  uniqueLearnerEmail,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';

test.describe.configure({ mode: 'serial' });

/** The quiz's time limit. The minimum the server accepts, so expiry is observable. */
const TIME_LIMIT_SECONDS = 60;

async function apiPut(
  request: Parameters<typeof apiPost>[0],
  session: Session,
  path: string,
  data?: unknown
) {
  return request.put(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    data: data ?? {},
  });
}

async function signInOnWebsite(page: Page, email: string): Promise<void> {
  await page.goto(academyPath('/sign-in'));
  await declineCookies(page);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(LEARNER_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/my/, { timeout: 30_000 });
}

test.describe('J1 — assessment and certificate', () => {
  let academyId: string;
  let owner: Session;
  let manager: Session;
  let learner: Session;
  let learnerEmail: string;
  let courseId: string;
  let quizId: string;
  let assignmentId: string;
  /** The correct option id per question — the owner authored them, so the test knows. */
  let correctOptionByQuestion: Record<string, string>;
  let firstAttemptId: string;
  let certificateId: string;
  let verificationCode: string;

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser, request }) => {
    // Fixture authoring plus a real website sign-up: more than one minute
    // on a cold Vite dev server.
    test.setTimeout(180_000);
    await clearAuthRateLimits();
    ({ academyId, owner } = await requireSeed(request));
    manager = await apiSignIn(request, {
      email: SEED.manager,
      password: SEED.password,
      surface: 'management',
    });

    /* ---------- the owner authors the course ---------- */

    const stamp = `${Date.now()}`;
    const created = await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses`,
      {
        title: `J1 Timed Course ${stamp}`,
        slug: `j1-timed-course-${stamp}`,
        shortDescription: 'Playwright journey J1.',
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
      { title: 'Assessment' }
    );
    expect(section.status(), await section.text()).toBe(201);
    const sectionId = (await section.json()).id;

    const quiz = await apiPost(request, owner, `/courses/${courseId}/quizzes`, {
      title: 'Timed quiz',
      description: 'Two questions, one minute.',
      status: 'published',
      passingScore: 50,
      maxAttempts: 3,
      timeLimitSeconds: TIME_LIMIT_SECONDS,
      gradingPolicy: 'highest',
      showScore: 'immediately',
      showAnswers: 'immediately',
      showExplanations: true,
      integrityMode: 'warn',
      maxViolations: 3,
      layout: 'all_questions',
      requiredForCompletion: true,
      questions: [
        {
          prompt: 'What is 2 + 2?',
          type: 'single_choice',
          points: 1,
          explanation: 'Two and two make four.',
          options: [
            { label: '4', isCorrect: true },
            { label: '5', isCorrect: false },
          ],
        },
        {
          prompt: 'What is 3 + 3?',
          type: 'single_choice',
          points: 1,
          options: [
            { label: '6', isCorrect: true },
            { label: '7', isCorrect: false },
          ],
        },
      ],
    });
    expect(quiz.status(), await quiz.text()).toBe(201);
    const quizBody = await quiz.json();
    quizId = quizBody.id;
    correctOptionByQuestion = {};
    for (const question of quizBody.questions as {
      id: string;
      options: { id: string; isCorrect: boolean }[];
    }[]) {
      correctOptionByQuestion[question.id] = question.options.find(
        (o) => o.isCorrect
      )!.id;
    }

    const assignment = await apiPost(
      request,
      owner,
      `/courses/${courseId}/assignments`,
      {
        title: 'Reflection',
        instructions: 'Write two sentences about what you learned.',
        status: 'published',
        allowResubmission: false,
        latePolicy: 'accept_flagged',
        requiredForCompletion: true,
      }
    );
    expect(assignment.status(), await assignment.text()).toBe(201);
    assignmentId = (await assignment.json()).id;

    for (const [type, itemId] of [
      ['quiz', quizId],
      ['assignment', assignmentId],
    ] as const) {
      const attached = await apiPost(
        request,
        owner,
        `/academies/${academyId}/courses/${courseId}/sections/${sectionId}/items/attach`,
        { type, itemId }
      );
      expect(attached.status(), await attached.text()).toBeLessThan(300);
    }

    const rule = await apiPut(
      request,
      owner,
      `/academies/${academyId}/courses/${courseId}/completion-rule`,
      {
        lessons: 'none',
        requiredQuizzes: true,
        requiredAssignments: true,
        certificatesEnabled: true,
      }
    );
    expect(rule.status(), await rule.text()).toBe(200);
    expect(
      (await rule.json()).certificatesFeatureEnabled,
      'FLAG_CERTIFICATES must be on'
    ).toBe(true);

    const published = await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses/${courseId}/publish`
    );
    expect(published.status(), await published.text()).toBeLessThan(300);

    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('a learner registers on the academy website and is enrolled', async ({
    request,
  }) => {
    learnerEmail = uniqueLearnerEmail('j1');
    await registerLearnerThroughWebsite(page, learnerEmail, 'J1 Learner');
    await expect(
      page.getByText(/check your (email|inbox)|account created|verify/i).first()
    ).toBeVisible({ timeout: 20_000 });

    learner = await apiSignIn(request, {
      email: learnerEmail,
      password: LEARNER_PASSWORD,
      surface: 'academy',
      academyId,
    });
    const enrolled = await apiPost(
      request,
      owner,
      `/academies/${academyId}/students/${learner.userId}/enrollments`,
      { courseId }
    );
    expect(enrolled.status(), await enrolled.text()).toBeLessThan(300);
  });

  test('the timed quiz autosaves, survives a reload, and expiry submits it automatically', async ({
    request,
  }) => {
    test.setTimeout(240_000);

    await signInOnWebsite(page, learnerEmail);
    await page.goto(
      academyPath(`/my/courses/${courseId}/activities/${quizId}`)
    );

    // Intro: the time limit is disclosed and integrity is acknowledged before Start enables.
    await expect(page.getByText(/1:00/)).toBeVisible({ timeout: 30_000 });
    await page.getByLabel(/I understand what is recorded/i).check();
    await page.getByTestId('quiz-start').click();

    await expect(page.getByTestId('quiz-runner')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('quiz-countdown')).toBeVisible();

    // Answer BOTH questions correctly on screen; the quiz will be
    // auto-submitted at expiry with these saved answers (score 100).
    const q1 = page.getByTestId('quiz-question-1');
    await q1.getByText('4', { exact: true }).click();
    await expect(page.getByTestId('quiz-save-state')).toContainText(
      /saved just now/i,
      {
        timeout: 15_000,
      }
    );
    const q2 = page.getByTestId('quiz-question-2');
    await q2.getByText('6', { exact: true }).click();
    await expect(page.getByTestId('quiz-save-state')).toContainText(
      /saved just now/i,
      {
        timeout: 15_000,
      }
    );
    await expect(page.getByTestId('quiz-answered')).toContainText('2 of 2');

    // The server confirms what was saved.
    const attempts = await apiGet(
      request,
      learner,
      `/courses/${courseId}/quizzes/${quizId}/attempts`
    );
    const open = (
      (await attempts.json()).items as { id: string; status: string }[]
    ).find((a) => a.status === 'in_progress');
    expect(open, 'an open attempt exists').toBeTruthy();
    firstAttemptId = open!.id;
    const session = await apiGet(
      request,
      learner,
      `/courses/${courseId}/quizzes/${quizId}/attempts/${firstAttemptId}`
    );
    const sessionBody = await session.json();
    expect(sessionBody.answers).toHaveLength(2);
    expect(sessionBody.remainingSeconds).toBeLessThanOrEqual(
      TIME_LIMIT_SECONDS
    );

    // Reload: the same attempt resumes with both answers and a countdown
    // derived from the server, not restarted.
    await page.reload();
    await expect(page.getByTestId('quiz-runner')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('quiz-answered')).toContainText('2 of 2');
    await expect(
      page.getByTestId('quiz-question-1').getByRole('radio', { checked: true })
    ).toHaveCount(1);

    // Expiry: the results appear with the plan's exact sentence, and the
    // attempt is recorded as auto-submitted for reason "timeout".
    await expect(page.getByTestId('auto-submit-notice')).toBeVisible({
      timeout: (TIME_LIMIT_SECONDS + 90) * 1000,
    });
    await expect(page.getByTestId('auto-submit-notice')).toContainText(
      'Time ran out. Your answers were submitted automatically.'
    );
    await expect(page.getByTestId('quiz-score')).toContainText('100%');

    const results = await apiGet(
      request,
      learner,
      `/courses/${courseId}/quizzes/${quizId}/attempts/${firstAttemptId}/results`
    );
    const resultsBody = await results.json();
    expect(resultsBody.autoSubmitted).toBe(true);
    expect(resultsBody.autoSubmittedReason).toBe('timeout');
    expect(resultsBody.passed).toBe(true);

    // A save after the deadline is refused with the specific reason, never a 500.
    const late = await apiPut(
      request,
      learner,
      `/courses/${courseId}/quizzes/${quizId}/attempts/${firstAttemptId}/answers`,
      { revision: 99, answers: [] }
    );
    expect([409, 410, 400]).toContain(late.status());
    expect(await late.text()).toContain('errors.quiz.attempt');
  });

  test('the assignment draft autosaves, submits, and shows the grade the manager enters', async ({
    request,
  }) => {
    test.setTimeout(120_000);
    await page.goto(
      academyPath(`/my/courses/${courseId}/activities/${assignmentId}`)
    );
    await expect(page.getByTestId('assignment-form')).toBeVisible({
      timeout: 30_000,
    });

    const textarea = page.locator('#assignment-response');
    await textarea.fill(
      'I learned that two and two make four, and that the clock is the server.'
    );
    await expect(page.getByText(/draft saved/i)).toBeVisible({
      timeout: 15_000,
    });

    // Reload: the draft came back from the server.
    await page.reload();
    await expect(page.locator('#assignment-response')).toHaveValue(
      /two and two/i,
      {
        timeout: 30_000,
      }
    );

    await page.getByTestId('assignment-submit').click();
    await page.getByRole('button', { name: /^submit assignment$/i }).click();
    await expect(page.getByTestId('assignment-submitted')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(/waiting for a reviewer/i)).toBeVisible();

    // The manager grades it (Phase 1 RBAC: owner and manager may grade).
    const submissions = await apiGet(
      request,
      manager,
      `/review/courses/${courseId}/assignments/${assignmentId}/submissions`
    );
    const mine = (
      (await submissions.json()).items as { id: string; studentId: string }[]
    ).find((s) => s.studentId === learner.userId);
    expect(mine).toBeTruthy();
    const graded = await apiPost(
      request,
      manager,
      `/review/courses/${courseId}/assignments/${assignmentId}/submissions/${mine!.id}/grade`,
      { score: 88, feedback: 'Clear and correct.' }
    );
    expect(graded.status(), await graded.text()).toBeLessThan(300);

    await page.reload();
    await expect(page.getByTestId('assignment-grade')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('assignment-grade')).toContainText('88');
    await expect(page.getByTestId('assignment-grade')).toContainText(
      'Clear and correct.'
    );
  });

  test('the completion screen reports the course complete and a certificate is issued', async ({
    request,
  }) => {
    test.setTimeout(120_000);

    // Issuance runs on the queue after the evaluator flips completion; poll the learner's own view.
    await expect
      .poll(
        async () => {
          const completion = await apiGet(
            request,
            learner,
            `/learning/courses/${courseId}/completion`
          );
          const body = await completion.json();
          return `${body.completed}:${body.certificate.status}`;
        },
        { timeout: 60_000, intervals: [1_000, 2_000, 3_000] }
      )
      .toBe('true:issued');

    await page.goto(academyPath(`/my/courses/${courseId}`));
    const card = page.getByTestId('course-completion');
    await expect(card).toBeVisible({ timeout: 30_000 });
    await expect(card).toContainText(/completed/i);
    await expect(card.getByTestId('completion-certificate')).toContainText(
      /certificate/i
    );
  });

  test('the certificate is listed, downloads through a signed link, and verifies on both hosts', async ({
    request,
  }) => {
    test.setTimeout(120_000);

    // The PDF is rendered by a queue job; wait for it rather than for a fixed time.
    await expect
      .poll(
        async () => {
          // Straight at the API, localhost is not an academy host: name it.
          const list = await apiGet(
            request,
            learner,
            `/learning/certificates`,
            {
              academyId,
            }
          );
          const body = await list.json();
          const item = body.items?.[0];
          if (item) {
            certificateId = item.id;
            verificationCode = item.verificationCode;
          }
          return item?.renderStatus ?? 'none';
        },
        { timeout: 90_000, intervals: [2_000, 3_000, 5_000] }
      )
      .toBe('ready');

    await page.goto(academyPath('/my/certificates'));
    await expect(page.getByText(/J1 Timed Course/)).toBeVisible({
      timeout: 30_000,
    });
    await expect(
      page.getByRole('button', { name: /download pdf/i }).first()
    ).toBeVisible();

    // The download is a fresh, short-lived signed link that really serves a PDF.
    const download = await apiGet(
      request,
      learner,
      `/learning/certificates/${certificateId}/download`
    );
    expect(download.status(), await download.text()).toBe(200);
    const link = await download.json();
    expect(Date.parse(link.expiresAt) - Date.now()).toBeLessThanOrEqual(
      3_600_000
    );
    const pdf = await request.get(link.url);
    expect(pdf.status()).toBe(200);
    expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');

    // Public verification: academy host and platform host, no session.
    for (const path of [
      academyPath(`/verify/${verificationCode}`),
      `/verify/${verificationCode}`,
    ]) {
      await page.goto(path);
      const sheet = page.getByTestId('certificate-verify-valid');
      await expect(sheet).toBeVisible({ timeout: 30_000 });
      await expect(sheet.getByText('J1 Learner')).toBeVisible();
      await expect(sheet.getByText(SEED.academyName)).toBeVisible();
    }
    const verify = await request.get(`${API_BASE}/verify/${verificationCode}`);
    expect((await verify.json()).valid).toBe(true);
    const unknown = await request.get(`${API_BASE}/verify/ZZZZZZZZZZZZ`);
    expect(await unknown.json()).toEqual({ valid: false });
  });

  test('revocation is reflected on verification, and a higher retake never touches the certificate', async ({
    request,
  }) => {
    test.setTimeout(120_000);

    // Owner revokes.
    const revoked = await apiPost(
      request,
      owner,
      `/academies/${academyId}/certificates/${certificateId}/revoke`,
      { reason: 'J1 revocation check' }
    );
    expect(revoked.status(), await revoked.text()).toBe(200);
    await page.goto(academyPath(`/verify/${verificationCode}`));
    await expect(page.getByText(/revoked/i).first()).toBeVisible({
      timeout: 30_000,
    });

    // An instructor may not revoke, regenerate or issue (403, never 500).
    const instructor = await apiSignIn(request, {
      email: SEED.instructor,
      password: SEED.password,
      surface: 'management',
    });
    const refused = await apiPost(
      request,
      instructor,
      `/academies/${academyId}/certificates/${certificateId}/regenerate`,
      {}
    );
    expect(refused.status()).toBe(403);

    // Retake with a (necessarily equal-or-)higher score: the certificate's
    // stored score and version are unchanged (D7).
    const before = await (
      await apiGet(
        request,
        owner,
        `/academies/${academyId}/certificates/${certificateId}`
      )
    ).json();
    const started = await apiPost(
      request,
      learner,
      `/courses/${courseId}/quizzes/${quizId}/attempts`
    );
    expect(started.status(), await started.text()).toBe(201);
    const attempt = await started.json();
    const answers = Object.entries(correctOptionByQuestion).map(
      ([questionId, optionId]) => ({
        questionId,
        selectedOptionIds: [optionId],
      })
    );
    const submitted = await apiPost(
      request,
      learner,
      `/courses/${courseId}/quizzes/${quizId}/attempts/${attempt.id}/submit`,
      { answers }
    );
    expect(submitted.status(), await submitted.text()).toBe(201);
    expect((await submitted.json()).score).toBe(100);

    const after = await (
      await apiGet(
        request,
        owner,
        `/academies/${academyId}/certificates/${certificateId}`
      )
    ).json();
    expect(after.version).toBe(before.version);
    expect(after.overallScore).toBe(before.overallScore);
    expect(after.serial).toBe(before.serial);
    expect(after.status).toBe('revoked');
  });
});
