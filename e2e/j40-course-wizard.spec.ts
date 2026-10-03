/**
 * J40 — Guided course wizard, Create → Publish (W6) with the simplified
 * quiz form (W7). Chromium against the real stack and database.
 *
 *  - Desktop, EN: "Create Course" on the course list opens the wizard;
 *    Basics creates the draft and the URL becomes `…/setup?step=details`;
 *    the stepper marks Basics completed and the current step with
 *    `aria-current="step"`; Details saves, a refresh keeps the step;
 *    Curriculum adds a unit with the shared curriculum editor; Publish is
 *    BLOCKED while nothing learner-visible exists; Assessments creates a
 *    published quiz in a side sheet (advanced settings collapsed behind
 *    "Advanced options") placed in the unit; Review turns ready; Publish
 *    publishes, and the API agrees.
 *  - Phone (390×844), EN: the same flow from Create to Publish with no
 *    horizontal scrolling, the compact "Step N of 8" stepper, keyboard
 *    movement in the stepper, and a client-side price check on Pricing.
 *  - Arabic smoke (RTL): "Continue setup" from the course list resumes a
 *    draft at its first incomplete step with translated copy.
 *  - Matrix: the Assessments step and the quiz sheet's collapsed
 *    "Advanced options" in EN and AR, desktop and phone, for the Owner; the
 *    Manager in Arabic on a phone; the Instructor is refused the wizard.
 *
 * NEEDS THE INTEGRATED REBUILD: idempotent create (`idempotencyKey`) and
 * `GET …/publish-readiness` are new backend code (W6).
 */
