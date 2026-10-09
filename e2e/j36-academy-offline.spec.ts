/**
 * J36 — Academy offline (local-first learner portal), Chromium against a
 * PRODUCTION build served on a real academy host, the real API and the real
 * database.
 *
 * A service worker only runs in a production build and on a secure origin,
 * and an Academy website is identified by its HOST — so this journey does
 * not use the dev-override parameter. It needs:
 *
 *   E2E_BASE_URL       e.g. http://web-development-academy.atlas.test:3301
 *                      (a `vite build` with VITE_PLATFORM_BASE_DOMAIN=atlas.test,
 *                      served by `vite preview`, /api proxied to the API with
 *                      VITE_DEV_PROXY_HOST=<that host>)
 *   E2E_API_BASE_URL   the same API, directly (e.g. http://localhost:3100/api/v1),
 *                      running with PLATFORM_BASE_DOMAIN=atlas.test
 *   E2E_CHROMIUM       a Chromium binary
 *
 * Chromium maps `*.atlas.test` to 127.0.0.1 and treats the academy origin
 * as secure (service workers), via launch flags. Skipped without them.
 *
 * The journey: a learner signs in on the academy site online and opens a
 * text lesson and a video (YouTube) lesson; the connection drops → the
 * banner says so and the video is labelled online-only; a reload WITHOUT a
 * connection shows the app shell, the saved lesson text and the banner;
 * the video lesson says it needs a connection; marking the text lesson
 * complete offline is kept on the device; back online it syncs to the
 * server.
 */
import { test, expect } from '@playwright/test';
import {
  API_BASE,
  LEARNER_PASSWORD,
  apiPost,
  apiSignIn,
  seedCookieDecision,
  uniqueLearnerEmail,
  uniqueLearnerName,
  declineCookies,
  apiGet,
} from './support/atlas';
import {
  apiPut,
  createCourse,
  ensureAcademy,
  publishCourse,
} from './support/phase4';
import { adminSql } from './support/admin-db';

const BASE = process.env.E2E_BASE_URL ?? '';
const ACADEMY_HOST = BASE ? new URL(BASE).hostname : '';

test.skip(
  !BASE.includes('.atlas.test') || !process.env.E2E_CHROMIUM,
  'needs a production build on an academy host (see the file comment)'
);

test.use({
  launchOptions: {
    executablePath: process.env.E2E_CHROMIUM,
    args: [
      `--host-resolver-rules=MAP *.atlas.test 127.0.0.1`,
      `--unsafely-treat-insecure-origin-as-secure=${BASE}`,
    ],
  },
});

test.describe.configure({ mode: 'serial' });

const TEXT_BODY =
  'Offline reading body: photosynthesis turns light into sugar.';

