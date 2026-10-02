/**
 * J14 — draft and live are separate (2 Oct 2026), Chromium against the real
 * stack and database.
 *
 * Before this, a saved page went public within the pages cache's TTL with
 * no publish, and a live site's only button was "Unpublish" — so Owners
 * republished (or took the site offline and back) to make a change appear.
 * Here the Owner saves a change to the FAQs page; the live site, in English
 * and in Arabic (RTL), keeps showing the published version; the dashboard
 * says what is unpublished; "Publish page" in the editor makes exactly that
 * page live on the next visit; "Publish changes" on the bar publishes the
 * rest. The shared seed is restored afterwards.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import {
  SEED,
  academyPath,
  apiGet,
  apiPatch,
  apiPost,
  requireSeed,
  seedCookieDecision,
  signInThroughDashboard,
  type Session,
} from './support/atlas';
import { clearAuthRateLimits } from './support/global-setup';

test.describe.configure({ mode: 'serial' });

const stamp = Date.now();
const draftTitle = {
  en: `J14 draft heading ${stamp}`,
  ar: `عنوان مسودة J14 ${stamp}`,
};
const liveTitle = {
  en: `J14 live heading ${stamp}`,
  ar: `عنوان منشور J14 ${stamp}`,
};

interface Section {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

test.describe('J14 — draft and live are separate', () => {
  let academyId: string;
  let owner: Session;
  let faqsPageId: string;
  let originalSections: Section[];

  async function page(request: APIRequestContext) {
    return (
      await apiGet(
        request,
        owner,
        `/academies/${academyId}/website/pages/${faqsPageId}`
      )
    ).json() as Promise<{
      version: number;
      sections: Section[];
      hasUnpublishedChanges?: boolean;
    }>;
  }

  async function saveFaqTitle(
    request: APIRequestContext,
    title: { en: string; ar: string } | undefined
  ) {
    const current = await page(request);
    const sections = current.sections.map((section) =>
      section.type === 'faq'
        ? { ...section, config: { ...section.config, title } }
        : section
    );
    const saved = await apiPatch(
      request,
      owner,
      `/academies/${academyId}/website/pages/${faqsPageId}`,
      { sections, expectedVersion: current.version }
    );
    expect(saved.status(), await saved.text()).toBe(200);
  }

  test.beforeAll(async ({ request }) => {
    await clearAuthRateLimits();
    ({ academyId, owner } = await requireSeed(request));
    const pages = await (
      await apiGet(request, owner, `/academies/${academyId}/website/pages`)
    ).json();
    faqsPageId = (
      (pages.items ?? pages) as { id: string; slug: string }[]
    ).find((p) => p.slug === 'faqs')!.id;
    originalSections = (await page(request)).sections;
    // Start from a published site with this title live.
    await saveFaqTitle(request, liveTitle);
    const published = await apiPost(
      request,
      owner,
      `/academies/${academyId}/website/publish`
    );
    expect(published.status(), await published.text()).toBeLessThan(300);
  });

  test.afterAll(async ({ request }) => {
    const current = await page(request);
    await apiPatch(
      request,
      owner,
      `/academies/${academyId}/website/pages/${faqsPageId}`,
      {
        sections: originalSections,
        expectedVersion: current.version,
      }
    );
    await apiPost(request, owner, `/academies/${academyId}/website/publish`);
  });

  test('a saved edit stays private: the live site keeps the published version (EN and AR)', async ({
    page: browser,
    request,
  }, testInfo) => {
    await saveFaqTitle(request, draftTitle);
    expect((await page(request)).hasUnpublishedChanges).toBe(true);

    await seedCookieDecision(browser);
    for (const locale of ['en', 'ar'] as const) {
      await browser.goto(academyPath(locale === 'en' ? '/faqs' : '/ar/faqs'));
      const main = browser.locator('main');
      await expect(
        main.getByText(liveTitle[locale], { exact: true })
      ).toBeVisible({
        timeout: 30_000,
      });
      await expect(main.getByText(draftTitle[locale])).toHaveCount(0);
      await expect(browser.locator('html')).toHaveAttribute(
        'dir',
        locale === 'ar' ? 'rtl' : 'ltr'
      );
      await browser.screenshot({
        path: testInfo.outputPath(`live-before-${locale}.png`),
        fullPage: true,
      });
    }
  });

  test('the editor says the page has unpublished changes, and "Publish page" makes exactly it live', async ({
    page: browser,
    request,
  }, testInfo) => {
    test.setTimeout(150_000);
    await seedCookieDecision(browser);
    await signInThroughDashboard(browser, SEED.owner, SEED.password);
    await browser.waitForURL(/dashboard/, { timeout: 30_000 });
    await browser.goto(
      `/dashboard/academy/${academyId}/website/pages/${faqsPageId}`
    );

    // The bar: live, with a pending page.
    await expect(browser.getByTestId('website-publish-hint')).toContainText(
      'This website is live.',
      { timeout: 30_000 }
    );
    await expect(browser.getByTestId('website-publish-hint')).toContainText(
      /1 page has unpublished changes|pages have unpublished changes/
    );
    await expect(
      browser.getByTestId('website-page-publish-state')
    ).toContainText("This page has saved changes that visitors don't see yet.");
    await browser.screenshot({
      path: testInfo.outputPath('editor-pending.png'),
    });

    await browser.getByTestId('website-publish-page').click();
    await browser
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Publish page' })
      .click();
    await expect(
      browser.getByTestId('website-page-publish-state')
    ).toContainText('Visitors see the saved version of this page.', {
      timeout: 30_000,
    });
    expect((await page(request)).hasUnpublishedChanges).toBe(false);

    // The very next visit shows it, in both languages.
    const visitor = await browser.context().browser()!.newPage();
    await seedCookieDecision(visitor);
    for (const locale of ['en', 'ar'] as const) {
      await visitor.goto(academyPath(locale === 'en' ? '/faqs' : '/ar/faqs'));
      await expect(
        visitor.locator('main').getByText(draftTitle[locale], { exact: true })
      ).toBeVisible({ timeout: 30_000 });
      await visitor.screenshot({
        path: testInfo.outputPath(`live-after-${locale}.png`),
        fullPage: true,
      });
    }
    await visitor.close();
  });

  test('"Publish changes" on the bar publishes the remaining saved edits', async ({
    page: browser,
    request,
  }) => {
    test.setTimeout(150_000);
    await saveFaqTitle(request, liveTitle);
    await seedCookieDecision(browser);
    await signInThroughDashboard(browser, SEED.owner, SEED.password);
    await browser.waitForURL(/dashboard/, { timeout: 30_000 });
    await browser.goto(`/dashboard/academy/${academyId}/website`);
    const publishChanges = browser.getByTestId('website-publish-changes');
    await expect(publishChanges).toBeEnabled({ timeout: 30_000 });
    await publishChanges.click();
    // The seed's home page holds sample testimonials, so the existing
    // warning comes first (a warning, never a block); otherwise the plain
    // confirmation does.
    const dialog = browser.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    const sampleWarning = browser.getByTestId('publish-sample-warning');
    if (await sampleWarning.isVisible()) {
      await sampleWarning
        .getByRole('button', { name: 'Publish anyway' })
        .click();
    } else {
      await dialog.getByRole('button', { name: 'Publish changes' }).click();
    }
    await expect(browser.getByTestId('website-publish-hint')).toContainText(
      'This website is live and shows everything you have saved.',
      { timeout: 30_000 }
    );
    await expect(publishChanges).toBeDisabled();

    const visitor = await browser.context().browser()!.newPage();
    await seedCookieDecision(visitor);
    await visitor.goto(academyPath('/faqs'));
    await expect(
      visitor.locator('main').getByText(liveTitle.en, { exact: true })
    ).toBeVisible({ timeout: 30_000 });
    await visitor.close();
  });
});
