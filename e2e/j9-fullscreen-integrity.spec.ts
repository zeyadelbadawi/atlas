/**
 * J9 — full-screen exams and explainable integrity signals (P4, P5),
 * against the real stack (Vite → Nest → PostgreSQL/Redis), Chromium.
 *
 * What is REAL here: the Start click putting the document in full screen
 * (the browser grants it only inside that gesture), leaving full screen
 * through the browser's own API, the gate, re-entering from its button, a
 * real Ctrl+V paste of text from the system clipboard, and the server's
 * signals read back through the reviewer API.
 *
 * What is EMULATED, and why:
 * - "Unsupported" and "refused" full screen: an init script removes or
 *   refuses the Fullscreen API, as on iPhone Safari or in a frame without
 *   `allowfullscreen`.
 * - A tab switch: automated Chromium in this sandbox (headless, or headed
 *   under Xvfb with no window manager) never changes page visibility, so
 *   the test dispatches the `visibilitychange` the browser would fire. It
 *   verifies listener → server → signal, not the browser's own event; the
 *   manual test plan covers a real tab switch.
 */
import {
  test,
  expect,
  type APIRequestContext,
  type Browser,
  type Page,
} from '@playwright/test';
import {
  LEARNER_PASSWORD,
  academyPath,
  apiGet,
  apiPost,
  apiSignIn,
  declineCookies,
  registerLearnerThroughWebsite,
  requireSeed,
  seedCookieDecision,
  uniqueLearnerEmail,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';

test.describe.configure({ mode: 'serial' });

interface Signal {
  key: string;
  level: 'review' | 'info';
  occurrences: number;
  reasons?: string[];
  eventIds: string[];
}

const QUIZ = (title: string) => ({
  title,
  description: 'Full-screen exam (J9).',
  status: 'published',
  passingScore: 50,
  maxAttempts: 2,
  gradingPolicy: 'highest',
  showScore: 'immediately',
  showAnswers: 'never',
  integrityMode: 'warn',
  maxViolations: 10,
  requireFullscreen: true,
  layout: 'all_questions',
  questions: [
    {
      prompt: 'Name the capital of France.',
      type: 'short_answer',
      points: 1,
      acceptedAnswers: ['Paris'],
    },
    {
      prompt: 'What is 2 + 2?',
      type: 'single_choice',
      points: 1,
      options: [
        { label: '4', isCorrect: true },
        { label: '5', isCorrect: false },
      ],
    },
  ],
});

test.describe('J9 — full-screen exam and integrity signals', () => {
  let academyId: string;
  let owner: Session;
  let learnerEmail: string;
  let courseId: string;
  const quizIds: Record<'main' | 'unsupported' | 'refused', string> = {
    main: '',
    unsupported: '',
    refused: '',
  };

  async function reviewOf(request: APIRequestContext, quizId: string) {
    const learner = await apiSignIn(request, {
      email: learnerEmail,
      password: LEARNER_PASSWORD,
      surface: 'academy',
      academyId,
    });
    const attempts = await apiGet(
      request,
      learner,
      `/courses/${courseId}/quizzes/${quizId}/attempts`
    );
    const [attempt] = (await attempts.json()).items as { id: string }[];
    const review = await apiGet(
      request,
      owner,
      `/review/courses/${courseId}/quizzes/${quizId}/attempts/${attempt.id}`
    );
    expect(review.status(), await review.text()).toBe(200);
    return (await review.json()) as {
      requireFullscreen: boolean;
      signals: Signal[];
      events: { id: string; type: string; payload: unknown }[];
    };
  }

  async function openQuiz(
    browser: Browser,
    quizId: string,
    initScript?: () => void
  ): Promise<Page> {
    const context = await browser.newContext();
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: new URL(process.env.E2E_BASE_URL ?? 'http://localhost:3001').origin,
    });
    if (initScript) await context.addInitScript(initScript);
    const page = await context.newPage();
    await seedCookieDecision(page);
    await page.goto(academyPath('/sign-in'));
    await declineCookies(page);
    await page.locator('input[type="email"]').fill(learnerEmail);
    await page.locator('input[type="password"]').fill(LEARNER_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/my/, { timeout: 30_000 });
    await page.goto(academyPath(`/my/courses/${courseId}/activities/${quizId}`));
    await expect(
      page.getByText(/opens in full screen when you press Start/)
    ).toBeVisible({ timeout: 30_000 });
    await page.getByLabel(/I understand what is recorded/i).check();
    return page;
  }

  const inFullscreen = (page: Page) =>
    page.evaluate(() => document.fullscreenElement !== null);

  test.beforeAll(async ({ browser, request }) => {
    test.setTimeout(180_000);
    await clearAuthRateLimits();
    ({ academyId, owner } = await requireSeed(request));
    const stamp = `${Date.now()}`;
    const created = await apiPost(request, owner, `/academies/${academyId}/courses`, {
      title: `J9 Exam Course ${stamp}`,
      slug: `j9-exam-course-${stamp}`,
      shortDescription: 'Playwright journey J9.',
      pricing: { type: 'free' },
      visibility: 'public',
    });
    expect(created.status(), await created.text()).toBe(201);
    courseId = (await created.json()).id;
    const section = await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses/${courseId}/sections`,
      { title: 'Exams' }
    );
    const sectionId = (await section.json()).id;
    for (const key of Object.keys(quizIds) as (keyof typeof quizIds)[]) {
      const quiz = await apiPost(
        request,
        owner,
        `/courses/${courseId}/quizzes`,
        QUIZ(`J9 ${key}`)
      );
      expect(quiz.status(), await quiz.text()).toBe(201);
      quizIds[key] = (await quiz.json()).id;
      const attached = await apiPost(
        request,
        owner,
        `/academies/${academyId}/courses/${courseId}/sections/${sectionId}/items/attach`,
        { type: 'quiz', itemId: quizIds[key] }
      );
      expect(attached.status(), await attached.text()).toBeLessThan(300);
    }
    const published = await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses/${courseId}/publish`
    );
    expect(published.status(), await published.text()).toBeLessThan(300);

    learnerEmail = uniqueLearnerEmail('j9');
    const page = await browser.newPage();
    await registerLearnerThroughWebsite(page, learnerEmail, 'J9 Learner');
    await expect(
      page.getByText(/check your (email|inbox)|account created|your account is ready|verify/i).first()
    ).toBeVisible({ timeout: 20_000 });
    await page.close();
    const learner = await apiSignIn(request, {
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

  test('Start enters full screen; leaving hides the questions behind a gate; returning restores them; signals reach the reviewer', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(180_000);
    const page = await openQuiz(browser, quizIds.main);

    await page.getByTestId('quiz-start').click();
    await expect(page.getByTestId('quiz-runner')).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => inFullscreen(page)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('1-running-fullscreen.png') });

    // Answer the choice question, then wait out the 5 s warm-up so an
    // exit can count.
    await page.getByTestId('quiz-question-2').getByText('4', { exact: true }).click();
    await page.waitForTimeout(6_000);

    // Leave full screen through the browser's API (what Esc does).
    await page.evaluate(() => document.exitFullscreen());
    await expect(page.getByTestId('quiz-fullscreen-gate')).toBeVisible();
    await expect(page.getByTestId('quiz-fullscreen-gate')).toBeFocused();
    await expect(page.getByTestId('quiz-fullscreen-gate')).toBeInViewport();
    await expect(page.getByTestId('quiz-question-1')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('2-gate.png') });

    // The answer survived; returning is one click (a real gesture).
    await page.waitForTimeout(3_000);
    await page.getByRole('button', { name: 'Enter full screen' }).click();
    await expect.poll(() => inFullscreen(page)).toBe(true);
    await expect(page.getByTestId('quiz-fullscreen-gate')).toHaveCount(0);
    await expect(
      page.getByTestId('quiz-question-2').getByRole('radio', { checked: true })
    ).toHaveCount(1);

    // A real paste of text copied outside the quiz.
    await page.evaluate(() => navigator.clipboard.writeText('Paris'));
    await page.getByTestId('quiz-question-1').getByRole('textbox').click();
    await page.keyboard.press('Control+V');
    await expect(page.getByTestId('quiz-question-1').getByRole('textbox')).toHaveValue('Paris');

    // Emulated tab switch (see the file header): 2.5 s away.
    await page.evaluate(async () => {
      const set = (state: string) => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
        document.dispatchEvent(new Event('visibilitychange'));
      };
      set('hidden');
      await new Promise((resolve) => setTimeout(resolve, 2_500));
      set('visible');
    });

    // Warn mode: from the second counted event, the acknowledged dialog —
    // visible WHILE in full screen (the document is the full-screen
    // element, so portaled dialogs show; the old container target hid them).
    const warning = page.getByRole('alertdialog');
    await expect(warning).toContainText('recorded on this attempt', { timeout: 15_000 });
    expect(await inFullscreen(page)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('3-warning-in-fullscreen.png') });
    await warning.getByRole('button', { name: 'Continue quiz' }).click();

    await page.getByTestId('quiz-submit').click();
    await page.getByRole('alertdialog').getByRole('button', { name: /submit/i }).click();
    await expect(page.getByTestId('quiz-score')).toBeVisible({ timeout: 30_000 });
    // Results give the screen back.
    await expect.poll(() => inFullscreen(page)).toBe(false);
    await page.close();

    const review = await reviewOf(request, quizIds.main);
    expect(review.requireFullscreen).toBe(true);
    const types = review.events.map((e) => e.type);
    expect(types).toEqual(expect.arrayContaining(['fullscreen_enter', 'fullscreen_exit', 'paste', 'visibility_hidden']));
    const byKey = Object.fromEntries(review.signals.map((s) => [s.key, s]));
    expect(byKey.fullscreen_left).toMatchObject({ occurrences: 1 });
    expect(byKey.paste_without_copy).toMatchObject({ level: 'review', occurrences: 1 });
    expect(byKey.time_away).toMatchObject({ occurrences: 1 });
    testInfo.annotations.push({ type: 'signals', description: JSON.stringify(review.signals) });
  });

  test('unsupported browser (emulated): a notice, no gate; the reviewer sees "unavailable: unsupported"', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(120_000);
    const page = await openQuiz(browser, quizIds.unsupported, () => {
      Object.defineProperty(Document.prototype, 'fullscreenEnabled', { get: () => false });
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId('quiz-start').click();
    await expect(page.getByTestId('quiz-runner')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('quiz-fullscreen-unsupported')).toBeVisible();
    await expect(page.getByTestId('quiz-fullscreen-gate')).toHaveCount(0);
    await expect(page.getByTestId('quiz-question-1')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('unsupported-390.png'), fullPage: true });
    // Phones show one question per page.
    await page.getByRole('button', { name: 'Next' }).first().click();
    await page.getByTestId('quiz-question-2').getByText('4', { exact: true }).click();
    await page.getByTestId('quiz-submit').click();
    await page.getByRole('alertdialog').getByRole('button', { name: /submit/i }).click();
    await expect(page.getByTestId('quiz-score')).toBeVisible({ timeout: 30_000 });
    await page.close();

    const review = await reviewOf(request, quizIds.unsupported);
    const unavailable = review.signals.find((s) => s.key === 'fullscreen_unavailable');
    expect(unavailable).toMatchObject({ level: 'info', reasons: ['unsupported'] });
    expect(review.signals.find((s) => s.key === 'fullscreen_never_entered')).toBeUndefined();
  });

  test('refused (emulated): the gate offers to continue without full screen; the reviewer sees "unavailable: refused"', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(120_000);
    const page = await openQuiz(browser, quizIds.refused, () => {
      Element.prototype.requestFullscreen = () =>
        Promise.reject(new TypeError('Permissions check failed'));
    });
    await page.getByTestId('quiz-start').click();
    await expect(page.getByTestId('quiz-fullscreen-gate')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('status').filter({ hasText: 'didn’t allow full screen' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('refused-gate.png') });
    await page.getByRole('button', { name: 'Continue without full screen' }).click();
    await expect(page.getByTestId('quiz-question-1')).toBeVisible();
    await page.getByTestId('quiz-question-2').getByText('4', { exact: true }).click();
    await page.getByTestId('quiz-submit').click();
    await page.getByRole('alertdialog').getByRole('button', { name: /submit/i }).click();
    await expect(page.getByTestId('quiz-score')).toBeVisible({ timeout: 30_000 });
    await page.close();

    const review = await reviewOf(request, quizIds.refused);
    expect(review.signals.find((s) => s.key === 'fullscreen_unavailable')).toMatchObject({
      reasons: ['refused'],
    });
  });
});
