/**
 * J15 — progress for courses that are not (only) lessons (2 Oct 2026),
 * Chromium against the real stack and database.
 *
 * A course made only of quizzes used to read "0 of 0 lessons" forever and
 * never completed: progress counted lessons alone. Progress now counts
 * every activity — published lessons, published quizzes and assignments —
 * and a quiz-only course with nothing marked required completes when all
 * of its published quizzes are passed. Here:
 *
 *   a quiz-only course (two published quizzes, no lessons) and a mixed
 *   course (one published lesson + one quiz) are authored by the Owner;
 *   a learner registered through the website is enrolled in both →
 *   My Learning reads "0 of 2 activities completed" for each, in English
 *   and in Arabic (RTL) → the learner passes one quiz (API), reload →
 *   "1 of 2" → passes the second ON SCREEN → "2 of 2" and Completed →
 *   the public Theme 1 details page names the quizzes (title line,
 *   "This course includes" and the "Course content" block) and never
 *   offers "0 lessons" anywhere on the page.
 *
 * Nothing in the shared seed is changed: both courses are this journey's
 * own and are left in place.
 */
import {
  test,
  expect,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import {
  LEARNER_PASSWORD,
  academyPath,
  apiGet,
  apiPost,
  apiSignIn,
  registerLearnerThroughWebsite,
  requireSeed,
  seedCookieDecision,
  uniqueLearnerEmail,
  type Session,
  uniqueLearnerName,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import { signInOnWebsite } from './support/phase4';

test.describe.configure({ mode: 'serial' });

const CORRECT = 'Correct answer';
const WRONG = 'Wrong answer';

interface Progress {
  totalLessons: number;
  completedLessons: number;
  totalItems: number;
  completedItems: number;
  completionState: string;
}

test.describe('J15 — quiz-only and mixed course progress (EN and AR)', () => {
  let academyId: string;
  let owner: Session;
  let learner: Session;
  let learnerEmail: string;
  const stamp = `${Date.now()}`;
  const quizOnlyTitle = `J15 Quiz-only Course ${stamp}`;
  const mixedTitle = `J15 Mixed Course ${stamp}`;
  let quizOnlyId: string;
  let mixedId: string;
  let quizIds: string[] = [];

  let context: BrowserContext;
  let page: Page;

  async function createCourse(
    request: APIRequestContext,
    title: string
  ): Promise<{ courseId: string; sectionId: string }> {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const created = await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses`,
      {
        title,
        slug,
        shortDescription: 'Playwright journey J15.',
        pricing: { type: 'free' },
        visibility: 'public',
      }
    );
    expect(created.status(), await created.text()).toBe(201);
    const courseId: string = (await created.json()).id;
    const section = await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses/${courseId}/sections`,
      { title: 'Activities' }
    );
    expect(section.status(), await section.text()).toBe(201);
    return { courseId, sectionId: (await section.json()).id };
  }

  /** A published quiz with ONE single-choice question, placed in the section. */
  async function addQuiz(
    request: APIRequestContext,
    courseId: string,
    sectionId: string,
    title: string
  ): Promise<string> {
    const created = await apiPost(
      request,
      owner,
      `/courses/${courseId}/quizzes`,
      {
        title,
        status: 'published',
        questions: [
          {
            prompt: `${title}: pick the correct answer.`,
            type: 'single_choice',
            points: 1,
            options: [
              { label: CORRECT, isCorrect: true },
              { label: WRONG, isCorrect: false },
            ],
          },
        ],
      }
    );
    expect(created.status(), await created.text()).toBe(201);
    const quizId: string = (await created.json()).id;
    const attached = await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses/${courseId}/sections/${sectionId}/items/attach`,
      { type: 'quiz', itemId: quizId }
    );
    expect(attached.status(), await attached.text()).toBeLessThan(300);
    return quizId;
  }

  async function publish(request: APIRequestContext, courseId: string) {
    const published = await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses/${courseId}/publish`
    );
    expect(published.status(), await published.text()).toBeLessThan(300);
  }

  async function progressOf(
    request: APIRequestContext,
    courseId: string
  ): Promise<Progress> {
    const response = await apiGet(
      request,
      learner,
      `/courses/${courseId}/progress`
    );
    expect(response.status(), await response.text()).toBe(200);
    return response.json();
  }

  /** The My Learning card of one course, by its title link. */
  function card(title: string) {
    return page
      .locator('main')
      .locator('div')
      .filter({ has: page.getByRole('link', { name: title, exact: true }) })
      .filter({ has: page.getByRole('button') })
      .last();
  }

  test.beforeAll(async ({ browser, request }) => {
    test.setTimeout(180_000);
    await clearAuthRateLimits();
    ({ academyId, owner } = await requireSeed(request));

    // Quiz-only: two published quizzes, no lessons, no completion rule.
    const quizOnly = await createCourse(request, quizOnlyTitle);
    quizOnlyId = quizOnly.courseId;
    quizIds = [
      await addQuiz(
        request,
        quizOnlyId,
        quizOnly.sectionId,
        `J15 Quiz A ${stamp}`
      ),
      await addQuiz(
        request,
        quizOnlyId,
        quizOnly.sectionId,
        `J15 Quiz B ${stamp}`
      ),
    ];
    await publish(request, quizOnlyId);

    // Mixed: one published lesson and one published quiz.
    const mixed = await createCourse(request, mixedTitle);
    mixedId = mixed.courseId;
    const lesson = await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses/${mixedId}/sections/${mixed.sectionId}/lessons`,
      {
        title: `J15 Lesson ${stamp}`,
        contentType: 'text',
        status: 'published',
        completionRule: 'manual',
      }
    );
    expect(lesson.status(), await lesson.text()).toBe(201);
    await addQuiz(request, mixedId, mixed.sectionId, `J15 Mixed Quiz ${stamp}`);
    await publish(request, mixedId);

    // The learner registers through the website's own form.
    learnerEmail = uniqueLearnerEmail('j15');
    context = await browser.newContext();
    page = await context.newPage();
    await seedCookieDecision(page);
    await registerLearnerThroughWebsite(
      page,
      learnerEmail,
      uniqueLearnerName('J15 Learner')
    );
    await expect(
      page
        .getByText(
          /check your (email|inbox)|account created|your account is ready|verify/i
        )
        .first()
    ).toBeVisible({ timeout: 20_000 });
    learner = await apiSignIn(request, {
      email: learnerEmail,
      password: LEARNER_PASSWORD,
      surface: 'academy',
      academyId,
    });
    for (const courseId of [quizOnlyId, mixedId]) {
      const enrolled = await apiPost(
        request,
        owner,
        `/academies/${academyId}/students/${learner.userId}/enrollments`,
        { courseId }
      );
      expect(enrolled.status(), await enrolled.text()).toBeLessThan(300);
    }
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('the server counts activities: 2 quizzes, 0 lessons; 1 lesson + 1 quiz', async ({
    request,
  }) => {
    expect(await progressOf(request, quizOnlyId)).toMatchObject({
      totalLessons: 0,
      totalItems: 2,
      completedItems: 0,
    });
    expect(await progressOf(request, mixedId)).toMatchObject({
      totalLessons: 1,
      totalItems: 2,
      completedItems: 0,
    });
  });

  // Playwright needs the fixtures argument destructured even when unused.
  // eslint-disable-next-line no-empty-pattern
  test('My Learning reads "0 of 2 activities completed" for both courses, in English and in Arabic (RTL)', async ({}, testInfo) => {
    test.setTimeout(120_000);
    await signInOnWebsite(page, learnerEmail);
    await page.goto(academyPath('/my/courses'));
    await expect(
      page.getByRole('link', { name: quizOnlyTitle, exact: true })
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(card(quizOnlyTitle)).toContainText(
      '0 of 2 activities completed'
    );
    await expect(card(mixedTitle)).toContainText('0 of 2 activities completed');
    // The lessons wording is not used for a course with non-lesson items.
    await expect(card(quizOnlyTitle)).not.toContainText(/lessons? completed/);
    await page.screenshot({
      path: testInfo.outputPath('my-learning-en-0-of-2.png'),
      fullPage: true,
    });

    await page.goto(academyPath('/ar/my/courses'));
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(
      page.getByRole('link', { name: quizOnlyTitle, exact: true })
    ).toBeVisible({
      timeout: 30_000,
    });
    await expect(card(quizOnlyTitle)).toContainText('تم إكمال 0 من 2 أنشطة');
    await expect(card(mixedTitle)).toContainText('تم إكمال 0 من 2 أنشطة');
    await page.screenshot({
      path: testInfo.outputPath('my-learning-ar-0-of-2.png'),
      fullPage: true,
    });
  });

  test('passing the first quiz (API, as the learner) shows "1 of 2" after a reload', async ({
    request,
  }, testInfo) => {
    const [quizId] = quizIds;
    const base = `/courses/${quizOnlyId}/quizzes/${quizId}`;
    const started = await apiPost(request, learner, `${base}/attempts`);
    expect(started.status(), await started.text()).toBe(201);
    const attemptId: string = (await started.json()).id;
    const session = await (
      await apiGet(request, learner, `${base}/attempts/${attemptId}`)
    ).json();
    const question = session.questions[0] as {
      id: string;
      options: { id: string; label: string }[];
    };
    const correct = question.options.find(
      (option) => option.label === CORRECT
    )!;
    const submitted = await apiPost(
      request,
      learner,
      `${base}/attempts/${attemptId}/submit`,
      {
        answers: [{ questionId: question.id, selectedOptionIds: [correct.id] }],
      }
    );
    expect(submitted.status(), await submitted.text()).toBe(201);
    expect(await submitted.json()).toMatchObject({ passed: true });

    await expect
      .poll(
        async () => (await progressOf(request, quizOnlyId)).completedItems,
        {
          timeout: 20_000,
        }
      )
      .toBe(1);

    await page.goto(academyPath('/my/courses'));
    await page.reload();
    await expect(card(quizOnlyTitle)).toContainText(
      '1 of 2 activities completed',
      {
        timeout: 30_000,
      }
    );
    // One quiz done is not the course done.
    expect((await progressOf(request, quizOnlyId)).completionState).not.toBe(
      'completed'
    );
    await page.screenshot({
      path: testInfo.outputPath('my-learning-en-1-of-2.png'),
      fullPage: true,
    });
  });

  test('passing the second quiz on screen completes the quiz-only course: "2 of 2" and Completed', async ({
    request,
  }, testInfo) => {
    test.setTimeout(120_000);
    const quizId = quizIds[1];
    await page.goto(
      academyPath(`/my/courses/${quizOnlyId}/activities/${quizId}`)
    );
    await page.getByTestId('quiz-start').click({ timeout: 30_000 });
    await expect(page.getByTestId('quiz-runner')).toBeVisible({
      timeout: 30_000,
    });
    await page
      .getByTestId('quiz-question-1')
      .getByText(CORRECT, { exact: true })
      .click();
    await page.getByTestId('quiz-submit').click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: /submit/i })
      .click();
    await expect(page.getByTestId('quiz-score')).toContainText('100%', {
      timeout: 30_000,
    });
    await page.screenshot({
      path: testInfo.outputPath('quiz-b-result.png'),
      fullPage: true,
    });

    await expect
      .poll(
        async () => (await progressOf(request, quizOnlyId)).completionState,
        {
          timeout: 20_000,
        }
      )
      .toBe('completed');
    expect(await progressOf(request, quizOnlyId)).toMatchObject({
      totalItems: 2,
      completedItems: 2,
    });

    await page.goto(academyPath('/my/courses'));
    await expect(card(quizOnlyTitle)).toContainText(
      '2 of 2 activities completed',
      {
        timeout: 30_000,
      }
    );
    await expect(card(quizOnlyTitle)).toContainText('Completed');
    // The mixed course is untouched and still counts its two activities.
    await expect(card(mixedTitle)).toContainText(
      /\d of 2 activities completed/
    );
    await expect(card(mixedTitle)).toContainText('0 of 2 activities completed');
    await page.screenshot({
      path: testInfo.outputPath('my-learning-en-2-of-2.png'),
      fullPage: true,
    });

    await page.goto(academyPath('/ar/my/courses'));
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(card(quizOnlyTitle)).toContainText('تم إكمال 2 من 2 أنشطة', {
      timeout: 30_000,
    });
    await page.screenshot({
      path: testInfo.outputPath('my-learning-ar-2-of-2.png'),
      fullPage: true,
    });
  });

  test('the public details page names the two quizzes, never "0 lessons" as its content (EN and AR)', async ({
    browser,
  }, testInfo) => {
    test.setTimeout(120_000);
    // An anonymous visitor: a fresh context, no session.
    const visitorContext = await browser.newContext();
    const visitor = await visitorContext.newPage();
    await seedCookieDecision(visitor);
    const copy = {
      en: {
        path: '',
        quizzes: '2 quizzes',
        lessons: /\b0 lessons?\b/,
        includes: 'This course includes',
        content: 'Course content',
      },
      ar: {
        path: '/ar',
        quizzes: 'اختباران',
        lessons: /بدون دروس|(^|\s)0 (دروس|درس)/,
        includes: 'تتضمّن هذه الدورة',
        content: 'محتوى الدورة',
      },
    } as const;

    // The catalog card says what the course contains: its quizzes.
    await visitor.goto(academyPath('/courses'));
    const search = visitor.getByLabel('Search courses').last();
    await expect(search).toBeVisible({ timeout: 60_000 });
    await search.fill(quizOnlyTitle);
    const catalogCard = visitor
      .locator('li, article')
      .filter({ has: visitor.getByRole('heading', { name: quizOnlyTitle }) })
      .last();
    await expect(catalogCard).toBeVisible({ timeout: 30_000 });
    await expect(
      catalogCard.getByText('2 quizzes', { exact: true })
    ).toBeVisible();
    await expect(catalogCard.getByText(copy.en.lessons)).toHaveCount(0);
    await visitor.screenshot({
      path: testInfo.outputPath('catalog-card-en.png'),
      fullPage: true,
    });

    for (const locale of ['en', 'ar'] as const) {
      const c = copy[locale];
      await visitor.goto(academyPath(`${c.path}/courses/${quizOnlyId}`));
      await expect(visitor.locator('html')).toHaveAttribute(
        'dir',
        locale === 'ar' ? 'rtl' : 'ltr'
      );
      const heading = visitor.getByRole('heading', { name: quizOnlyTitle });
      await expect(heading).toBeVisible({ timeout: 30_000 });
      // The at-a-glance line under the title: the quizzes, and no lesson count.
      const hero = heading.locator('xpath=..');
      await expect(hero.getByText(c.quizzes, { exact: true })).toBeVisible();
      await expect(hero.getByText(c.lessons)).toHaveCount(0);
      // "This course includes": the quizzes, and no "0 lessons".
      const includes = visitor.locator('aside').filter({ hasText: c.includes });
      await expect(
        includes.getByText(c.quizzes, { exact: true })
      ).toBeVisible();
      await expect(includes.getByText(c.lessons)).toHaveCount(0);
      // "Course content": the course's quizzes, and no "0 lessons" for the
      // course or its lesson-less section — nowhere on the page.
      const content = visitor
        .locator('section')
        .filter({ has: visitor.getByRole('heading', { name: c.content }) });
      await expect(content.getByText(c.quizzes)).toBeVisible();
      await expect(visitor.locator('main').getByText(c.lessons)).toHaveCount(0);
      await visitor.screenshot({
        path: testInfo.outputPath(`details-${locale}.png`),
        fullPage: true,
      });
    }
    await visitorContext.close();
  });
});
