/**
 * J25 — the video loading indicator (Task D), Chromium against the real
 * stack and database.
 *
 * A fresh learner opens a real lesson of a fresh course. The lesson's
 * player is driven through the states a learner actually meets, with the
 * provider's network under the test's control:
 *  - HOSTED (`<video>`): the lesson grant is the real one, rewritten to a
 *    hosted video whose bytes are a real WebM recorded in this browser
 *    (canvas → MediaRecorder). While the file does not arrive the player
 *    says it is loading; after a while it says it is slow and offers
 *    Retry; Retry with the file reachable plays-ready with no overlay. A
 *    file that fails shows an error with Retry, and Retry recovers.
 *  - YOUTUBE: youtube-nocookie.com is unreachable from the sandbox, so its
 *    embed is answered by a stub page speaking the embed's postMessage
 *    protocol (`onReady` / `onError`). A frame that never loads says it is
 *    slow and offers Retry, which reloads it; a video YouTube refuses
 *    (error 150) says it cannot be played here.
 * What is real: the app, the API, the grant, the `<video>` element and its
 * events, the iframe and its messages. What is stubbed: the two providers'
 * bytes (no hosted-video pipeline or YouTube access in this environment).
 */
import {
  test,
  expect,
  type APIRequestContext,
  type BrowserContext,
  type Page,
  type Route,
} from '@playwright/test';
import {
  LEARNER_PASSWORD,
  academyPath,
  apiPost,
  apiSignIn,
  registerLearnerThroughWebsite,
  requireSeed,
  seedCookieDecision,
  uniqueLearnerEmail,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import { signInOnWebsite } from './support/phase4';

test.describe.configure({ mode: 'serial' });

const HOSTED_URL = 'http://localhost:3001/__j25/lesson.webm';
/** The players' own "this is taking a while" threshold. */
const SLOW_AFTER_MS = 15_000;

test.describe('J25 — video loading, slow, failed and ready', () => {
  const stamp = `${Date.now()}`;
  let academyId: string;
  let owner: Session;
  let course: { id: string; lesson: string };
  let context: BrowserContext;
  let page: Page;
  let webm: Buffer;

  const lessonPath = () =>
    academyPath(`/my/courses/${course.id}/learn/${course.lesson}`);

  async function freshPage(): Promise<Page> {
    await page?.close();
    page = await context.newPage();
    return page;
  }

  /** The real grant, delivering a hosted video instead of the YouTube link. */
  async function asHostedGrant(route: Route) {
    const response = await route.fetch();
    const grant = await response.json();
    await route.fulfill({
      response,
      json: {
        ...grant,
        kind: 'video',
        externalEmbed: undefined,
        externalUrl: undefined,
        video: { format: 'mp4', url: HOSTED_URL, downloadable: false },
      },
    });
  }

  test.beforeAll(async ({ browser, request }) => {
    test.setTimeout(180_000);
    await clearAuthRateLimits();
    ({ academyId, owner } = await requireSeed(request));
    const post = async (
      req: APIRequestContext,
      path: string,
      data?: unknown
    ) => {
      const response = await apiPost(req, owner, path, data);
      expect(response.status(), await response.text()).toBeLessThan(300);
      return response.json();
    };
    const title = `J25 Video Course ${stamp}`;
    const created = await post(request, `/academies/${academyId}/courses`, {
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      shortDescription: 'Playwright journey J25.',
      pricing: { type: 'free' },
      visibility: 'public',
    });
    const section = await post(
      request,
      `/academies/${academyId}/courses/${created.id}/sections`,
      { title: 'Unit 1' }
    );
    const lesson = await post(
      request,
      `/academies/${academyId}/courses/${created.id}/sections/${section.id}/lessons`,
      {
        title: `J25 Lesson ${stamp}`,
        contentType: 'video',
        contentUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        status: 'published',
        completionRule: 'manual',
      }
    );
    await post(
      request,
      `/academies/${academyId}/courses/${created.id}/publish`
    );
    course = { id: created.id, lesson: lesson.id };

    const learnerEmail = uniqueLearnerEmail('j25');
    context = await browser.newContext();
    page = await context.newPage();
    await seedCookieDecision(page);
    await registerLearnerThroughWebsite(page, learnerEmail, 'J25 Learner');
    await expect(
      page
        .getByText(
          /check your (email|inbox)|account created|your account is ready|verify/i
        )
        .first()
    ).toBeVisible({ timeout: 20_000 });
    const learner = await apiSignIn(request, {
      email: learnerEmail,
      password: LEARNER_PASSWORD,
      surface: 'academy',
      academyId,
    });
    await post(
      request,
      `/academies/${academyId}/students/${learner.userId}/enrollments`,
      { courseId: course.id }
    );
    await signInOnWebsite(page, learnerEmail);

    // A real, playable video, recorded by this browser.
    const base64 = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 180;
      const g = canvas.getContext('2d')!;
      const stream = canvas.captureStream(25);
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8',
      });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      const done = new Promise((resolve) => (recorder.onstop = resolve));
      recorder.start(100);
      const started = performance.now();
      await new Promise<void>((resolve) => {
        const draw = () => {
          const t = performance.now() - started;
          g.fillStyle = `hsl(${(t / 10) % 360} 70% 50%)`;
          g.fillRect(0, 0, 320, 180);
          if (t < 2000) requestAnimationFrame(draw);
          else resolve();
        };
        draw();
      });
      recorder.stop();
      await done;
      const bytes = new Uint8Array(
        await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()
      );
      let binary = '';
      for (const b of bytes) binary += String.fromCharCode(b);
      return btoa(binary);
    });
    webm = Buffer.from(base64, 'base64');
    expect(webm.length).toBeGreaterThan(1_000);
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('hosted: loading → slow with Retry → Retry plays; a failed file → error with Retry → recovers', async ({}, testInfo) => {
    test.setTimeout(120_000);
    await freshPage();
    await page.route(
      `**/courses/${course.id}/lessons/${course.lesson}/content*`,
      asHostedGrant
    );
    let deliver = false;
    await page.route(HOSTED_URL, async (route) => {
      if (!deliver) return; // Never answered: the file does not arrive.
      await route.fulfill({
        status: 200,
        contentType: 'video/webm',
        body: webm,
      });
    });

    await page.goto(lessonPath());
    const video = page.locator('video').first();
    await expect(video).toBeAttached({ timeout: 30_000 });
    const loading = page.getByTestId('video-status-loading');
    await expect(loading).toBeVisible({ timeout: 30_000 });
    await expect(loading).toHaveAttribute('data-phase', 'loading');
    await expect(loading.getByRole('status')).toHaveText('Loading the video');

    // No progress for a while: say so, and offer Retry — never a silent
    // endless spinner.
    const retry = loading.getByRole('button', { name: 'Try again' });
    await expect(retry).toBeVisible({ timeout: SLOW_AFTER_MS + 10_000 });
    await page.screenshot({ path: testInfo.outputPath('hosted-slow.png') });

    deliver = true;
    await retry.click();
    await expect
      .poll(() => video.evaluate((el: HTMLVideoElement) => el.readyState), {
        timeout: 30_000,
      })
      .toBeGreaterThanOrEqual(2);
    await expect(loading).toHaveCount(0);
    await expect(page.getByTestId('video-status-error')).toHaveCount(0);

    // A file that fails to load: an error the learner can act on.
    await freshPage();
    await page.route(
      `**/courses/${course.id}/lessons/${course.lesson}/content*`,
      asHostedGrant
    );
    let fail = true;
    await page.route(HOSTED_URL, async (route) => {
      if (fail) return route.fulfill({ status: 404, body: 'gone' });
      await route.fulfill({
        status: 200,
        contentType: 'video/webm',
        body: webm,
      });
    });
    await page.goto(lessonPath());
    const error = page.getByTestId('video-status-error');
    await expect(error).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('video-status-loading')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('hosted-error.png') });
    fail = false;
    await error.getByRole('button', { name: 'Try again' }).click();
    const recovered = page.locator('video').first();
    await expect
      .poll(() => recovered.evaluate((el: HTMLVideoElement) => el.readyState), {
        timeout: 30_000,
      })
      .toBeGreaterThanOrEqual(2);
    await expect(error).toHaveCount(0);
    await expect(page.getByTestId('video-status-loading')).toHaveCount(0);
  });

  test('YouTube: a frame that never loads → slow with Retry → Retry loads it; a refused video says so', async ({}, testInfo) => {
    test.setTimeout(120_000);
    await freshPage();
    // The embed's postMessage protocol: answer the "listening" handshake.
    const stub = (event: string, info?: number) => `<!doctype html>
      <html><body style="background:#111;color:#eee">stub embed
      <script>
        addEventListener('message', (e) => {
          let d; try { d = JSON.parse(e.data); } catch { return; }
          if (d.event === 'listening')
            parent.postMessage(JSON.stringify(${JSON.stringify({
              event,
              info,
            })}), '*');
        });
      </script></body></html>`;
    let mode: 'hang' | 'ready' | 'refuse' = 'hang';
    await page.route('https://www.youtube-nocookie.com/**', async (route) => {
      if (mode === 'hang') return;
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: mode === 'ready' ? stub('onReady') : stub('onError', 150),
      });
    });

    // A lesson opened on the activity route (a stale or hand-typed link)
    // lands on its own path, with its player.
    await page.goto(
      academyPath(`/my/courses/${course.id}/activities/${course.lesson}`)
    );
    await expect(page).toHaveURL(
      new RegExp(`/my/courses/${course.id}/learn/${course.lesson}(\\?|$)`),
      { timeout: 30_000 }
    );
    const frame = page.getByTestId('youtube-lesson-player');
    await expect(frame).toBeAttached({ timeout: 30_000 });
    const loading = page.getByTestId('video-status-loading');
    await expect(loading).toBeVisible();
    const retry = loading.getByRole('button', { name: 'Try again' });
    await expect(retry).toBeVisible({ timeout: SLOW_AFTER_MS + 10_000 });
    await page.screenshot({ path: testInfo.outputPath('youtube-slow.png') });

    mode = 'ready';
    await retry.click();
    await expect(loading).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByTestId('video-status-error')).toHaveCount(0);
    await expect(
      page
        .frameLocator('[data-testid="youtube-lesson-player"]')
        .getByText('stub embed')
    ).toBeVisible();

    mode = 'refuse';
    await page.reload();
    const error = page.getByTestId('video-status-error');
    await expect(error).toBeVisible({ timeout: 30_000 });
    await expect(error).toContainText('can’t be played here');
    await page.screenshot({ path: testInfo.outputPath('youtube-refused.png') });
  });
});
