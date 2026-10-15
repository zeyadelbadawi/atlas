/**
 * J49 — hosted (Normal-tier) video: upload → play with the watermark
 * (B0-MED-11), Chromium against the real local stack.
 *
 * What is real: the API, the database, the upload ticket (quota reserved),
 * the presigned PUT of real bytes into the local S3 store, the completion
 * (the server HEADs the object), the lesson saved with `videoAssetId`
 * through the lesson API, the learner's grant, the `<video>` element
 * loading the bytes from storage, and the forensic watermark the player
 * draws over it.
 *
 * What is not production: delivery. Locally the Normal tier is served by
 * the backend's development stand-in (`FakeVideoProvider`, refused under
 * NODE_ENV=production), which signs a short-lived storage URL instead of
 * a delivery-Worker URL. The Worker itself is covered by its own harness
 * and by Release verify's token-less probe.
 *
 * The upload is driven through the API — the same three calls the builder
 * makes — because the builder's upload control is compiled out while the
 * `hostedVideoAuthoring` constant is false; the control itself is covered
 * by `hosted-video-authoring.test.tsx`.
 *
 * Needs the stack started with the Normal tier on (`scripts/e2e-local-stack.sh`
 * in atlas-backend sets `FLAG_VIDEO_NORMAL_MODE=on`). Against a stack where
 * the tier is off this journey SKIPS and says why — it never fakes a pass.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import {
  LEARNER_PASSWORD,
  academyPath,
  apiPost,
  apiSignIn,
  registerLearnerThroughWebsite,
  requireSeed,
  seedCookieDecision,
  uniqueLearnerEmail,
  uniqueLearnerName,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import { signInOnWebsite } from './support/phase4';

test.describe.configure({ mode: 'serial' });

const CODE = /^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/;

test.describe('J49 — hosted video: upload → play with the watermark', () => {
  const stamp = `${Date.now()}`;
  let owner: Session;
  let academyId = '';

  const post = async (
    request: APIRequestContext,
    path: string,
    data?: unknown
  ) => {
    const response = await apiPost(request, owner, path, data);
    expect(response.status(), await response.text()).toBeLessThan(300);
    return response.json();
  };

  test('an uploaded video plays for an enrolled learner under their watermark', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(240_000);
    await clearAuthRateLimits();
    ({ owner, academyId } = await requireSeed(request));

    // A course to attach to.
    const title = `J49 Hosted Video ${stamp}`;
    const course = await post(request, `/academies/${academyId}/courses`, {
      title,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      shortDescription: 'Playwright journey J49.',
      pricing: { type: 'free' },
      visibility: 'public',
    });
    const section = await post(
      request,
      `/academies/${academyId}/courses/${course.id}/sections`,
      { title: 'Unit 1' }
    );

    const context = await browser.newContext();
    const page = await context.newPage();
    await seedCookieDecision(page);
    await page.goto(academyPath('/'));

    // A real, playable clip recorded by this browser (canvas → MediaRecorder).
    const base64 = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 180;
      const g = canvas.getContext('2d')!;
      const recorder = new MediaRecorder(canvas.captureStream(25), {
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
    const clip = Buffer.from(base64, 'base64');
    expect(clip.length).toBeGreaterThan(1_000);

    // 1. The upload ticket (quota reserved). A stack without the tier skips.
    const ticketResponse = await apiPost(
      request,
      owner,
      `/academies/${academyId}/media/video-uploads`,
      {
        fileName: `j49-${stamp}.mp4`,
        maxDurationSeconds: 60,
        courseId: course.id,
        sizeBytes: clip.length,
      }
    );
    if (ticketResponse.status() === 403) {
      const body = await ticketResponse.json();
      test.skip(
        body?.error?.messageKey === 'errors.media.videoNotEnabled',
        'The Normal video tier is off on this stack — start it with FLAG_VIDEO_NORMAL_MODE=on.'
      );
    }
    expect(ticketResponse.status(), await ticketResponse.text()).toBe(201);
    const ticket = await ticketResponse.json();
    expect(ticket.requiresCompletionCall).toBe(true);

    // 2. The PUT straight to storage, with the signed type and length.
    const put = await request.put(ticket.uploadUrl, {
      data: clip,
      headers: { 'content-type': 'video/mp4' },
    });
    expect(put.status(), await put.text()).toBe(200);

    // 3. Completion: the server checks the object itself.
    const completed = await post(
      request,
      `/academies/${academyId}/media/video-uploads/${ticket.assetId}/complete`,
      {}
    );
    expect(completed.processingStatus).toBe('ready');

    // 4. The lesson saved with `videoAssetId`, as the builder saves it.
    const lesson = await post(
      request,
      `/academies/${academyId}/courses/${course.id}/sections/${section.id}/lessons`,
      {
        title: `J49 Lesson ${stamp}`,
        contentType: 'video',
        status: 'published',
        completionRule: 'manual',
        videoAssetId: ticket.assetId,
      }
    );
    expect(lesson.videoAssetId).toBe(ticket.assetId);
    await post(request, `/academies/${academyId}/courses/${course.id}/publish`);

    // 5. An enrolled learner opens the lesson on the academy website.
    const learnerEmail = uniqueLearnerEmail('j49');
    await registerLearnerThroughWebsite(
      page,
      learnerEmail,
      uniqueLearnerName('J49 Learner')
    );
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

    const grantResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`/lessons/${lesson.id}/content`) &&
        response.request().method() === 'GET'
    );
    await page.goto(academyPath(`/my/courses/${course.id}/learn/${lesson.id}`));
    const grant = await (await grantResponse).json();
    expect(grant.kind).toBe('video');
    expect(grant.protection).toMatchObject({ tier: 'normal', watermark: true });

    // The bytes load into the player from the signed URL…
    const video = page.locator('video');
    await expect(video).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(() => video.evaluate((el: HTMLVideoElement) => el.readyState), {
        timeout: 30_000,
      })
      .toBeGreaterThanOrEqual(1);
    expect(await video.evaluate((el: HTMLVideoElement) => el.currentSrc)).toBe(
      grant.video.url
    );

    // …under the learner's own forensic watermark.
    const label = page.getByTestId('forensic-watermark-label');
    await expect(label).toBeVisible();
    const [shown, masked] = ((await label.textContent()) ?? '').split(' · ');
    expect(shown).toMatch(CODE);
    expect(shown).toBe(grant.watermark.code);
    expect(masked).toContain('•••@');
    await expect(page.getByTestId('forensic-watermark-caption')).toContainText(
      shown
    );
    await page.screenshot({ path: testInfo.outputPath('j49-playback.png') });
    await context.close();
  });
});