import {
  test,
  expect as baseExpect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import {
  API_BASE,
  SEED,
  apiGet,
  authHeader,
  findCourseByTitle,
  requireSeed,
  seedCookieDecision,
  signInThroughDashboard,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';
import { createCourse } from './support/phase4';
import {
  VARIANTS,
  applyVariant,
  captureEvidence,
  expectNoSidewaysScroll,
  setStoredLanguage,
  type Variant,
} from './support/evidence';

test.describe.configure({ mode: 'serial', timeout: 300_000 });
const expect = baseExpect.configure({ timeout: 45_000 });

const PHONE = { width: 390, height: 844 };

async function signIn(page: Page): Promise<void> {
  await clearAuthRateLimits();
  await seedCookieDecision(page);
  await signInThroughDashboard(page, SEED.owner, SEED.password);
  await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
}

async function setLanguage(page: Page, language: 'en' | 'ar'): Promise<void> {
  await page.evaluate(
    (lang) => localStorage.setItem('atlas:language', JSON.stringify(lang)),
    language
  );
  await page.reload();
}

const heading = (page: Page) => page.getByTestId('wizard-step-heading');
const stepper = (page: Page, name = 'Course setup steps') =>
  page.getByRole('navigation', { name });
const next = (page: Page) =>
  page.getByRole('button', { name: /^(Save and continue|Continue)$/ });

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/** Adds a unit through the embedded curriculum editor. */
async function addUnit(page: Page, title: string): Promise<void> {
  await page.getByRole('button', { name: 'Add Section' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Section Title').fill(title);
  await dialog.getByRole('button', { name: 'Save Section' }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('heading', { name: new RegExp(title) })
  ).toBeVisible();
}

/** Creates a published quiz in the Assessments sheet, placed in the default (first) unit. */
async function createQuizInSheet(page: Page, title: string): Promise<void> {
  await page.getByRole('button', { name: 'Create quiz' }).click();
  const sheet = page.getByRole('dialog', { name: 'Create quiz' });
  await expect(sheet).toBeVisible();
  // W7: essentials visible, the rest collapsed behind "Advanced options".
  const advanced = sheet.getByRole('button', { name: /Advanced options/ });
  await expect(advanced).toHaveAttribute('aria-expanded', 'false');
  await expect(
    sheet.getByRole('spinbutton', { name: /Passing score/ })
  ).toBeVisible();
  await expect(
    sheet.getByRole('combobox', { name: 'Integrity mode' })
  ).toHaveCount(0);
  // The wizard starts a quiz Published, so learners can take it.
  await expect(sheet.getByRole('combobox', { name: /^Status/ })).toContainText(
    'Published'
  );
  await sheet.getByRole('textbox', { name: 'Title' }).fill(title);
  await sheet.getByRole('textbox', { name: 'Prompt' }).fill('What is 2 + 2?');
  await sheet.getByRole('textbox', { name: 'Option 1' }).fill('4');
  await sheet.getByRole('textbox', { name: 'Option 2' }).fill('5');
  await sheet.getByRole('radio', { name: 'Correct' }).first().check();
  await sheet.getByRole('button', { name: 'Save Quiz' }).click();
  await expect(sheet).toBeHidden();
  await expect(page.getByText(title)).toBeVisible();
}

async function courseStatus(
  request: APIRequestContext,
  owner: Session,
  academyId: string,
  courseId: string
): Promise<string> {
  const res = await apiGet(
    request,
    owner,
    `/academies/${academyId}/courses/${courseId}`
  );
  expect(res.ok(), await res.text()).toBeTruthy();
  return (await res.json()).status as string;
}

/**
 * The Assessments step, then the quiz sheet: advanced settings start
 * collapsed (no integrity control) and the toggle reveals them.
 */
async function checkAssessmentsAndAdvanced(
  page: Page,
  variant: Variant,
  evidencePrefix: string
): Promise<void> {
  const ar = variant.language === 'ar';
  await expect(heading(page)).toHaveText(ar ? 'التقييمات' : 'Assessments', {
    timeout: 90_000,
  });
  await expect(
    stepper(page, ar ? 'خطوات إعداد الدورة' : 'Course setup steps')
  ).toBeVisible();
  await expectNoSidewaysScroll(page);
  await captureEvidence(page, `${evidencePrefix}-wizard-${variant.name}`);

  await page
    .getByRole('button', { name: ar ? 'إنشاء اختبار' : 'Create quiz' })
    .click();
  const sheet = page.getByRole('dialog', {
    name: ar ? 'إنشاء اختبار' : 'Create quiz',
  });
  await expect(sheet).toBeVisible();
  const advanced = sheet.getByRole('button', {
    name: ar ? /خيارات متقدمة/ : /Advanced options/,
  });
  const integrity = sheet.getByRole('combobox', {
    name: ar ? 'وضع النزاهة' : 'Integrity mode',
  });
  await expect(advanced).toHaveAttribute('aria-expanded', 'false');
  await expect(integrity).toHaveCount(0);
  await advanced.click();
  await expect(advanced).toHaveAttribute('aria-expanded', 'true');
  await expect(integrity).toBeVisible();
  await expectNoSidewaysScroll(page);
  await captureEvidence(
    page,
    `${evidencePrefix}-quiz-advanced-${variant.name}`
  );
}

test.describe('J40 — guided course wizard', () => {
  const stamp = `${Date.now()}`;
  const desktopTitle = `J40 Wizard ${stamp}`;
  const phoneTitle = `J40 Phone ${stamp}`;
  const arabicTitle = `J40 Arabic ${stamp}`;
  let academyId: string;
  let owner: Session;
  const toArchive: string[] = [];

  test.beforeAll(async ({ request }) => {
    await clearAuthRateLimits();
    ({ academyId, owner } = await requireSeed(request));
  });

  test.afterAll(async ({ request }) => {
    for (const id of toArchive) {
      await request
        .delete(`${API_BASE}/academies/${academyId}/courses/${id}`, {
          headers: authHeader(owner),
        })
        .catch(() => undefined);
    }
  });

  test('desktop (EN): Create → Basics → Details → Curriculum → Assessments → Review → Publish', async ({
    page,
    request,
  }, testInfo) => {
    await signIn(page);
    await page.goto(`/dashboard/academy/${academyId}/courses`);
    await page.getByRole('button', { name: 'Create Course' }).first().click();
    await page.waitForURL(/\/courses\/create$/);

    // Basics — only Basics is available before the course exists.
    await expect(heading(page)).toHaveText('Course basics');
    await expect(
      stepper(page).getByRole('button', { name: /^2\. Details/ })
    ).toHaveAttribute('aria-disabled', 'true');
    await page.getByLabel('Course Title').fill(desktopTitle);
    await expect(page.getByLabel('Course Slug')).toHaveValue(/^j40-wizard-/);
    await page.getByLabel('Short Description').fill('A guided-wizard journey.');
    await page.getByRole('button', { name: 'Create Course' }).click();

    // The draft exists; the address is the new course's wizard at Details.
    await page.waitForURL(/\/courses\/[^/]+\/setup\?step=details$/);
    const courseId = page.url().match(/\/courses\/([^/]+)\/setup/)![1];
    toArchive.push(courseId);
    expect(await courseStatus(request, owner, academyId, courseId)).toBe(
      'draft'
    );
    await expect(heading(page)).toHaveText('Course details');
    await expect(heading(page)).toBeFocused();
    await expect(
      stepper(page).getByRole('button', { name: '1. Basics, Completed' })
    ).toBeVisible();
    await expect(
      stepper(page).getByRole('button', { name: /^2\. Details/ })
    ).toHaveAttribute('aria-current', 'step');
    // Exactly one course was created for this title.
    expect(
      (await findCourseByTitle(request, owner, academyId, desktopTitle)).id
    ).toBe(courseId);

    // Details — saved per step; a refresh keeps the step and the data.
    await page
      .getByRole('textbox', { name: 'Description' })
      .fill('Everything a beginner needs, step by step.');
    await page
      .getByRole('textbox', { name: /What learners will achieve/i })
      .fill('Add two numbers');
    await next(page).click();
    await page.waitForURL(/step=media$/);
    await expect(heading(page)).toHaveText('Course image');
    await expect(
      stepper(page).getByRole('button', { name: '2. Details, Completed' })
    ).toBeVisible();
    await page.reload();
    await expect(heading(page)).toHaveText('Course image', { timeout: 90_000 });
    await page.getByRole('button', { name: 'Back' }).click();
    await page.waitForURL(/step=details$/);
    await expect(
      page.getByRole('textbox', { name: 'Description' })
    ).toHaveValue('Everything a beginner needs, step by step.');
    await next(page).click(); // untouched: nothing to save
    await page.waitForURL(/step=media$/);
    await next(page).click(); // no image yet — optional
    await page.waitForURL(/step=curriculum$/);

    // Curriculum — the shared editor, embedded.
    await expect(heading(page)).toHaveText('Curriculum');
    await addUnit(page, `Unit 1 ${stamp}`);
    await expect(
      stepper(page).getByRole('button', { name: /^4\. Curriculum/ })
    ).toHaveAttribute('aria-current', 'step');

    // Publish is blocked: nothing learner-visible yet (an empty unit).
    await stepper(page)
      .getByRole('button', { name: /^8\. Publish/ })
      .click();
    await page.waitForURL(/step=publish$/);
    await expect(
      page.getByRole('button', { name: 'Publish course' })
    ).toBeDisabled();
    await page.getByRole('button', { name: 'Go to Review' }).click();
    await page.waitForURL(/step=review$/);
    await expect(page.getByTestId('wizard-readiness-summary')).toHaveAttribute(
      'data-ready',
      'false'
    );
    const blocking = page.locator('[data-check="publishedActivity"]');
    await expect(blocking).toHaveAttribute('data-status', 'fail');
    await blocking.getByRole('button', { name: /Go to Curriculum/ }).click();
    await page.waitForURL(/step=curriculum$/);
    await next(page).click();
    await page.waitForURL(/step=assessments$/);

    // Assessments — a quiz-only activity is enough (J15's shape).
    await createQuizInSheet(page, `J40 Quiz ${stamp}`);
    await expect(page.getByText(`In Unit 1 ${stamp}`)).toBeVisible();
    await expect(
      stepper(page).getByRole('button', { name: '5. Assessments, Completed' })
    ).toBeVisible();
    await next(page).click();
    await page.waitForURL(/step=pricing$/);

    // Pricing — free and private by default; make it public.
    await page.getByRole('combobox', { name: /Visibility/ }).click();
    await page.getByRole('option', { name: 'Public' }).click();
    await next(page).click();
    await page.waitForURL(/step=review$/);

    // Review — ready.
    await expect(page.getByTestId('wizard-readiness-summary')).toHaveAttribute(
      'data-ready',
      'true'
    );
    await expect(page.getByText('Ready to publish')).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('review-ready-en.png'),
      fullPage: true,
    });
    await next(page).click();
    await page.waitForURL(/step=publish$/);

    // Publish.
    const publish = page.getByRole('button', { name: 'Publish course' });
    await expect(publish).toBeEnabled();
    await publish.click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Publish' })
      .click();
    await expect(page.getByTestId('wizard-published')).toBeVisible();
    await expect(
      stepper(page).getByRole('button', { name: '8. Publish, Completed' })
    ).toBeVisible();
    await expect
      .poll(() => courseStatus(request, owner, academyId, courseId))
      .toBe('published');
    await page.screenshot({ path: testInfo.outputPath('published-en.png') });

    // The classic builder still works for the same course.
    await page.goto(
      `/dashboard/academy/${academyId}/courses/${courseId}/builder`
    );
    await expect(
      page.getByRole('heading', { name: new RegExp(`Unit 1 ${stamp}`) })
    ).toBeVisible({ timeout: 90_000 });
  });

  test('phone 390px (EN): the whole flow without horizontal scroll; keyboard stepper; price check', async ({
    page,
    request,
  }, testInfo) => {
    await page.setViewportSize(PHONE);
    await signIn(page);
    await page.goto(`/dashboard/academy/${academyId}/courses/create`);
    await expect(heading(page)).toHaveText('Course basics', {
      timeout: 90_000,
    });
    await expectNoHorizontalScroll(page);
    await page.getByLabel('Course Title').fill(phoneTitle);
    await page.getByRole('button', { name: 'Create Course' }).click();
    await page.waitForURL(/\/setup\?step=details$/);
    const courseId = page.url().match(/\/courses\/([^/]+)\/setup/)![1];
    toArchive.push(courseId);

    // The compact stepper says where you are.
    await expect(
      stepper(page).getByText('Step 2 of 8 · Details')
    ).toBeVisible();
    await expectNoHorizontalScroll(page);

    // Keyboard: one tab stop, arrows move, Enter opens.
    const current = stepper(page).getByRole('button', { name: /^2\. Details/ });
    await current.focus();
    await page.keyboard.press('ArrowRight');
    await expect(
      stepper(page).getByRole('button', { name: /^3\. Media/ })
    ).toBeFocused();
    await page.keyboard.press('Enter');
    await page.waitForURL(/step=media$/);
    await expectNoHorizontalScroll(page);

    // Curriculum with a unit, then a quiz in the sheet.
    await stepper(page)
      .getByRole('button', { name: /^4\. Curriculum/ })
      .click();
    await page.waitForURL(/step=curriculum$/);
    await addUnit(page, `Phone Unit ${stamp}`);
    await expectNoHorizontalScroll(page);
    await next(page).click();
    await page.waitForURL(/step=assessments$/);
    await createQuizInSheet(page, `J40 Phone Quiz ${stamp}`);
    await expectNoHorizontalScroll(page);
    await next(page).click();
    await page.waitForURL(/step=pricing$/);

    // Paid without a price is refused before anything is sent.
    await page.getByRole('combobox', { name: /Pricing/ }).click();
    await page.getByRole('option', { name: 'Paid' }).click();
    await next(page).click();
    await expect(
      page.getByText('Enter a price greater than 0 for a paid course')
    ).toBeVisible();
    await expect(page).toHaveURL(/step=pricing$/);
    // Back to free: the step saves and moves on.
    await page.getByRole('combobox', { name: /Pricing/ }).click();
    await page.getByRole('option', { name: 'Free' }).click();
    await next(page).click();
    await page.waitForURL(/step=review$/);
    await expect(page.getByTestId('wizard-readiness-summary')).toHaveAttribute(
      'data-ready',
      'true'
    );
    await expectNoHorizontalScroll(page);
    await next(page).click();
    await page.waitForURL(/step=publish$/);
    await page.getByRole('button', { name: 'Publish course' }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Publish' })
      .click();
    await expect(page.getByTestId('wizard-published')).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.screenshot({
      path: testInfo.outputPath('published-phone.png'),
      fullPage: true,
    });
    await expect
      .poll(() => courseStatus(request, owner, academyId, courseId))
      .toBe('published');
  });

  test('Arabic smoke (RTL): "Continue setup" resumes a draft at its first incomplete step', async ({
    page,
    request,
  }, testInfo) => {
    const courseId = await createCourse(request, owner, academyId, {
      title: arabicTitle,
      pricing: { type: 'free' },
      description: 'Created by J40 for the Arabic smoke check.',
    });
    toArchive.push(courseId);

    await signIn(page);
    await page.goto(`/dashboard/academy/${academyId}/courses`);
    await setLanguage(page, 'ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const row = page.getByRole('row').filter({ hasText: arabicTitle });
    await expect(row).toBeVisible({ timeout: 90_000 });
    await row.getByRole('button').last().click();
    await page.getByRole('menuitem', { name: 'متابعة الإعداد' }).click();

    // Basics, Details (description) are done; Media (no image) is next.
    await page.waitForURL(
      new RegExp(`/courses/${courseId}/setup\\?step=media$`)
    );
    await expect(heading(page)).toHaveText('صورة الدورة');
    const nav = stepper(page, 'خطوات إعداد الدورة');
    await expect(
      nav.getByRole('button', { name: /^3\. الوسائط/ })
    ).toHaveAttribute('aria-current', 'step');
    await expect(
      nav.getByRole('button', { name: '1. الأساسيات, مكتملة' })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'رجوع' })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('continue-setup-ar.png'),
    });
    await setLanguage(page, 'en');
  });

  test('matrix (Owner): Assessments step and the quiz Advanced toggle in EN and AR, desktop and phone', async ({
    page,
    request,
  }) => {
    const courseId = await createCourse(request, owner, academyId, {
      title: `J40 Matrix ${stamp}`,
      pricing: { type: 'free' },
      description: 'Created by J40 for the locale and viewport matrix.',
    });
    toArchive.push(courseId);
    page.on('dialog', (dialog) => void dialog.accept());
    await signIn(page);
    await page.goto(
      `/dashboard/academy/${academyId}/courses/${courseId}/setup?step=assessments`
    );
    try {
      for (const variant of VARIANTS) {
        await applyVariant(page, variant);
        await checkAssessmentsAndAdvanced(page, variant, 'course');
      }
    } finally {
      await setStoredLanguage(page, 'en');
    }
  });

  test('Manager (AR phone) works in the wizard and sees the Advanced toggle; the Instructor is refused', async ({
    page,
    request,
  }) => {
    const courseId = await createCourse(request, owner, academyId, {
      title: `J40 Manager ${stamp}`,
      pricing: { type: 'free' },
      description: 'Created by J40 for the manager check.',
    });
    toArchive.push(courseId);
    const wizardUrl = `/dashboard/academy/${academyId}/courses/${courseId}/setup?step=assessments`;

    await clearAuthRateLimits();
    await seedCookieDecision(page);
    await signInThroughDashboard(page, SEED.manager, SEED.password);
    await page.waitForURL(/\/dashboard/, { timeout: 120_000 });
    await page.goto(wizardUrl);
    const arPhone = VARIANTS.find((v) => v.name === 'ar-phone')!;
    try {
      await applyVariant(page, arPhone);
      await checkAssessmentsAndAdvanced(page, arPhone, 'course-manager');
    } finally {
      await setStoredLanguage(page, 'en');
    }

    // The Instructor keeps the classic builder: no wizard for her.
    const context = await page.context().browser()!.newContext();
    const instructorPage = await context.newPage();
    try {
      await clearAuthRateLimits();
      await seedCookieDecision(instructorPage);
      await signInThroughDashboard(
        instructorPage,
        SEED.instructor,
        SEED.password
      );
      await instructorPage.waitForURL(/\/dashboard/, { timeout: 120_000 });
      await instructorPage.goto(wizardUrl);
      // The route guard sends her away from the wizard's address.
      await expect(instructorPage).not.toHaveURL(/\/setup\?step=/, {
        timeout: 60_000,
      });
      await expect(
        instructorPage.getByTestId('wizard-step-heading')
      ).toHaveCount(0, {
        timeout: 30_000,
      });
      await expect(
        instructorPage.getByRole('navigation', { name: 'Course setup steps' })
      ).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});
