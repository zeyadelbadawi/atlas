/**
 * J13 — responsive and accessibility matrix (P7), Chromium against the
 * real stack and database.
 *
 * Ten surfaces × six widths (360, 390, 768, 1024, 1440, 1920) × English
 * and Arabic:
 *   public   — Academy home, course catalog, FAQs (anonymous visitor);
 *   learner  — "My learning", exam intro, exam in progress, the
 *              full-screen gate (an exam out of full screen);
 *   owner    — dashboard home, website builder (page editor + live
 *              preview), the instructor's attempt review.
 * At every combination: the document's language and direction, no
 * horizontal overflow, a main landmark and one h1, and a full-page
 * screenshot (reviewed by a person — see the report). At 390 and 1440:
 * axe (WCAG 2.0/2.1 A + AA) with no serious or critical violation. Plus
 * keyboard checks: the first Tab stops are visible, focus is never on
 * an invisible element, and dialogs keep focus inside.
 *
 * Automated checks are not a screen-reader test; the manual plan is in
 * Reports/ACCESSIBILITY_AUDIT.md.
 */
import AxeBuilder from '@axe-core/playwright';
import {
  test,
  expect,
  type APIRequestContext,
  type Browser,
  type Page,
} from '@playwright/test';
import {
  LEARNER_PASSWORD,
  SEED,
  academyPath,
  apiGet,
  apiPost,
  apiSignIn,
  registerLearnerThroughWebsite,
  requireSeed,
  seedCookieDecision,
  signInThroughDashboard,
  uniqueLearnerEmail,
  type Session,
  uniqueLearnerName,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';

test.describe.configure({ mode: 'default' });

const WIDTHS = [360, 390, 768, 1024, 1440, 1920] as const;
const AXE_WIDTHS = new Set<number>([390, 1440]);
const LOCALES = ['en', 'ar'] as const;
type Locale = (typeof LOCALES)[number];

interface Surface {
  readonly name: string;
  readonly role: 'anonymous' | 'learner' | 'owner';
  readonly path: (locale: Locale) => string;
  /** Something that proves the page is the right one and loaded. */
  readonly ready: (page: Page) => ReturnType<Page['locator']>;
  readonly expectH1?: boolean;
}

/** Records a consent decision allowing preferences, and the dashboard language. */
async function prepareContext(page: Page, locale: Locale) {
  await page.addInitScript((language) => {
    window.localStorage.setItem(
      'atlas:cookie-consent',
      JSON.stringify({
        version: 1,
        necessary: true,
        preferences: true,
        decidedAt: '2026-09-01T09:00:00.000Z',
      })
    );
    window.localStorage.setItem('atlas:language', JSON.stringify(language));
  }, locale);
}

async function overflowPx(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
}

test.describe('J13 — responsive and accessibility matrix', () => {
  let academyId: string;
  let owner: Session;
  let courseId: string;
  const quizzes = { intro: '', running: '', gate: '' };
  let reviewAttemptId = '';
  let learnerEmail = '';
  const states: Partial<Record<'learner' | 'owner', string>> = {};

  async function quiz(
    request: APIRequestContext,
    title: string,
    requireFullscreen: boolean
  ) {
    const created = await apiPost(
      request,
      owner,
      `/courses/${courseId}/quizzes`,
      {
        title,
        description: 'Responsive matrix (J13).',
        status: 'published',
        maxAttempts: 5,
        integrityMode: 'warn',
        maxViolations: 10,
        requireFullscreen,
        layout: 'all_questions',
        questions: [
          {
            prompt: 'Which planet is known as the red planet?',
            type: 'single_choice',
            points: 1,
            options: [
              { label: 'Mars', isCorrect: true },
              { label: 'Venus', isCorrect: false },
              { label: 'Jupiter', isCorrect: false },
            ],
          },
          {
            prompt:
              'Explain, in one sentence, why the sky looks blue during the day.',
            type: 'short_answer',
            points: 1,
            acceptedAnswers: ['scattering'],
          },
        ],
      }
    );
    expect(created.status(), await created.text()).toBe(201);
    return (await created.json()).id as string;
  }

  async function signedInState(
    browser: Browser,
    role: 'learner' | 'owner'
  ): Promise<string> {
    if (states[role]) return states[role]!;
    const context = await browser.newContext();
    const page = await context.newPage();
    await seedCookieDecision(page);
    if (role === 'owner') {
      await signInThroughDashboard(page, SEED.owner, SEED.password);
      await page.waitForURL(/dashboard/, { timeout: 30_000 });
    } else {
      await page.goto(academyPath('/sign-in'));
      await page.locator('input[type="email"]').fill(learnerEmail);
      await page.locator('input[type="password"]').fill(LEARNER_PASSWORD);
      await page.locator('form button[type="submit"]').click();
      await expect(page).toHaveURL(/\/my/, { timeout: 30_000 });
    }
    const path = test.info().outputPath(`${role}-state.json`);
    await context.storageState({ path });
    await context.close();
    states[role] = path;
    return path;
  }

  test.beforeAll(async ({ browser, request }) => {
    test.setTimeout(240_000);
    await clearAuthRateLimits();
    ({ academyId, owner } = await requireSeed(request));
    const stamp = Date.now();
    const created = await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses`,
      {
        title: `J13 Responsive Course ${stamp}`,
        slug: `j13-responsive-${stamp}`,
        shortDescription: 'Responsive matrix (J13).',
        pricing: { type: 'free' },
        visibility: 'public',
      }
    );
    courseId = (await created.json()).id;
    const section = await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses/${courseId}/sections`,
      { title: 'Exams' }
    );
    const sectionId = (await section.json()).id;
    quizzes.intro = await quiz(request, 'J13 Exam — intro', true);
    quizzes.running = await quiz(request, 'J13 Exam — running', false);
    quizzes.gate = await quiz(request, 'J13 Exam — full screen', true);
    for (const itemId of Object.values(quizzes)) {
      await apiPost(
        request,
        owner,
        `/academies/${academyId}/courses/${courseId}/sections/${sectionId}/items/attach`,
        { type: 'quiz', itemId }
      );
    }
    await apiPost(
      request,
      owner,
      `/academies/${academyId}/courses/${courseId}/publish`
    );

    learnerEmail = uniqueLearnerEmail('j13');
    const page = await browser.newPage();
    await seedCookieDecision(page);
    await registerLearnerThroughWebsite(
      page,
      learnerEmail,
      uniqueLearnerName('J13 Learner')
    );
    await expect(
      page
        .getByText(
          /check your (email|inbox)|account created|your account is ready|verify/i
        )
        .first()
    ).toBeVisible({ timeout: 20_000 });
    await page.close();
    const learner = await apiSignIn(request, {
      email: learnerEmail,
      password: LEARNER_PASSWORD,
      surface: 'academy',
      academyId,
    });
    await apiPost(
      request,
      owner,
      `/academies/${academyId}/students/${learner.userId}/enrollments`,
      { courseId }
    );

    // Open attempts for the "running" and "gate" views; a finished one with
    // events for the review.
    for (const id of [quizzes.running, quizzes.gate]) {
      const started = await apiPost(
        request,
        learner,
        `/courses/${courseId}/quizzes/${id}/attempts`,
        {}
      );
      expect(started.status(), await started.text()).toBe(201);
    }
    const reviewed = await apiPost(
      request,
      learner,
      `/courses/${courseId}/quizzes/${quizzes.intro}/attempts`,
      {}
    );
    reviewAttemptId = (await reviewed.json()).id;
    const base = `/courses/${courseId}/quizzes/${quizzes.intro}/attempts/${reviewAttemptId}`;
    await apiPost(request, learner, `${base}/events`, {
      events: [
        { type: 'fullscreen_enter' },
        { type: 'visibility_hidden' },
        { type: 'visibility_visible' },
        { type: 'paste' },
      ],
    });
    const session = await (await apiGet(request, learner, base)).json();
    const first = (
      session.questions as { id: string; options?: { id: string }[] }[]
    )[0];
    await apiPost(request, learner, `${base}/submit`, {
      answers: [
        { questionId: first.id, selectedOptionIds: [first.options![0].id] },
      ],
      revision: (session.revision as number) + 1,
    });
  });

  const surfaces: Surface[] = [
    {
      name: 'public-home',
      role: 'anonymous',
      path: (l) => academyPath(l === 'ar' ? '/ar' : '/'),
      ready: (p) => p.locator('main'),
      expectH1: true,
    },
    {
      name: 'public-courses',
      role: 'anonymous',
      path: (l) => academyPath(l === 'ar' ? '/ar/courses' : '/courses'),
      ready: (p) => p.locator('main'),
      expectH1: true,
    },
    {
      name: 'public-faqs',
      role: 'anonymous',
      path: (l) => academyPath(l === 'ar' ? '/ar/faqs' : '/faqs'),
      ready: (p) => p.locator('main'),
      expectH1: true,
    },
    {
      name: 'learner-my',
      role: 'learner',
      path: (l) => academyPath(`${l === 'ar' ? '/ar' : ''}/my`),
      ready: (p) => p.locator('main'),
    },
    {
      name: 'exam-intro',
      role: 'learner',
      path: (l) =>
        academyPath(
          `${l === 'ar' ? '/ar' : ''}/my/courses/${courseId}/activities/${quizzes.intro}`
        ),
      ready: (p) => p.getByTestId('quiz-start').or(p.getByTestId('quiz-score')),
    },
    {
      name: 'exam-running',
      role: 'learner',
      path: (l) =>
        academyPath(
          `${l === 'ar' ? '/ar' : ''}/my/courses/${courseId}/activities/${quizzes.running}`
        ),
      ready: (p) => p.getByTestId('quiz-runner'),
    },
    {
      name: 'exam-gate',
      role: 'learner',
      path: (l) =>
        academyPath(
          `${l === 'ar' ? '/ar' : ''}/my/courses/${courseId}/activities/${quizzes.gate}`
        ),
      ready: (p) => p.getByTestId('quiz-fullscreen-gate'),
    },
    {
      name: 'dashboard-home',
      role: 'owner',
      path: () => '/dashboard',
      ready: (p) => p.locator('main'),
    },
    {
      name: 'builder',
      role: 'owner',
      path: () => `/dashboard/academy/${academyId}/website`,
      ready: (p) => p.locator('main'),
    },
    {
      name: 'attempt-review',
      role: 'owner',
      path: () =>
        `/dashboard/instructor/courses/${courseId}/quizzes/${quizzes.intro}/attempts/${reviewAttemptId}`,
      ready: (p) => p.getByTestId('integrity-signals'),
    },
  ];

  for (const surface of surfaces) {
    for (const locale of LOCALES) {
      test(`${surface.name} · ${locale} · ${WIDTHS.join('/')}`, async ({
        browser,
      }, testInfo) => {
        test.setTimeout(240_000);
        const storageState =
          surface.role === 'anonymous'
            ? undefined
            : await signedInState(browser, surface.role);
        const context = await browser.newContext({ storageState });
        const page = await context.newPage();
        await prepareContext(page, locale);
        const consoleErrors: string[] = [];
        page.on('pageerror', (error) => consoleErrors.push(error.message));
        const problems: string[] = [];
        for (const width of WIDTHS) {
          await page.setViewportSize({
            width,
            height: width < 768 ? 844 : 900,
          });
          await page.goto(surface.path(locale));
          await expect(surface.ready(page).first()).toBeVisible({
            timeout: 30_000,
          });
          await page.waitForLoadState('networkidle');
          const tag = `${surface.name}-${locale}-${width}`;
          await expect(page.locator('html'), tag).toHaveAttribute(
            'dir',
            locale === 'ar' ? 'rtl' : 'ltr'
          );
          await expect(page.locator('html'), tag).toHaveAttribute(
            'lang',
            new RegExp(`^${locale}`)
          );
          await expect(page.locator('main').first(), tag).toBeVisible();
          if (surface.expectH1)
            await expect(
              page.getByRole('heading', { level: 1 }),
              tag
            ).toHaveCount(1);
          const overflow = await overflowPx(page);
          if (overflow > 1)
            problems.push(`${tag}: horizontal overflow ${overflow}px`);
          await page.screenshot({
            path: testInfo.outputPath(`${tag}.png`),
            fullPage: true,
          });
          if (AXE_WIDTHS.has(width)) {
            const result = await new AxeBuilder({ page })
              .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
              .analyze();
            for (const violation of result.violations.filter(
              (v) => v.impact === 'serious' || v.impact === 'critical'
            )) {
              problems.push(
                `${tag}: axe ${violation.id} (${violation.impact}) × ${violation.nodes.length}: ${violation.nodes
                  .slice(0, 3)
                  .map((n) => n.target.join(' '))
                  .join(' | ')}`
              );
            }
          }
        }
        if (consoleErrors.length)
          problems.push(
            `page errors: ${consoleErrors.slice(0, 3).join(' | ')}`
          );
        // Tokens rotate on refresh: keep the latest for the next test of this role.
        if (storageState) await context.storageState({ path: storageState });
        await context.close();
        expect(problems, problems.join('\n')).toEqual([]);
      });
    }
  }

  test('author content keeps its own direction inside the Arabic UI', async ({
    browser,
  }) => {
    const storageState = await signedInState(browser, 'learner');
    const context = await browser.newContext({ storageState });
    const page = await context.newPage();
    await prepareContext(page, 'ar');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(
      academyPath(`/ar/my/courses/${courseId}/activities/${quizzes.running}`)
    );
    const prompt = page.getByRole('heading', {
      name: /Which planet is known as the red planet\?/,
    });
    await expect(prompt).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    expect(await prompt.evaluate((el) => getComputedStyle(el).direction)).toBe(
      'ltr'
    );
    await context.storageState({ path: storageState });
    await context.close();
  });

  test('keyboard: visible focus on the first Tab stops; dialogs keep focus inside', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const context = await browser.newContext({
      storageState: await signedInState(browser, 'learner'),
    });
    const page = await context.newPage();
    await prepareContext(page, 'en');
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const path of [
      academyPath('/'),
      academyPath(`/my/courses/${courseId}/activities/${quizzes.running}`),
    ]) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press('Tab');
        const focus = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return null;
          const style = getComputedStyle(el);
          const box = el.getBoundingClientRect();
          return {
            name: (
              el.getAttribute('aria-label') ??
              el.textContent ??
              el.tagName
            )
              .trim()
              .slice(0, 40),
            visible:
              box.width > 0 && box.height > 0 && style.visibility !== 'hidden',
            indicator:
              style.outlineStyle !== 'none' || style.boxShadow !== 'none',
          };
        });
        if (!focus) continue;
        expect(
          focus.visible,
          `${path} tab ${i + 1}: ${focus.name} is invisible`
        ).toBe(true);
        expect(
          focus.indicator,
          `${path} tab ${i + 1}: ${focus.name} has no focus indicator`
        ).toBe(true);
      }
    }
    // The submit confirmation traps focus and Escape closes it.
    await page.getByTestId('quiz-submit').focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
      expect(
        await dialog.evaluate((d) => d.contains(document.activeElement))
      ).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('quiz-submit')).toBeFocused();
    await context.storageState({ path: states.learner! }); // keep the rotated tokens
    await context.close();
  });
});
