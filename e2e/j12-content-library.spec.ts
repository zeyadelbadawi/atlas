/**
 * J12 — the FAQ & testimonial content library, end to end (P3), Chromium
 * against the real stack and database.
 *
 * The Academy Owner picks library entries for the FAQs page in the
 * dashboard's section editor (add, reorder) and publishes; an anonymous
 * visitor then sees exactly the published, visible entries in that order
 * — in English and Arabic — without the page ever calling the
 * authenticated management API; a draft never shows; an edit and a hide
 * show on the very next visit (no stale cache); another Academy's site
 * never shows these entries.
 */
import {
  test,
  expect,
  type APIRequestContext,
  type Request,
} from '@playwright/test';
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
const Q = (label: string) => ({
  en: `J12 ${label} question ${stamp}`,
  ar: `سؤال ${label} J12 ${stamp}`,
});
const A = (label: string) => ({
  en: `J12 ${label} answer.`,
  ar: `جواب ${label}.`,
});

test.describe('J12 — content library on the public site', () => {
  let academyId: string;
  let owner: Session;
  const ids: Record<'first' | 'second' | 'draft', string> = {
    first: '',
    second: '',
    draft: '',
  };
  let faqsPageId: string;

  test.beforeAll(async ({ request }) => {
    await clearAuthRateLimits();
    ({ academyId, owner } = await requireSeed(request));
    for (const key of ['first', 'second', 'draft'] as const) {
      const created = await apiPost(
        request,
        owner,
        `/academies/${academyId}/website/faq-entries`,
        {
          question: Q(key),
          answer: A(key),
        }
      );
      expect(created.status(), await created.text()).toBe(201);
      ids[key] = (await created.json()).id;
      if (key !== 'draft') {
        const published = await apiPost(
          request,
          owner,
          `/academies/${academyId}/website/faq-entries/${ids[key]}/publish`
        );
        expect(published.status()).toBe(201);
      }
    }
    const pages = await (
      await apiGet(request, owner, `/academies/${academyId}/website/pages`)
    ).json();
    faqsPageId = (
      (pages.items ?? pages) as { id: string; slug: string }[]
    ).find((p) => p.slug === 'faqs')!.id;
    await clearLibraryPicks(request);
  });

  /** Start (and end) with no library picks on the FAQs section. */
  async function clearLibraryPicks(request: APIRequestContext) {
    const page = await (
      await apiGet(
        request,
        owner,
        `/academies/${academyId}/website/pages/${faqsPageId}`
      )
    ).json();
    const sections = (
      page.sections as { type: string; config: Record<string, unknown> }[]
    ).map((section) =>
      section.type === 'faq'
        ? { ...section, config: { ...section.config, libraryEntryIds: [] } }
        : section
    );
    const restored = await apiPatch(
      request,
      owner,
      `/academies/${academyId}/website/pages/${faqsPageId}`,
      { sections, expectedVersion: page.version }
    );
    expect(restored.status(), await restored.text()).toBe(200);
  }

  // Leave the shared seed as found: take the entries off the page, archive
  // them, republish.
  test.afterAll(async ({ request }) => {
    await clearLibraryPicks(request);
    for (const id of Object.values(ids)) {
      await apiPost(
        request,
        owner,
        `/academies/${academyId}/website/faq-entries/${id}/archive`
      );
    }
    await apiPost(request, owner, `/academies/${academyId}/website/publish`);
  });

  test('the Owner picks and orders library entries in the section editor, then publishes', async ({
    page,
    request,
  }, testInfo) => {
    test.setTimeout(150_000);
    await seedCookieDecision(page);
    await signInThroughDashboard(page, SEED.owner, SEED.password);
    await page.waitForURL(/dashboard/, { timeout: 30_000 });
    await page.goto(
      `/dashboard/academy/${academyId}/website/pages/${faqsPageId}`
    );
    await page.getByRole('button', { name: 'Edit section' }).nth(1).click();
    const dialog = page.getByRole('dialog');
    const available = dialog.getByTestId('library-available');
    // Published entries can be added; the draft is not offered.
    await expect(available).toContainText(Q('first').en);
    await expect(available).not.toContainText(Q('draft').en);
    await available
      .getByRole('button', { name: `Add “${Q('first').en}”` })
      .click();
    await available
      .getByRole('button', { name: `Add “${Q('second').en}”` })
      .click();
    // Put "second" first.
    await dialog
      .getByRole('button', { name: `Move “${Q('second').en}” up` })
      .click();
    const picked = dialog.getByTestId('library-selected').getByRole('listitem');
    await expect(picked.nth(0)).toContainText(Q('second').en);
    await expect(picked.nth(1)).toContainText(Q('first').en);
    await dialog.screenshot({ path: testInfo.outputPath('picker.png') });
    await dialog.getByRole('button', { name: 'Apply changes' }).click();
    await page.getByTestId('website-save-page').click();
    await expect
      .poll(
        async () => {
          const saved = await (
            await apiGet(
              request,
              owner,
              `/academies/${academyId}/website/pages/${faqsPageId}`
            )
          ).json();
          const faq = (
            saved.sections as {
              type: string;
              config: { libraryEntryIds?: string[] };
            }[]
          ).find((s) => s.type === 'faq');
          return faq?.config.libraryEntryIds ?? [];
        },
        { timeout: 20_000 }
      )
      .toEqual([ids.second, ids.first]);
    const published = await apiPost(
      request,
      owner,
      `/academies/${academyId}/website/publish`
    );
    expect(published.status(), await published.text()).toBeLessThan(300);
  });

  for (const locale of ['en', 'ar'] as const) {
    test(`a visitor (${locale}) sees the published entries in the Owner's order, never the draft, and never calls the management API`, async ({
      page,
    }, testInfo) => {
      const managementCalls: string[] = [];
      page.on('request', (r: Request) => {
        if (
          /\/academies\/[^/]+\/website\/(faq|testimonial)-entries/.test(r.url())
        )
          managementCalls.push(r.url());
      });
      await seedCookieDecision(page);
      await page.goto(academyPath(locale === 'en' ? '/faqs' : '/ar/faqs'));
      const main = page.locator('main');
      const second = main.getByText(Q('second')[locale], { exact: true });
      const first = main.getByText(Q('first')[locale], { exact: true });
      await expect(second).toBeVisible({ timeout: 30_000 });
      await expect(first).toBeVisible();
      expect((await second.boundingBox())!.y).toBeLessThan(
        (await first.boundingBox())!.y
      );
      await expect(main.getByText(Q('draft')[locale])).toHaveCount(0);
      expect(managementCalls).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(`faqs-${locale}.png`),
        fullPage: true,
      });
    });
  }

  test('an edit and a hide show on the very next visit (no stale cache)', async ({
    page,
    request,
  }) => {
    await seedCookieDecision(page);
    const edited = {
      en: `J12 edited question ${stamp}`,
      ar: `سؤال معدّل ${stamp}`,
    };
    const patch = await apiPatch(
      request,
      owner,
      `/academies/${academyId}/website/faq-entries/${ids.first}`,
      { question: edited }
    );
    expect(patch.status(), await patch.text()).toBe(200);
    await page.goto(academyPath('/faqs'));
    await expect(
      page.locator('main').getByText(edited.en, { exact: true })
    ).toBeVisible({ timeout: 30_000 });

    const hide = await apiPatch(
      request,
      owner,
      `/academies/${academyId}/website/faq-entries/${ids.second}`,
      { visible: false }
    );
    expect(hide.status()).toBe(200);
    await page.goto(academyPath('/faqs'));
    await expect(
      page.locator('main').getByText(edited.en, { exact: true })
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('main').getByText(Q('second').en)).toHaveCount(0);
  });

  test('another Academy’s public site never shows these entries', async ({
    request,
  }) => {
    const other = await request.get(
      `${process.env.E2E_API_BASE_URL ?? 'http://localhost:3000/api/v1'}/public/websites/resolve`,
      {
        params: { hostname: 'language-learning-hub' },
      }
    );
    expect(other.ok()).toBeTruthy();
    const otherId = (await other.json()).academyId as string;
    const pages = await request.get(
      `${process.env.E2E_API_BASE_URL ?? 'http://localhost:3000/api/v1'}/public/websites/${otherId}/pages`
    );
    expect(pages.ok()).toBeTruthy();
    expect(await pages.text()).not.toContain(`${stamp}`);
  });
});
