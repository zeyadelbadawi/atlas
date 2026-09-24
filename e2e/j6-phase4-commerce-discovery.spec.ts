/**
 * J6 — Phase 4 commerce and discovery (P64 Phase 4 master plan §P).
 *
 * The public Course Catalog section, the course details page, learner
 * reviews with moderation, and the paid-course checkout — in the order
 * the plan names them:
 *
 *   owner adds a `courseCatalog` section to the `/courses` page and
 *   publishes → an anonymous visitor filters by level and searches →
 *   opens a course details page (level, outcomes, requirements; no
 *   rating block while there are no approved reviews) → a learner
 *   registers through the website, enrols in the FREE course, writes a
 *   review → the owner approves it → the public page shows the review and
 *   its rating → the learner opens the PAID course → "Buy this course" →
 *   checkout: payment method → proof upload → "submitted for review" →
 *   the platform owner approves the payment → the learner is enrolled.
 *
 * REAL STACK ONLY (see J5's header for the environment). Owner and
 * platform-owner actions go through their own API sessions — that is
 * those principals acting, not a mock — and every step the plan
 * describes as a screen is done on the screen and asserted by what a
 * person would see.
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import {
  LEARNER_PASSWORD,
  academyPath,
  apiGet,
  apiPatch,
  apiPost,
  apiSignIn,
  registerLearnerThroughWebsite,
  uniqueLearnerEmail,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import {
  TINY_PNG,
  addExternalPreviewLesson,
  approveCourseOrderPayment,
  createCourse,
  ensureAcademy,
  ensurePaymentCollection,
  enrollmentForCourse,
  findPendingPaymentForOrder,
  publishCourse,
  signInOnWebsite,
  signInPlatformOwner,
  type PaymentMethodFixture,
} from './support/phase4';

test.describe.configure({ mode: 'serial' });

const CATALOG_TITLE = 'Browse our courses';
const OUTCOME = 'Build a small web page from scratch';
const REQUIREMENT = 'A laptop with a modern browser';
const REVIEW_BODY = 'Clear, short and practical. I built my first page in an hour.';

test.describe('J6 — catalog, details, reviews and paid checkout', () => {
  let academyId: string;
  let owner: Session;
  let platformOwner: Session;
  let learner: Session;
  let learnerEmail: string;
  let method: PaymentMethodFixture;
  const previewLessonTitle = 'Free sample: your first build';
  let freeCourseId: string;
  let freeCourseTitle: string;
  let paidCourseId: string;
  let paidCourseTitle: string;

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser, request }) => {
    test.setTimeout(240_000);
    await clearAuthRateLimits();

    let organizationId: string;
    ({ academyId, organizationId, owner } = await ensureAcademy(request));
    platformOwner = await signInPlatformOwner(request);
    method = await ensurePaymentCollection(request, owner, platformOwner, organizationId);

    /* ---------- the owner authors two public courses ---------- */
    const stamp = `${Date.now()}`;
    freeCourseTitle = `J6 Free Course ${stamp}`;
    paidCourseTitle = `J6 Paid Course ${stamp}`;
    freeCourseId = await createCourse(request, owner, academyId, {
      title: freeCourseTitle,
      pricing: { type: 'free' },
      level: 'beginner',
      outcomes: [OUTCOME, 'Explain how HTML and CSS fit together'],
      requirements: [REQUIREMENT],
      description: 'A first course for complete beginners.',
    });
    paidCourseId = await createCourse(request, owner, academyId, {
      title: paidCourseTitle,
      pricing: { type: 'paid', amount: 150, currency: 'USD' },
      level: 'advanced',
      outcomes: ['Ship a production build'],
      requirements: ['The free course, or equivalent'],
      description: 'The advanced follow-up, sold as a paid course.',
    });
    await publishCourse(request, owner, academyId, freeCourseId);
    await publishCourse(request, owner, academyId, paidCourseId);

    // The paid course carries the free sample — that is what a preview is
    // for. External/YouTube on purpose: a preview is public marketing
    // content Atlas does not protect, so it needs none of the hosted-video
    // infrastructure this environment does not have.
    await addExternalPreviewLesson(
      request,
      owner,
      academyId,
      paidCourseId,
      previewLessonTitle
    );

    /* ---------- the owner adds the Course Catalog section and publishes ---------- */
    const pages = await apiGet(request, owner, `/academies/${academyId}/website/pages`);
    expect(pages.ok(), await pages.text()).toBeTruthy();
    const pagesBody = await pages.json();
    const coursesPage = (
      (pagesBody.items ?? pagesBody) as {
        id: string;
        slug: string;
        version: number;
        sections: { type: string }[];
      }[]
    ).find((p) => p.slug === 'courses');
    expect(coursesPage, 'the website has its core "courses" page').toBeTruthy();

    if (!coursesPage!.sections.some((s) => s.type === 'courseCatalog')) {
      const updated = await apiPatch(
        request,
        owner,
        `/academies/${academyId}/website/pages/${coursesPage!.id}`,
        {
          expectedVersion: coursesPage!.version,
          sections: [
            ...coursesPage!.sections,
            {
              id: `e2e-course-catalog-${stamp}`,
              type: 'courseCatalog',
              enabled: true,
              visibility: { desktop: true, tablet: true, mobile: true },
              config: {
                title: { en: CATALOG_TITLE, ar: 'تصفح دوراتنا' },
                description: {
                  en: 'Search and filter every course we publish.',
                  ar: 'ابحث وصفِّ كل الدورات التي ننشرها.',
                },
                pageSize: 12,
                defaultSort: 'newest',
                showSearch: true,
                showLevelFilter: true,
                showPricingFilter: true,
                showSort: true,
              },
            },
          ],
        }
      );
      expect(updated.ok(), `page update refused: ${updated.status()} ${await updated.text()}`).toBeTruthy();
    }
    // Publishing bumps the configuration version the public cache is keyed by.
    const published = await apiPost(request, owner, `/academies/${academyId}/website/publish`);
    expect(published.ok(), `website publish refused: ${published.status()} ${await published.text()}`).toBeTruthy();

    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('an anonymous visitor filters the catalog by level and searches it', async () => {
    test.setTimeout(120_000);
    await page.goto(academyPath('/courses'));
    await expect(page.getByRole('heading', { name: CATALOG_TITLE })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(freeCourseTitle)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(paidCourseTitle)).toBeVisible();
    await expect(page.getByRole('status')).toContainText(/\d+ courses?/);

    // Level: Beginner keeps the free course and drops the advanced one.
    await page.getByRole('combobox', { name: 'Level' }).click();
    await page.getByRole('option', { name: 'Beginner', exact: true }).click();
    await expect(page.getByText(paidCourseTitle)).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByText(freeCourseTitle)).toBeVisible();

    await page.getByRole('combobox', { name: 'Level' }).click();
    await page.getByRole('option', { name: 'Any level' }).click();
    await expect(page.getByText(paidCourseTitle)).toBeVisible({ timeout: 30_000 });

    // Search narrows to the paid course.
    const search = page.getByLabel('Search courses');
    await search.fill(paidCourseTitle);
    await expect(page.getByText(freeCourseTitle)).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByText(paidCourseTitle)).toBeVisible();

    // A search nothing matches says so.
    await search.fill('zzz-no-such-course-zzz');
    await expect(page.getByText('No courses match your filters')).toBeVisible({
      timeout: 30_000,
    });
    await search.fill('');
    await expect(page.getByText(freeCourseTitle)).toBeVisible({ timeout: 30_000 });
  });

  test('the details page shows level, outcomes and requirements, and no rating block without reviews', async () => {
    test.setTimeout(120_000);
    const ratingLoaded = page.waitForResponse(
      (response) =>
        response.url().includes(`/courses/${freeCourseId}/rating`) &&
        response.request().method() === 'GET',
      { timeout: 60_000 }
    );
    await page.getByRole('link', { name: freeCourseTitle }).first().click();
    await expect(page).toHaveURL(new RegExp(`/courses/${freeCourseId}`), { timeout: 30_000 });
    await expect(page.getByRole('heading', { name: freeCourseTitle })).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByText('Beginner', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: "What you'll learn" })).toBeVisible();
    await expect(page.getByText(OUTCOME)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Requirements' })).toBeVisible();
    await expect(page.getByText(REQUIREMENT)).toBeVisible();

    // Not signed in: the page offers sign-in, not enrolment.
    await expect(page.getByRole('button', { name: 'Sign in to enroll' })).toBeVisible();

    // No approved reviews yet: the rating block is absent, not empty.
    await ratingLoaded;
    await expect(page.getByRole('heading', { name: 'Learner reviews' })).toHaveCount(0);
  });

  test('an anonymous visitor plays the free preview lesson without enrolling', async () => {
    test.setTimeout(120_000);
    await page.goto(academyPath(`/courses/${paidCourseId}`));
    await expect(page.getByRole('heading', { name: paidCourseTitle })).toBeVisible({
      timeout: 30_000,
    });

    // The curriculum accordion starts collapsed, so the sample is only
    // offered once the visitor opens the section it lives in.
    await page.getByRole('button', { name: /Free sample/ }).first().click();

    const previewButton = page.getByRole('button', {
      name: `Preview the lesson ${previewLessonTitle}`,
    });
    await expect(previewButton).toBeVisible({ timeout: 30_000 });
    await previewButton.click();

    // The dialog plays the sample for a visitor with no account at all.
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await expect(dialog.getByText(previewLessonTitle)).toBeVisible();
    const frame = dialog.locator('iframe[data-testid="youtube-lesson-player"]');
    await expect(frame).toBeVisible({ timeout: 30_000 });
    // Built from the server-vetted id on the privacy-enhanced host, never
    // from the lesson's raw URL.
    await expect(frame).toHaveAttribute(
      'src',
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/
    );

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 15_000 });
  });

  test('a learner registers, enrols in the free course, and writes a review that waits for moderation', async ({
    request,
  }) => {
    test.setTimeout(120_000);
    learnerEmail = uniqueLearnerEmail('j6');
    await registerLearnerThroughWebsite(page, learnerEmail, 'J6 Learner');
    await expect(
      page.getByText(/check your (email|inbox)|account created|verify/i).first()
    ).toBeVisible({ timeout: 20_000 });
    learner = await apiSignIn(request, {
      email: learnerEmail,
      password: LEARNER_PASSWORD,
      surface: 'academy',
      academyId,
    });

    await signInOnWebsite(page, learnerEmail);
    await page.goto(academyPath(`/courses/${freeCourseId}`));
    await page.getByRole('button', { name: 'Enroll for free' }).click({ timeout: 30_000 });
    // Enrolling deliberately takes the learner INTO the course
    // (`CourseDetailsTemplate.handleEnroll` navigates to the learner
    // course route), so the public page is left behind here.
    await expect(page).toHaveURL(/\/my\/courses\//, { timeout: 30_000 });
    expect((await enrollmentForCourse(request, learner, freeCourseId))?.status).toBe('enrolled');

    // Back on the public page, now enrolled: the review form is offered.
    // `MyCourseReviewForm` is gated on `isAuthenticated && isEnrolled`.
    await page.goto(academyPath(`/courses/${freeCourseId}`));
    await expect(page.getByRole('heading', { name: 'Write a review' })).toBeVisible({
      timeout: 30_000,
    });
    await page
      .getByRole('radiogroup', { name: 'Your rating' })
      .getByRole('radio', { name: '5 stars' })
      .click();
    await page.getByLabel('Your review (optional)').fill(REVIEW_BODY);
    await page.getByRole('button', { name: 'Submit review' }).click();
    await expect(
      page.getByText('Thanks! Your review is awaiting moderation before it appears publicly.')
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Awaiting review')).toBeVisible();

    // Still nothing public: the rating block stays absent while the review is pending.
    await expect(page.getByRole('heading', { name: 'Learner reviews' })).toHaveCount(0);
  });

  test('the owner approves the review and the public page shows it with its rating', async ({
    request,
  }) => {
    test.setTimeout(120_000);
    const moderation = await apiGet(
      request,
      owner,
      `/courses/${freeCourseId}/reviews/moderation`,
      { status: 'pending', pageSize: '50' }
    );
    expect(moderation.ok(), await moderation.text()).toBeTruthy();
    const pending = (
      (await moderation.json()).items as { id: string; studentId: string; status: string }[]
    ).find((r) => r.studentId === learner.userId);
    expect(pending, "the learner's review is in the moderation queue").toBeTruthy();

    const approved = await apiPost(
      request,
      owner,
      `/courses/${freeCourseId}/reviews/${pending!.id}/approve`
    );
    expect(approved.ok(), await approved.text()).toBeTruthy();
    expect((await approved.json()).status).toBe('approved');

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Learner reviews' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('5.0', { exact: true })).toBeVisible();
    await expect(page.getByText('1 review', { exact: true })).toBeVisible();
    // Scoped to the PUBLIC list: once approved the body legitimately
    // appears twice — the learner's own card in `MyCourseReviewForm`
    // still shows it too — so an unscoped match is ambiguous.
    await expect(
      page.getByRole('region', { name: 'Learner reviews' }).getByText(REVIEW_BODY)
    ).toBeVisible();
    await expect(page.getByText('Published', { exact: true })).toBeVisible();
  });

  test('the learner buys the paid course: method, proof, "submitted for review"', async () => {
    test.setTimeout(120_000);
    await page.goto(academyPath(`/courses/${paidCourseId}`));
    await expect(page.getByRole('heading', { name: paidCourseTitle })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Advanced', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Buy this course' }).click();
    await expect(page).toHaveURL(new RegExp(`/my/courses/${paidCourseId}/checkout`), {
      timeout: 30_000,
    });

    await expect(page.getByText('Payment method', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText(paidCourseTitle)).toBeVisible();
    // Selected by KEY, not display name: `seedPaymentMethod` sets
    // `displayName` to its label, so two catalog rows seeded by
    // different runs share a name and a name-based locator matches
    // both. The key is unique and is what the radio's id is built from.
    await page.locator(`#method-${method.key}`).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByText('Upload payment proof')).toBeVisible({ timeout: 30_000 });
    await page.getByLabel('Proof of payment').setInputFiles({
      name: 'proof.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    });
    await page.getByLabel('Note (optional)').fill('Transfer reference J6');
    await page.getByRole('button', { name: 'Submit for review' }).click();

    await expect(page.getByText('Payment submitted')).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText("Thanks! Your payment is under review. You'll be enrolled once it's approved.")
    ).toBeVisible();
  });

  test('the platform owner approves the payment and the learner is enrolled', async ({
    request,
  }) => {
    test.setTimeout(120_000);
    // Not enrolled while the payment waits for review.
    expect(await enrollmentForCourse(request, learner, paidCourseId)).toBeNull();

    const orders = await apiGet(request, learner, '/course-orders', { pageSize: '50' });
    expect(orders.ok(), await orders.text()).toBeTruthy();
    const order = ((await orders.json()).items as { id: string; courseId: string; status: string }[]).find(
      (o) => o.courseId === paidCourseId
    );
    expect(order, 'the checkout opened an order').toBeTruthy();
    expect(order!.status).toBe('pending_payment');

    const paymentId = await findPendingPaymentForOrder(request, platformOwner, order!.id);
    await approveCourseOrderPayment(request, platformOwner, paymentId);

    expect((await apiGet(request, learner, `/course-orders/${order!.id}`).then((r) => r.json())).status).toBe(
      'paid'
    );
    expect((await enrollmentForCourse(request, learner, paidCourseId))?.status).toBe('enrolled');

    // What the learner sees: the paid course is now theirs to continue.
    await page.goto(academyPath(`/courses/${paidCourseId}`));
    await expect(page.getByRole('button', { name: 'Continue Learning' })).toBeVisible({
      timeout: 30_000,
    });
    await page.goto(academyPath('/my/courses'));
    await expect(page.getByText(paidCourseTitle)).toBeVisible({ timeout: 30_000 });
  });
});