test('academy offline: saved lesson text and banner offline, video online-only, progress syncs back', async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(240_000);

  /* ---------- fixtures, through the real API (local test data) ---------- */
  const { academyId, owner } = await ensureAcademy(request);
  const stamp = Date.now();
  const courseId = await createCourse(request, owner, academyId, {
    title: `Offline Journey ${stamp}`,
    pricing: { type: 'free' },
  });
  const section = await apiPost(
    request,
    owner,
    `/academies/${academyId}/courses/${courseId}/sections`,
    { title: 'Unit 1' }
  );
  expect(section.status(), await section.text()).toBe(201);
  const sectionId = (await section.json()).id as string;
  const lessonPath = `/academies/${academyId}/courses/${courseId}/sections/${sectionId}/lessons`;

  // The video comes first in the curriculum (sequential unlock), and the
  // learner has finished it, so the text lesson after it is open.
  const videoLesson = await apiPost(request, owner, lessonPath, {
    title: 'Video: the leaf',
    contentType: 'video',
    status: 'published',
    completionRule: 'manual',
  });
  expect(videoLesson.status(), await videoLesson.text()).toBe(201);
  const videoLessonId = (await videoLesson.json()).id as string;
  const content = await apiPut(
    request,
    owner,
    `${lessonPath}/${videoLessonId}/content`,
    {
      kind: 'external',
      externalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    }
  );
  expect(content.status() < 300, await content.text()).toBeTruthy();
  const textLesson = await apiPost(request, owner, lessonPath, {
    title: 'Reading: light',
    contentType: 'text',
    status: 'published',
    completionRule: 'manual',
  });
  expect(textLesson.status(), await textLesson.text()).toBe(201);
  const textLessonId = (await textLesson.json()).id as string;
  // Text bodies have no authoring endpoint yet (the API refuses `bodyHtml`
  // on purpose until a sanitising editor exists), so the row is written
  // with the admin connection — local test data only.
  await adminSql(
    `insert into lesson_contents (id, lesson_id, course_id, academy_id, kind, body_html, updated_at)
     values (gen_random_uuid(), :'lesson', :'course', :'academy', 'text', :'body', now());`,
    {
      lesson: textLessonId,
      course: courseId,
      academy: academyId,
      body: `<p>${TEXT_BODY}</p>`,
    }
  );

  await publishCourse(request, owner, academyId, courseId);

  const email = uniqueLearnerEmail('j36');
  const registered = await request.post(`${API_BASE}/auth/register`, {
    data: {
      name: uniqueLearnerName('J36 Learner'),
      email,
      password: LEARNER_PASSWORD,
      academyId,
    },
  });
  expect(registered.status(), await registered.text()).toBe(201);
  const learner = await apiSignIn(request, {
    email,
    password: LEARNER_PASSWORD,
    surface: 'academy',
    academyId,
  });
  const enrolled = await apiPost(request, learner, '/enrollments', {
    courseId,
  });
  expect(enrolled.status(), await enrolled.text()).toBe(201);
  await apiGet(request, learner, `/courses/${courseId}/progress`);
  const watched = await apiPost(
    request,
    learner,
    `/courses/${courseId}/progress/complete-lesson`,
    { lessonId: videoLessonId }
  );
  expect(watched.status(), await watched.text()).toBe(201);

  /* ---------- online: sign in on the academy site, open both lessons ---------- */
  await seedCookieDecision(page);
  await page.goto(`${BASE}/sign-in`);
  await declineCookies(page);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(LEARNER_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/my/, { timeout: 30_000 });

  // The academy origin's own service worker takes control of the page.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), {
      timeout: 20_000,
    })
    .toBe(true);
  const scope = await page.evaluate(
    async () => (await navigator.serviceWorker.getRegistration())?.scope ?? null
  );
  expect(scope).toBe(`${new URL(BASE).origin}/`);

  const textUrl = `${BASE}/my/courses/${courseId}/learn/${textLessonId}`;
  const videoUrl = `${BASE}/my/courses/${courseId}/learn/${videoLessonId}`;
  await page.goto(textUrl);
  await expect(page.getByText(TEXT_BODY)).toBeVisible({ timeout: 30_000 });
  await page.goto(videoUrl);
  await expect(page.locator('iframe[src*="youtube"]').first()).toBeAttached({
    timeout: 30_000,
  });
  // Let the debounced offline copies (outline, site) be written.
  await page.waitForTimeout(2_500);

  // Nothing about the learner or a lesson credential was cached by the worker.
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      for (const request of await (await caches.open(name)).keys())
        urls.push(request.url);
    }
    return urls;
  });
  expect(cached.some((url) => url.includes('/api/'))).toBe(false);

  /* ---------- the connection drops while the video lesson is open ---------- */
  await context.setOffline(true);
  await expect(
    page.locator('[data-learner-connectivity="offline"]')
  ).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator('[data-offline-video]')).toBeVisible();

  /* ---------- reload WITHOUT a connection: shell + saved text + banner ---------- */
  await page.goto(textUrl);
  await expect(
    page.locator(`[data-offline-lesson="${textLessonId}"]`)
  ).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(TEXT_BODY)).toBeVisible();
  await expect(
    page.locator('[data-learner-connectivity="offline"]')
  ).toBeVisible();

  // Complete it offline: kept on the device, said so.
  await page
    .getByRole('button', {
      // The last activity offers "Finish course", which completes it first.
      name: /mark (as )?complete|finish course/i,
    })
    .first()
    .click();
  await expect(page.locator('[data-offline-queued="complete"]')).toBeVisible({
    timeout: 15_000,
  });

  // The video lesson is honest: it needs a connection. No player, no video.
  await page.goto(videoUrl);
  await expect(
    page.locator('[data-offline-state="needs-connection"]')
  ).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator('video, iframe[src*="youtube"]')).toHaveCount(0);

  /* ---------- back online: the queued completion reaches the server ---------- */
  await context.setOffline(false);
  await expect
    .poll(
      async () => {
        const progress = await apiGet(
          request,
          learner,
          `/courses/${courseId}/progress`
        );
        if (!progress.ok()) return 'error';
        const body = (await progress.json()) as {
          lessons: { lessonId: string; status: string }[];
        };
        return body.lessons.find((l) => l.lessonId === textLessonId)?.status;
      },
      { timeout: 45_000, intervals: [1_000] }
    )
    .toBe('completed');
  expect(ACADEMY_HOST).toContain('.atlas.test');
});
