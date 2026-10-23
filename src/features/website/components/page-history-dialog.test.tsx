/**
 * CMS phase 4 — page history: the list (what each version is, who, when),
 * the read-only preview, and "Restore to draft" — confirmed first, saving
 * unsaved edits first, and each refusal explained (stale, no longer valid,
 * address taken).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type {
  WebsiteConfiguration,
  WebsitePage,
  WebsitePageVersion,
  WebsitePageVersionSummary,
} from '@types';
import { createApiError } from '@/services/api/api-error';
import { PageHistoryDialog } from './PageHistoryDialog';
import { invalidPartsOf } from '../utils/page-history.utils';

const restoreMutateAsync = vi.fn();
const refetchVersions = vi.fn();
let versions: WebsitePageVersionSummary[] = [];
let fullVersion: WebsitePageVersion | undefined;

vi.mock('../hooks/usePageVersions', () => ({
  useWebsitePageVersions: () => ({
    data: { items: versions },
    isLoading: false,
    error: null,
    refetch: refetchVersions,
  }),
  useWebsitePageVersion: (_a: string, _p: string, id: string | undefined) => ({
    data: id ? fullVersion : undefined,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useRestoreWebsitePageVersion: () => ({
    mutateAsync: restoreMutateAsync,
    reset: vi.fn(),
    isPending: false,
  }),
}));
vi.mock('../renderer', () => ({
  WebsiteRenderer: ({ page }: { page: WebsitePage }) => (
    <ol data-testid="rendered-page">
      {page.sections.map((section) => (
        <li key={section.id}>{section.type}</li>
      ))}
    </ol>
  ),
}));
vi.mock('./PreviewViewport', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  PreviewViewport: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="preview-viewport">{children}</div>
  ),
}));

const page = {
  id: 'p1',
  academyId: 'a1',
  pageType: 'custom',
  title: 'Offers',
  slug: 'offers',
  visible: true,
  seo: {},
  sections: [],
  version: 7,
  createdAt: '',
  updatedAt: '',
} as unknown as WebsitePage;

const summary = (
  id: string,
  kind: WebsitePageVersionSummary['kind'],
  name: string | null
): WebsitePageVersionSummary => ({
  id,
  pageId: 'p1',
  kind,
  title: 'Offers',
  slug: 'offers',
  visible: true,
  sourceVersion: 5,
  createdAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
  createdBy: name ? { id: 'u1', name } : null,
});

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof PageHistoryDialog>> = {},
  language: 'en' | 'ar' = 'en'
) {
  const props: React.ComponentProps<typeof PageHistoryDialog> = {
    academyId: 'a1',
    page,
    academyName: 'Acme',
    configuration: {} as WebsiteConfiguration,
    previewPages: [],
    initialLocale: 'en',
    open: true,
    onOpenChange: vi.fn(),
    canRestore: true,
    localEdits: 'none',
    onSaveLocalEdits: vi.fn(),
    onRestored: vi.fn(),
    onPageChanged: vi.fn(),
    ...overrides,
  };
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <PageHistoryDialog {...props} />
    </I18nextProvider>
  );
  return props;
}

async function chooseAndConfirm(kindLabel: RegExp) {
  fireEvent.click(screen.getByRole('button', { name: kindLabel }));
  fireEvent.click(await screen.findByTestId('page-history-restore'));
  const confirm = await screen.findByTestId('page-history-confirm');
  return confirm;
}

beforeEach(() => {
  versions = [
    summary('v3', 'restore_backup', 'Mona'),
    summary('v2', 'draft_snapshot', null),
    summary('v1', 'published', 'Omar'),
  ];
  fullVersion = {
    ...summary('v1', 'published', 'Omar'),
    seo: {},
    sections: [
      { id: 's1', type: 'hero', enabled: true, config: {} },
      { id: 's2', type: 'faq', enabled: true, config: {} },
    ] as unknown as WebsitePageVersion['sections'],
  };
  restoreMutateAsync.mockReset();
  refetchVersions.mockReset();
});
afterEach(cleanup);

describe('page history', () => {
  it('lists each version with what it is, who and when', () => {
    renderDialog();
    const list = screen.getByTestId('page-history-list');
    const items = within(list).getAllByRole('button');
    expect(items.map((item) => item.getAttribute('data-version-kind'))).toEqual(
      ['restore_backup', 'draft_snapshot', 'published']
    );
    expect(items[0].textContent).toContain('Before restore');
    expect(items[0].textContent).toContain('by Mona');
    expect(items[0].textContent).toContain('3 hours ago');
    expect(items[1].textContent).toContain('Auto-saved draft');
    expect(items[1].textContent).toContain('someone no longer on the team');
    expect(items[2].textContent).toContain('Published');
    // The exact time too, machine-readable.
    expect(items[0].querySelector('time')?.getAttribute('datetime')).toBe(
      versions[0].createdAt
    );
  });

  it('labels versions in Arabic', () => {
    renderDialog({}, 'ar');
    const items = within(screen.getByTestId('page-history-list')).getAllByRole(
      'button'
    );
    expect(items[0].textContent).toContain('قبل الاستعادة');
    expect(items[2].textContent).toContain('منشورة');
  });

  it('previews a version read-only in the page frame', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /Published/ }));
    const preview = screen.getByTestId('page-history-preview');
    expect(
      within(preview)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(['hero', 'faq']);
  });

  it('explains the restore before doing it, and restores against the current version', async () => {
    const restored = { ...page, version: 8 };
    restoreMutateAsync.mockResolvedValue(restored);
    const props = renderDialog();
    const confirm = await chooseAndConfirm(/Published/);
    expect(confirm.textContent).toContain('replaced by the Published version');
    expect(confirm.textContent).toContain("The live site doesn't change");
    expect(confirm.textContent).toContain('“Before restore”');
    expect(restoreMutateAsync).not.toHaveBeenCalled();
    fireEvent.click(
      within(confirm).getByRole('button', { name: 'Restore to draft' })
    );
    await waitFor(() =>
      expect(props.onRestored).toHaveBeenCalledWith(restored)
    );
    expect(restoreMutateAsync).toHaveBeenCalledWith({
      academyId: 'a1',
      pageId: 'p1',
      versionId: 'v1',
      expectedVersion: 7,
    });
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('saves unsaved edits first and restores against the version just saved', async () => {
    restoreMutateAsync.mockResolvedValue({ ...page, version: 10 });
    const onSaveLocalEdits = vi.fn().mockResolvedValue({ ...page, version: 9 });
    renderDialog({ localEdits: 'save', onSaveLocalEdits });
    const confirm = await chooseAndConfirm(/Published/);
    expect(confirm.textContent).toContain('will be saved first');
    fireEvent.click(
      within(confirm).getByRole('button', { name: 'Restore to draft' })
    );
    await waitFor(() => expect(restoreMutateAsync).toHaveBeenCalled());
    expect(onSaveLocalEdits).toHaveBeenCalledTimes(1);
    expect(restoreMutateAsync.mock.calls[0][0].expectedVersion).toBe(9);
  });

  it('restores nothing when the unsaved edits could not be saved', async () => {
    renderDialog({
      localEdits: 'save',
      onSaveLocalEdits: vi.fn().mockResolvedValue(null),
    });
    const confirm = await chooseAndConfirm(/Published/);
    fireEvent.click(
      within(confirm).getByRole('button', { name: 'Restore to draft' })
    );
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(restoreMutateAsync).not.toHaveBeenCalled();
  });

  it('refreshes and says so when the page was saved meanwhile', async () => {
    restoreMutateAsync.mockRejectedValue(
      createApiError('conflict', {
        code: 'stale_resource_version',
        messageKey: 'errors.concurrency.staleVersion',
        details: { currentVersion: 8, lastEditedByName: 'Mona' },
      })
    );
    const props = renderDialog();
    const confirm = await chooseAndConfirm(/Published/);
    fireEvent.click(
      within(confirm).getByRole('button', { name: 'Restore to draft' })
    );
    const failure = await screen.findByTestId('page-history-failure');
    expect(failure.getAttribute('data-failure')).toBe('stale');
    expect(failure.textContent).toContain('Mona saved this page');
    expect(props.onPageChanged).toHaveBeenCalled();
    expect(refetchVersions).toHaveBeenCalled();
    expect(props.onRestored).not.toHaveBeenCalled();
  });

  it('names the parts that no longer pass and offers nothing destructive', async () => {
    restoreMutateAsync.mockRejectedValue(
      createApiError('validation', {
        code: 'website_page_version_invalid',
        messageKey: 'errors.website.versionNoLongerValid',
        status: 422,
        violations: [
          { field: 'sections.1.config.items', messageKey: 'validation:x' },
          { field: 'seo.metaTitle.en', messageKey: 'validation:x' },
          { field: 'sections.1.type', messageKey: 'validation:x' },
        ],
      })
    );
    renderDialog();
    const confirm = await chooseAndConfirm(/Published/);
    fireEvent.click(
      within(confirm).getByRole('button', { name: 'Restore to draft' })
    );
    const failure = await screen.findByTestId('page-history-failure');
    expect(failure.getAttribute('data-failure')).toBe('invalid');
    const parts = within(failure)
      .getAllByRole('listitem')
      .map((item) => item.textContent);
    expect(parts).toEqual(['The search-engine text', 'Section 2: FAQ']);
    expect(within(failure).queryByRole('button')).toBeNull();
  });

  it('says when the version address now belongs to another page', async () => {
    restoreMutateAsync.mockRejectedValue(
      createApiError('conflict', { messageKey: 'errors.website.slugTaken' })
    );
    renderDialog();
    const confirm = await chooseAndConfirm(/Published/);
    fireEvent.click(
      within(confirm).getByRole('button', { name: 'Restore to draft' })
    );
    const failure = await screen.findByTestId('page-history-failure');
    expect(failure.getAttribute('data-failure')).toBe('slugTaken');
    expect(failure.textContent).toContain('/offers');
  });

  it('offers no restore to someone who cannot manage the page', () => {
    renderDialog({ canRestore: false });
    fireEvent.click(screen.getByRole('button', { name: /Published/ }));
    expect(screen.queryByTestId('page-history-restore')).toBeNull();
  });
});

describe('invalidPartsOf', () => {
  it('orders page fields first, then sections, each once', () => {
    expect(
      invalidPartsOf(
        [
          { field: 'sections.3.config.title.en' },
          { field: 'slug' },
          { field: 'sections.0.type' },
          { field: 'sections.3.type' },
          { field: 'title' },
          { field: 'weird' },
        ],
        [{ type: 'hero' }, { type: 'about' }, { type: 'faq' }, { type: 'cta' }]
      )
    ).toEqual([
      { kind: 'title' },
      { kind: 'slug' },
      { kind: 'other' },
      { kind: 'section', index: 0, sectionType: 'hero' },
      { kind: 'section', index: 3, sectionType: 'cta' },
    ]);
  });
});
