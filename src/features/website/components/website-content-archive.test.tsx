/**
 * FAQ / testimonial library: archiving is final.
 *
 * The server refuses to publish or archive an archived entry
 * (`WebsiteContentService`, `errors.website.contentArchived`) and still
 * lets it be edited. The confirmation used to say archiving "can be
 * reversed later"; these tests pin what the screen now says and offers:
 *  - the confirmation says it can't be undone and the entry can't be
 *    published again (EN and AR);
 *  - an archived entry has no Publish or Archive control, but still opens
 *    in the editor.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import type { WebsiteContentStatus, WebsiteFaqEntry } from '@types';

const ACADEMY = 'academy-1';

let faqs: WebsiteFaqEntry[] = [];
const archiveFaqEntry = vi.fn();
const confirm = vi.fn();

vi.mock('../services/WebsiteContentService', () => ({
  websiteContentService: {
    getFaqEntries: async () => ({
      items: faqs,
      pagination: {
        page: 1,
        pageSize: 50,
        totalItems: faqs.length,
        totalPages: 1,
      },
    }),
    getTestimonialEntries: vi.fn(),
    updateFaqEntry: vi.fn(),
    createFaqEntry: vi.fn(),
    publishFaqEntry: vi.fn(),
    archiveFaqEntry: (...args: unknown[]) =>
      archiveFaqEntry(...args) as unknown,
    createTestimonialEntry: vi.fn(),
    updateTestimonialEntry: vi.fn(),
    publishTestimonialEntry: vi.fn(),
    archiveTestimonialEntry: vi.fn(),
  },
}));

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ hasPermission: () => true }),
  useUnsavedChanges: () => undefined,
}));

vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useConfirmDialog: () => ({ confirm }),
  useToast: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}));

vi.mock('./WebsiteImageField', () => ({ WebsiteImageField: () => null }));

const { WebsiteFaqContentTab } = await import('./WebsiteFaqContentTab');

function faq(id: string, status: WebsiteContentStatus): WebsiteFaqEntry {
  return {
    id,
    academyId: ACADEMY,
    question: { en: `Question ${id}`, ar: '' },
    answer: { en: 'Answer', ar: '' },
    order: 1,
    visible: true,
    status,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  };
}

async function renderTab() {
  const i18n = await createI18nInstance('en');
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <WebsiteFaqContentTab academyId={ACADEMY} />
      </QueryClientProvider>
    </I18nextProvider>
  );
}

beforeEach(() => {
  faqs = [];
  archiveFaqEntry.mockReset();
  confirm.mockReset().mockResolvedValue(false);
});

afterEach(cleanup);

describe('archive confirmation copy', () => {
  it('says archiving cannot be undone and the entry cannot be published again (EN and AR)', async () => {
    const en = await createI18nInstance('en');
    const ar = await createI18nInstance('ar');
    const enText = en.t('website:content.archiveConfirmDescription');
    const arText = ar.t('website:content.archiveConfirmDescription');

    expect(enText).not.toMatch(/revers/i);
    expect(enText).toContain("can't be undone");
    expect(enText).toContain("can't be published again");
    expect(arText).not.toContain('يمكن التراجع عنه لاحقًا');
    expect(arText).toContain('لا يمكن التراجع عنه');
    expect(arText).toContain('لا يمكن نشره مرة أخرى');

    // The server's refusal no longer tells the user to "restore" it.
    expect(en.t('errors:website.contentArchived')).not.toMatch(/restore/i);
    expect(ar.t('errors:website.contentArchived')).not.toContain('استعِده');
  });

  it('asks with that copy before archiving a published entry', async () => {
    faqs = [faq('f1', 'published')];
    await renderTab();
    await screen.findByText('Question f1');

    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    await waitFor(() =>
      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          descriptionKey: 'website:content.archiveConfirmDescription',
        })
      )
    );
    // Declined: nothing is archived.
    expect(archiveFaqEntry).not.toHaveBeenCalled();
  });
});

describe('an archived entry', () => {
  it('offers no Publish or Archive control but still opens in the editor', async () => {
    faqs = [faq('f1', 'archived')];
    await renderTab();
    await screen.findByText('Question f1');

    expect(screen.getByText('Archived')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();

    fireEvent.click(screen.getByText('Question f1'));
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });
});
