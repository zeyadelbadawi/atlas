/**
 * J24 — the learner portal wears the Academy's palette (Task A), Chromium
 * against the real stack and database.
 *
 * The Owner saves a distinctive (magenta) palette through Visual Identity.
 * A fresh learner, enrolled in a fresh course with a lesson, a quiz and an
 * assignment, then visits every learner page — Overview, My Courses, the
 * course outline, a lesson, the quiz, the assignment, the completion page,
 * Certificates, Assessments — in four variants: English, Arabic (RTL),
 * a phone, and an operating system set to dark mode. On every one:
 *  - the portal's generic tokens (`--primary`, `--background`, `--card`,
 *    `--border`, …) come from THIS Academy's palette: magenta, and not the
 *    Atlas dashboard's own values outside the website scope;
 *  - a primary-coloured control really paints in that colour;
 *  - the page stays light and legible even when the OS is dark (the
 *    dashboard's dark mode must not leak in);
 *  - axe (WCAG 2.0/2.1 A + AA) finds no serious or critical violation and
 *    nothing overflows horizontally.
 * The palette is restored afterwards.
 */
import {
  test,
  expect,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  API_BASE,
  LEARNER_PASSWORD,
  academyPath,
  apiGet,
  apiPost,
  apiSignIn,
  authHeader,
  registerLearnerThroughWebsite,
  requireSeed,
  seedCookieDecision,
  uniqueLearnerEmail,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import { signInOnWebsite } from './support/phase4';

test.describe.configure({ mode: 'serial' });

/** Far from every default: no Atlas or seed colour has this hue. */
const MAGENTA = '330 81% 36%';

type Variant = {
  readonly name: string;
  readonly locale: '' | '/ar';
  readonly viewport: { width: number; height: number };
  readonly dark: boolean;
};

const VARIANTS: readonly Variant[] = [
  {
    name: 'en',
    locale: '',
    viewport: { width: 1280, height: 900 },
    dark: false,
  },
  {
    name: 'ar',
    locale: '/ar',
    viewport: { width: 1280, height: 900 },
    dark: false,
  },
  {
    name: 'phone',
    locale: '',
    viewport: { width: 390, height: 844 },
    dark: false,
  },
  {
    name: 'os-dark',
    locale: '',
    viewport: { width: 1280, height: 900 },
    dark: true,
  },
];

const hueOf = (triplet: string) => Number(triplet.trim().split(/\s+/)[0]);
const lightnessOf = (triplet: string) =>
  Number(/(\d+(?:\.\d+)?)%\s*$/.exec(triplet.trim())?.[1] ?? 'NaN');

test.describe('J24 — the learner portal follows the Academy palette', () => {
  const stamp = `${Date.now()}`;
  const title = `J24 Themed Course ${stamp}`;
  let academyId: string;
  let owner: Session;
  let original: { name: string; brand: Record<string, unknown> };
  let course: { id: string; lesson: string; quiz: string; assignment: string };
  let context: BrowserContext;

  async function saveBrand(
    request: APIRequestContext,
    brand: Record<string, unknown>
  ) {
    const saved = await request.put(
      `${API_BASE}/academies/${academyId}/visual-identity`,
      { headers: authHeader(owner), data: { name: original.name, brand } }
    );
    expect(saved.status(), await saved.text()).toBe(200);
  }

  test.beforeAll(async ({ request }) => {
    test.setTimeout(180_000);
    await clearAuthRateLimits();
    ({ academyId, owner } = await requireSeed(request));
    const academy = await (
      await apiGet(request, owner, `/academies/${academyId}`)
    ).json();
    const config = await (
      await apiGet(
        request,
        owner,
        `/academies/${academyId}/website/configuration`
      )
    ).json();
    original = { name: academy.name, brand: config.brand };

    await saveBrand(request, {
      palette: {
        seeds: { primary: MAGENTA },
        status: 'confirmed',
        source: 'manual',
      },
    });

    const post = async (path: string, data: unknown) => {
      const response = await apiPost(request, owner, path, data);
      expect(response.status(), await response.text()).toBeLessThan(300);
      return response.json();
    };
    const created = await post(`/academies/${academyId}/courses`, {
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      shortDescription: 'Playwright journey J24.',
      pricing: { type: 'free' },
      visibility: 'public',
    });
    const courseId: string = created.id;
    const section = await post(
      `/academies/${academyId}/courses/${courseId}/sections`,
      { title: 'Unit 1' }
    );
    const lesson = await post(
      `/academies/${academyId}/courses/${courseId}/sections/${section.id}/lessons`,
      {
        title: `J24 Lesson ${stamp}`,
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        status: 'published',
        completionRule: 'manual',
      }
    );
    const quiz = await post(`/courses/${courseId}/quizzes`, {
      title: `J24 Quiz ${stamp}`,
      status: 'published',
      requiredForCompletion: true,
      questions: [
        {
          prompt: 'Pick the first answer.',
          type: 'single_choice',
          points: 1,
          options: [
            { label: 'First', isCorrect: true },
            { label: 'Second', isCorrect: false },
          ],
        },
      ],
    });
    const assignment = await post(`/courses/${courseId}/assignments`, {
      title: `J24 Assignment ${stamp}`,
      instructions: 'Write two sentences about what you learned.',
      status: 'published',
      allowResubmission: false,
      latePolicy: 'accept_flagged',
      requiredForCompletion: true,
    });
    for (const [type, itemId] of [
      ['quiz', quiz.id],
      ['assignment', assignment.id],
    ] as const) {
      await post(
        `/academies/${academyId}/courses/${courseId}/sections/${section.id}/items/attach`,
        { type, itemId }
      );
    }
    await post(`/academies/${academyId}/courses/${courseId}/publish`, {});
    course = {
      id: courseId,
      lesson: lesson.id,
      quiz: quiz.id,
      assignment: assignment.id,
    };
  });

  test.afterAll(async ({ request }) => {
    await context?.close();
    if (!original) return;
    // Back to exactly what was there: the seed has legacy colours only.
    await saveBrand(request, {
      palette: original.brand.palette ?? null,
      primaryColor: original.brand.primaryColor,
      secondaryColor: original.brand.secondaryColor,
      accentColor: original.brand.accentColor,
    });
  });

  test('every learner page, in English, Arabic, on a phone and with the OS in dark mode', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(600_000);
    const learnerEmail = uniqueLearnerEmail('j24');
    context = await browser.newContext();
    let page = await context.newPage();
    await seedCookieDecision(page);
    await registerLearnerThroughWebsite(page, learnerEmail, 'J24 Learner');
    await expect(
      page
        .getByText(
          /check your (email|inbox)|account created|your account is ready|verify/i
        )
        .first()
    ).toBeVisible({ timeout: 20_000 });
    await signInOnWebsite(page, learnerEmail);
    // Enrol through the Owner (the course is free; what is under test is
    // the portal, not checkout).
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
      { courseId: course.id }
    );
    expect(enrolled.status(), await enrolled.text()).toBeLessThan(300);

    const pages: readonly { name: string; path: string; ready: string }[] = [
      { name: 'overview', path: '/my', ready: 'main' },
      { name: 'courses', path: '/my/courses', ready: 'main' },
      {
        name: 'outline',
        path: `/my/courses/${course.id}`,
        ready: 'main',
      },
      {
        name: 'lesson',
        path: `/my/courses/${course.id}/activities/${course.lesson}`,
        ready: '[data-testid="player-action-bar"], main',
      },
      {
        name: 'quiz',
        path: `/my/courses/${course.id}/activities/${course.quiz}`,
        ready: 'main',
      },
      {
        name: 'assignment',
        path: `/my/courses/${course.id}/activities/${course.assignment}`,
        ready: '[data-testid="assignment-form"]',
      },
      {
        name: 'completion',
        path: `/my/courses/${course.id}/complete`,
        ready: '[data-testid="course-complete-page"]',
      },
      { name: 'certificates', path: '/my/certificates', ready: 'main' },
      { name: 'assessments', path: '/my/assessments', ready: 'main' },
    ];

    const problems: string[] = [];
    for (const variant of VARIANTS) {
      for (const target of pages) {
        const tag = `${variant.name}/${target.name}`;
        // A fresh tab per visit: dozens of full loads of the Vite dev
        // server in one tab exhaust that renderer (see J23).
        await page.close();
        page = await context.newPage();
        await page.setViewportSize(variant.viewport);
        await page.emulateMedia({
          colorScheme: variant.dark ? 'dark' : 'light',
        });
        await page.goto(academyPath(`${variant.locale}${target.path}`));
        await expect(page.locator(target.ready).first(), tag).toBeVisible({
          timeout: 30_000,
        });
        await expect(page.locator('html'), tag).toHaveAttribute(
          'dir',
          variant.locale ? 'rtl' : 'ltr'
        );
        // Let lazy panels and the course data settle before measuring.
        await page.waitForLoadState('networkidle').catch(() => undefined);

        const tokens = await page.evaluate(() => {
          const scope = document.querySelector('.website-theme-scope');
          if (!scope) return null;
          const inScope = getComputedStyle(scope);
          const atRoot = getComputedStyle(document.documentElement);
          const read = (style: CSSStyleDeclaration, name: string) =>
            style.getPropertyValue(name).trim();
          const names = [
            '--primary',
            '--background',
            '--foreground',
            '--card',
            '--border',
            '--muted-foreground',
          ];
          const primaryFill = [
            ...scope.querySelectorAll<HTMLElement>(
              '[class~="bg-primary"], [class*=" bg-primary "]'
            ),
          ].find((el) => el.getClientRects().length > 0);
          return {
            scope: Object.fromEntries(names.map((n) => [n, read(inScope, n)])),
            root: Object.fromEntries(names.map((n) => [n, read(atRoot, n)])),
            primaryFill: primaryFill
              ? getComputedStyle(primaryFill).backgroundColor
              : null,
            primaryAsRgb: (() => {
              const probe = document.createElement('div');
              probe.style.backgroundColor = `hsl(${read(inScope, '--primary')})`;
              scope.appendChild(probe);
              const rgb = getComputedStyle(probe).backgroundColor;
              probe.remove();
              return rgb;
            })(),
            scopeBackground: getComputedStyle(scope).backgroundColor,
            bodyText: getComputedStyle(document.querySelector('main') ?? scope)
              .color,
            overflow:
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          };
        });
        if (!tokens) {
          problems.push(`${tag}: no website theme scope`);
          continue;
        }
        const hue = hueOf(tokens.scope['--primary']);
        if (!(hue >= 315 && hue <= 345))
          problems.push(
            `${tag}: --primary ${tokens.scope['--primary']} is not the Academy's magenta`
          );
        if (tokens.scope['--primary'] === tokens.root['--primary'])
          problems.push(`${tag}: --primary is the dashboard's own value`);
        if (tokens.primaryFill && tokens.primaryFill !== tokens.primaryAsRgb)
          problems.push(
            `${tag}: a primary control paints ${tokens.primaryFill}, not ${tokens.primaryAsRgb}`
          );
        // Light surfaces and dark text whatever the OS says.
        if (lightnessOf(tokens.scope['--background']) < 85)
          problems.push(
            `${tag}: background ${tokens.scope['--background']} is not light`
          );
        if (lightnessOf(tokens.scope['--foreground']) > 30)
          problems.push(
            `${tag}: foreground ${tokens.scope['--foreground']} is not dark`
          );
        if (tokens.overflow > 1)
          problems.push(`${tag}: horizontal overflow ${tokens.overflow}px`);

        const axe = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          // Third-party video frames are outside the Academy's control.
          .exclude('iframe')
          .analyze();
        for (const violation of axe.violations.filter(
          (v) => v.impact === 'serious' || v.impact === 'critical'
        )) {
          problems.push(
            `${tag}: axe ${violation.id} (${violation.impact}) × ${violation.nodes.length}: ${violation.nodes
              .slice(0, 3)
              .map((n) => n.target.join(' '))
              .join(' | ')}`
          );
        }
        await page.screenshot({
          path: testInfo.outputPath(`${variant.name}-${target.name}.png`),
          fullPage: true,
        });
      }
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });
});
