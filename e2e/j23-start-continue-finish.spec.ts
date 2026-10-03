/**
 * J23 — Start, Continue, Completed, and Finish course (Tasks C and E),
 * Chromium against the real stack and database.
 *
 * A fresh learner is enrolled in two fresh courses:
 *  - LESSONS: two (YouTube) lessons. The course page says "Start course"; after
 *    the first lesson it says "Continue Learning"; on the second (last)
 *    lesson the player offers "Finish course" — not a disabled Next — and
 *    finishing completes the lesson and opens the completion page, which
 *    says the course is complete (no certificate is promised: the course
 *    awards none). A refresh still offers Finish; the course page and My
 *    Courses then say "Completed".
 *  - QUIZ LAST: a lesson, then a quiz. With the quiz failed, the quiz page
 *    still offers "Finish course", and the completion page says what is
 *    missing instead of a dead end; once the quiz is passed it says the
 *    course is complete.
 * English and Arabic (RTL) are both visited.
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

test.describe('J23 — Start, Continue, Completed and Finish course', () => {
  const stamp = `${Date.now()}`;
  const lessonsTitle = `J23 Lessons Course ${stamp}`;
  const quizTitle = `J23 Quiz-last Course ${stamp}`;
  let academyId: string;
  let owner: Session;
  let learner: Session;
  let learnerEmail: string;
  let lessonsCourse: { id: string; lessons: string[] };
  let quizCourse: { id: string; lesson: string; quiz: string };
  let context: BrowserContext;
  let page: Page;

  async function createCourse(request: APIRequestContext, title: string) {
    const created = await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses`,
      {
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        shortDescription: 'Playwright journey J23.',
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
      { title: 'Unit 1' }
    );
    expect(section.status(), await section.text()).toBe(201);
    return { courseId, sectionId: (await section.json()).id as string };
  }

  async function addLesson(
    request: APIRequestContext,
    courseId: string,
    sectionId: string,
    title: string
  ): Promise<string> {
    const lesson = await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses/${courseId}/sections/${sectionId}/lessons`,
      {
        title,
        // A YouTube lesson: real content (an empty lesson has nothing to
        // complete), manual completion, and the YouTube player's loading
        // states on screen (Task D).
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        status: 'published',
        completionRule: 'manual',
      }
    );
    expect(lesson.status(), await lesson.text()).toBe(201);
    return (await lesson.json()).id;
  }

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
        // A wrong answer must fail it, and it must count for completion.
        passingScore: 100,
        requiredForCompletion: true,
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

  async function takeQuiz(
    request: APIRequestContext,
    answer: string
  ): Promise<boolean> {
    const base = `/courses/${quizCourse.id}/quizzes/${quizCourse.quiz}`;
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
    const option = question.options.find((o) => o.label === answer)!;
    const submitted = await apiPost(
      request,
      learner,
      `${base}/attempts/${attemptId}/submit`,
      { answers: [{ questionId: question.id, selectedOptionIds: [option.id] }] }
    );
    expect(submitted.status(), await submitted.text()).toBe(201);
    return (await submitted.json()).passed as boolean;
  }

  const courseAction = () => page.locator('[data-course-action]').first();

  test.beforeAll(async ({ browser, request }) => {
    test.setTimeout(180_000);
    await clearAuthRateLimits();
    ({ academyId, owner } = await requireSeed(request));

    // The course page is the website's "Course details" core page: created
    // when the Owner first loads the Website pages, live once published.
    // Publish just that page (never the whole site) when it is not yet.
    const managed = await (
      await apiGet(request, owner, `/academies/${academyId}/website/pages`, {
        page: '1',
        pageSize: '50',
      })
    ).json();
    const details = (
      managed.items as {
        id: string;
        coreType?: string;
        publishedVersion?: number;
      }[]
    ).find((candidate) => candidate.coreType === 'courseDetails');
    expect(details, 'course details page').toBeTruthy();
    const publishedDetails = await apiPost(
      request,
      owner,
      `/academies/${academyId}/website/pages/${details!.id}/publish`
    );
    expect(
      publishedDetails.status(),
      await publishedDetails.text()
    ).toBeLessThan(300);

    const a = await createCourse(request, lessonsTitle);
    lessonsCourse = {
      id: a.courseId,
      lessons: [
        await addLesson(
          request,
          a.courseId,
          a.sectionId,
          `J23 Lesson 1 ${stamp}`
        ),
        await addLesson(
          request,
          a.courseId,
          a.sectionId,
          `J23 Lesson 2 ${stamp}`
        ),
      ],
    };
    await publish(request, a.courseId);

    const b = await createCourse(request, quizTitle);
    quizCourse = {
      id: b.courseId,
      lesson: await addLesson(
        request,
        b.courseId,
        b.sectionId,
        `J23 Intro ${stamp}`
      ),
      quiz: await addQuiz(
        request,
        b.courseId,
        b.sectionId,
        `J23 Final Quiz ${stamp}`
      ),
    };
    await publish(request, b.courseId);

    learnerEmail = uniqueLearnerEmail('j23');
    context = await browser.newContext();
    page = await context.newPage();
    await seedCookieDecision(page);
    await registerLearnerThroughWebsite(
      page,
      learnerEmail,
      uniqueLearnerName('J23 Learner')
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
    for (const courseId of [lessonsCourse.id, quizCourse.id]) {
      const enrolled = await apiPost(
        request,
        owner,
        `/academies/${academyId}/students/${learner.userId}/enrollments`,
        { courseId }
      );
      expect(enrolled.status(), await enrolled.text()).toBeLessThan(300);
    }
    await signInOnWebsite(page, learnerEmail);
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('Start → Continue on the course page, and the outline agrees', async () => {
    test.setTimeout(120_000);
    await page.goto(academyPath(`/courses/${lessonsCourse.id}`));
    await expect(courseAction()).toHaveAttribute(
      'data-course-action',
      'start',
      {
        timeout: 30_000,
      }
    );
    await expect(courseAction()).toHaveText(/Start course/);

    await page.goto(academyPath(`/my/courses/${lessonsCourse.id}`));
    await expect(
      page.getByRole('button', { name: 'Start course' })
    ).toBeVisible({
      timeout: 30_000,
    });

    // The first lesson: Mark complete (it is not the last one).
    await page.goto(
      academyPath(
        `/my/courses/${lessonsCourse.id}/learn/${lessonsCourse.lessons[0]}`
      )
    );
    await page
      .getByRole('button', { name: /Mark as complete|Mark complete/i })
      .click();
    await expect(
      page
        .getByRole('status')
        .filter({ hasText: /complete/i })
        .first()
    ).toBeVisible();

    await page.goto(academyPath(`/courses/${lessonsCourse.id}`));
    await expect(courseAction()).toHaveAttribute(
      'data-course-action',
      'continue',
      {
        timeout: 30_000,
      }
    );
  });

  test('the last lesson offers Finish course — finishing completes it once and opens the completion page; a refresh still offers it', async ({}, testInfo) => {
    test.setTimeout(120_000);
    const lastLesson = academyPath(
      `/my/courses/${lessonsCourse.id}/learn/${lessonsCourse.lessons[1]}`
    );
    await page.goto(lastLesson);
    const finish = page.getByTestId('player-finish-course');
    await expect(finish).toBeEnabled({ timeout: 30_000 });
    // No dead Next beside it.
    await expect(
      page.getByRole('button', { name: 'Next', exact: true })
    ).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath('finish-course-en.png'),
    });

    const completions: string[] = [];
    page.on('request', (r) => {
      if (
        r.method() === 'POST' &&
        r.url().includes('/progress/complete-lesson')
      )
        completions.push(r.url());
    });
    // Two quick clicks: one completion, one navigation.
    await finish.click();
    await finish.click({ force: true, timeout: 1_000 }).catch(() => undefined);
    await expect(page).toHaveURL(/\/my\/courses\/[^/]+\/complete/, {
      timeout: 30_000,
    });
    expect(completions.length).toBe(1);
    const completePage = page.getByTestId('course-complete-page');
    await expect(completePage).toHaveAttribute('data-state', 'completed', {
      timeout: 30_000,
    });
    await expect(
      page.getByText(`You’ve completed ${lessonsTitle}`)
    ).toBeVisible();
    // The course awards no certificate: none is promised.
    await expect(page.getByTestId('course-complete-certificate')).toHaveCount(
      0
    );
    await page.screenshot({
      path: testInfo.outputPath('complete-page-en.png'),
    });

    // A refresh of the completion page, and of the finished last lesson.
    await page.reload();
    await expect(completePage).toHaveAttribute('data-state', 'completed', {
      timeout: 30_000,
    });
    await page.goto(lastLesson);
    await expect(page.getByTestId('player-finish-course')).toBeEnabled({
      timeout: 30_000,
    });

    // Completed, wherever the course is shown — in Arabic too.
    await page.goto(academyPath(`/courses/${lessonsCourse.id}`));
    await expect(courseAction()).toHaveAttribute(
      'data-course-action',
      'completed',
      {
        timeout: 30_000,
      }
    );
    await page.goto(academyPath(`/ar/courses/${lessonsCourse.id}`));
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(courseAction()).toHaveText(/أكملت الدورة/, {
      timeout: 30_000,
    });
    await page.goto(academyPath('/my/courses'));
    await page
      .getByRole('tab', { name: /Completed/ })
      .click()
      .catch(() => undefined);
    await expect(
      page.getByRole('link', { name: lessonsTitle, exact: true })
    ).toBeVisible({
      timeout: 30_000,
    });
  });

  test('a failed final quiz still offers Finish course, and the completion page says what is missing; passing it completes the course', async ({
    request,
  }, testInfo) => {
    test.setTimeout(150_000);
    // A tab of its own: by now the shared tab has made ~15 full loads of
    // the Vite dev server (~1.5k module requests each), and Chromium starts
    // refusing that renderer's requests (ERR_INSUFFICIENT_RESOURCES) —
    // a dev-server artefact, not the app. The learner stays signed in.
    await page.close();
    page = await context.newPage();
    const completeLesson = await apiPost(
      request,
      learner,
      `/courses/${quizCourse.id}/progress/complete-lesson`,
      { lessonId: quizCourse.lesson }
    );
    expect(completeLesson.status(), await completeLesson.text()).toBe(201);
    expect(await takeQuiz(request, WRONG)).toBe(false);

    await page.goto(
      academyPath(`/my/courses/${quizCourse.id}/activities/${quizCourse.quiz}`)
    );
    const finish = page.getByTestId('player-finish-course');
    await expect(finish).toBeEnabled({ timeout: 30_000 });
    await finish.click();
    const completePage = page.getByTestId('course-complete-page');
    await expect(completePage).toHaveAttribute('data-state', 'incomplete', {
      timeout: 30_000,
    });
    await expect(page.getByText(`J23 Final Quiz ${stamp}`)).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('complete-page-missing.png'),
    });

    expect(await takeQuiz(request, CORRECT)).toBe(true);
    await page.reload();
    await expect(completePage).toHaveAttribute('data-state', 'completed', {
      timeout: 30_000,
    });
  });
});
