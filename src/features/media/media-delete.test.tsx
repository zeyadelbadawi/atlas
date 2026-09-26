/**
 * Deleting media from the Academy Media page and the Media Library picker.
 *
 * The service is replaced by a small in-memory academy library so the real
 * hooks, query cache and confirm flow run end to end: what is pinned here
 * is which request is sent, when, and what the person reads afterwards.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { ApiError } from '@api';
import type {
  CollectionQuery,
  MediaAssetSummary,
  MediaBulkArchiveResult,
} from '@types';

const ACADEMY = 'academy-1';

const hasPermission = vi.fn<(permission: string) => boolean>();
const confirm = vi.fn<(request: Record<string, unknown>) => Promise<boolean>>();
const toast = vi.fn();

let library: MediaAssetSummary[] = [];
const getAssets = vi.fn();
const archiveAsset = vi.fn();
const archiveAssets = vi.fn();

vi.mock('react-router-dom', () => ({
  useParams: () => ({ academyId: ACADEMY }),
}));

vi.mock('@hooks', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    usePermissions: () => ({ hasPermission }),
    useFilePicker: () => ({
      openFilePicker: vi.fn(),
      files: null,
      clearFiles: vi.fn(),
      getPreviewUrl: () => '',
    }),
    useSearch: () => ({
      query: '',
      debouncedQuery: '',
      setQuery: vi.fn(),
      clearQuery: vi.fn(),
    }),
  };
});

vi.mock('@app/providers', () => ({
  useConfirmDialog: () => ({ confirm }),
  useToast: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}));

vi.mock('@/hooks/use-toast', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  toast: (...args: unknown[]) => toast(...args) as unknown,
}));

vi.mock('./services/MediaService', () => ({
  mediaService: {
    getAssets: (academyId: string, query?: CollectionQuery) =>
      getAssets(academyId, query) as unknown,
    archiveAsset: (academyId: string, assetId: string) =>
      archiveAsset(academyId, assetId) as unknown,
    archiveAssets: (academyId: string, assetIds: readonly string[]) =>
      archiveAssets(academyId, assetIds) as unknown,
    uploadAsset: vi.fn(),
    updateAsset: vi.fn(),
  },
}));

const { default: AcademyMediaPage } = await import('./pages/AcademyMediaPage');
const { MediaLibraryDialog } = await import('./components/MediaLibraryDialog');

function asset(id: string, fileName: string): MediaAssetSummary {
  return {
    id,
    academyId: ACADEMY,
    type: 'document',
    status: 'active',
    fileName,
    url: `https://cdn.example/${id}.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: 2048,
    createdAt: '2026-09-01T00:00:00.000Z',
  };
}

/** A tiny backend: lists active assets by status/page, archives by id. */
function serveLibrary() {
  getAssets.mockImplementation(
    async (_academyId: string, query?: CollectionQuery) => {
      const status =
        (query?.filters?.status as string | undefined) ?? undefined;
      const visible = library.filter(
        (item) => !status || item.status === status
      );
      const page = query?.pagination?.page ?? 1;
      const pageSize = query?.pagination?.pageSize ?? 20;
      return {
        items: visible.slice((page - 1) * pageSize, page * pageSize),
        pagination: {
          page,
          pageSize,
          totalItems: visible.length,
          totalPages: Math.max(1, Math.ceil(visible.length / pageSize)),
        },
      };
    }
  );
  archiveAsset.mockImplementation(
    async (_academyId: string, assetId: string) => {
      library = library.map((item) =>
        item.id === assetId ? { ...item, status: 'archived' } : item
      );
      return library.find((item) => item.id === assetId);
    }
  );
}

function conflictInUse(usages: { kind: string; count: number }[]): ApiError {
  return new ApiError({
    kind: 'conflict',
    messageKey: 'errors.media.inUse',
    status: 409,
    details: { usages },
    retryable: false,
  });
}

function renderWith(ui: JSX.Element, language: 'en' | 'ar' = 'en') {
  const i18n = createI18nInstance(language);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <div dir={language === 'ar' ? 'rtl' : 'ltr'}>{ui}</div>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  library = [asset('a1', 'a.pdf'), asset('a2', 'b.pdf'), asset('a3', 'c.pdf')];
  hasPermission.mockImplementation((p) => p === 'academy.website.manage');
  confirm.mockImplementation(async () => true);
  toast.mockImplementation(() => undefined);
  serveLibrary();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Academy Media — who sees delete', () => {
  it('asks the backend for active (not deleted) media only', async () => {
    renderWith(<AcademyMediaPage />);
    await screen.findByText('a.pdf');
    const query = getAssets.mock.calls[0][1] as CollectionQuery;
    expect(query.filters).toEqual({ status: 'active' });
  });

  it('offers per-item Delete and Select to an owner or manager', async () => {
    renderWith(<AcademyMediaPage />);
    expect(
      await screen.findByRole('button', { name: 'Delete a.pdf' })
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Select' })).toBeTruthy();
  });

  it('offers no delete control to an instructor', async () => {
    hasPermission.mockImplementation((p) => p === 'instructor.dashboard.view');
    renderWith(<AcademyMediaPage />);
    await screen.findByText('a.pdf');
    expect(screen.queryByRole('button', { name: /^Delete/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Select' })).toBeNull();
  });
});

describe('Academy Media — single delete', () => {
  it('confirms, sends the archive request, and removes the item', async () => {
    const user = userEvent.setup();
    renderWith(<AcademyMediaPage />);
    await user.click(
      await screen.findByRole('button', { name: 'Delete a.pdf' })
    );

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        titleKey: 'media:delete.confirmOne.title',
        intent: 'destructive',
        values: { fileName: 'a.pdf' },
      })
    );
    expect(archiveAsset).toHaveBeenCalledWith(ACADEMY, 'a1');
    await waitFor(() => expect(screen.queryByText('a.pdf')).toBeNull());
    expect(screen.getByText('b.pdf')).toBeTruthy();
    expect(toast).toHaveBeenCalledWith({
      title: expect.stringContaining('permanently removed after 30 days'),
    });
  });

  it('sends nothing when the confirmation is cancelled', async () => {
    confirm.mockImplementation(async () => false);
    const user = userEvent.setup();
    renderWith(<AcademyMediaPage />);
    await user.click(
      await screen.findByRole('button', { name: 'Delete a.pdf' })
    );

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(archiveAsset).not.toHaveBeenCalled();
    expect(screen.getByText('a.pdf')).toBeTruthy();
  });

  it('names the usages when the backend refuses because the file is in use', async () => {
    archiveAsset.mockRejectedValue(
      conflictInUse([
        { kind: 'lessonVideo', count: 1 },
        { kind: 'courseThumbnail', count: 2 },
      ])
    );
    const user = userEvent.setup();
    renderWith(<AcademyMediaPage />);
    await user.click(
      await screen.findByRole('button', { name: 'Delete a.pdf' })
    );

    const outcome = await screen.findByTestId('media-delete-outcome');
    expect(outcome.textContent).toContain(
      "“a.pdf” can't be deleted because it's used by a lesson video and 2 course thumbnails. Replace or remove it there first, then try again."
    );
    expect(outcome.closest('[aria-live="polite"]')).toBeTruthy();
    expect(screen.getByText('a.pdf')).toBeTruthy();
  });

  it('explains a permission refusal (403)', async () => {
    archiveAsset.mockRejectedValue(
      new ApiError({
        kind: 'forbidden',
        messageKey: 'errors.media.insufficientRole',
        status: 403,
        retryable: false,
      })
    );
    const user = userEvent.setup();
    renderWith(<AcademyMediaPage />);
    await user.click(
      await screen.findByRole('button', { name: 'Delete a.pdf' })
    );

    expect(
      (await screen.findByTestId('media-delete-outcome')).textContent
    ).toContain("Only the academy's owner or a manager can delete media.");
  });

  it('steps back a page when the last item on a later page is deleted', async () => {
    library = Array.from({ length: 25 }, (_, index) =>
      asset(`p${index}`, `file-${index}.pdf`)
    );
    const user = userEvent.setup();
    renderWith(<AcademyMediaPage />);
    await screen.findByText('file-0.pdf');
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(
      await screen.findByRole('button', { name: 'Delete file-24.pdf' })
    );

    expect(await screen.findByText('file-0.pdf')).toBeTruthy();
    const lastQuery = getAssets.mock.calls.at(-1)?.[1] as CollectionQuery;
    expect(lastQuery.pagination?.page).toBe(1);
  });
});

describe('Academy Media — bulk delete', () => {
  it('counts the selection and keeps Delete selected disabled until something is chosen', async () => {
    const user = userEvent.setup();
    renderWith(<AcademyMediaPage />);
    await user.click(await screen.findByRole('button', { name: 'Select' }));

    const count = screen.getByTestId('media-selected-count');
    const deleteSelected = screen.getByRole('button', {
      name: 'Delete selected',
    });
    expect(count.textContent).toBe('0 selected');
    expect((deleteSelected as HTMLButtonElement).disabled).toBe(true);

    await user.click(screen.getByRole('checkbox', { name: 'Select a.pdf' }));
    expect(count.textContent).toBe('1 selected');
    expect((deleteSelected as HTMLButtonElement).disabled).toBe(false);

    await user.click(
      screen.getByRole('button', { name: 'Select all on this page' })
    );
    expect(count.textContent).toBe('3 selected');

    await user.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(count.textContent).toBe('0 selected');
    expect((deleteSelected as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole('button', { name: /^Delete a\.pdf/ })).toBeNull();
  });

  it('confirms with the count and sends the selected ids', async () => {
    archiveAssets.mockResolvedValue({
      archived: ['a1', 'a3'],
      refused: [],
    } satisfies MediaBulkArchiveResult);
    const user = userEvent.setup();
    renderWith(<AcademyMediaPage />);
    await user.click(await screen.findByRole('button', { name: 'Select' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select a.pdf' }));
    await user.click(screen.getByRole('checkbox', { name: 'Select c.pdf' }));
    await user.click(screen.getByRole('button', { name: 'Delete selected' }));

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        titleKey: 'media:delete.confirmMany.title',
        values: { count: 2 },
      })
    );
    expect(archiveAssets).toHaveBeenCalledWith(ACADEMY, ['a1', 'a3']);
    expect(
      (await screen.findByTestId('media-delete-outcome')).textContent
    ).toContain('2 deleted');
  });

  it('summarises a partial failure with each refused file and its usages', async () => {
    library.push(asset('a4', 'd.pdf'));
    const partial = {
      archived: ['a1', 'a2'],
      refused: [
        {
          id: 'a3',
          reason: 'inUse',
          usages: [{ kind: 'lessonVideo', count: 1 }],
        },
        { id: 'a4', reason: 'notFound', usages: [] },
      ],
    } satisfies MediaBulkArchiveResult;
    archiveAssets.mockImplementation(async () => {
      library = library.filter((item) => item.id !== 'a1' && item.id !== 'a2');
      return partial;
    });
    const user = userEvent.setup();
    renderWith(<AcademyMediaPage />);
    await user.click(await screen.findByRole('button', { name: 'Select' }));
    await user.click(
      screen.getByRole('button', { name: 'Select all on this page' })
    );
    await user.click(screen.getByRole('button', { name: 'Delete selected' }));

    expect(archiveAssets).toHaveBeenCalledWith(ACADEMY, [
      'a1',
      'a2',
      'a3',
      'a4',
    ]);
    const outcome = await screen.findByTestId('media-delete-outcome');
    expect(outcome.textContent).toContain("2 deleted, 2 couldn't be deleted:");
    const lines = within(outcome)
      .getAllByRole('listitem')
      .map((li) => li.textContent);
    expect(lines).toEqual([
      '“c.pdf” is used by a lesson video. Replace or remove it there first.',
      "“d.pdf” wasn't found. It may already have been deleted.",
    ]);
    expect(outcome.textContent).toContain('permanently removed after 30 days');
    await waitFor(() => expect(screen.queryByText('a.pdf')).toBeNull());
    expect(screen.getByText('c.pdf')).toBeTruthy();
  });
});

describe('Media Library picker — delete', () => {
  it('only lists active media, and hides delete from an instructor', async () => {
    hasPermission.mockReturnValue(false);
    renderWith(
      <MediaLibraryDialog
        academyId={ACADEMY}
        open
        onOpenChange={vi.fn()}
        onSelect={vi.fn()}
      />
    );
    await screen.findByRole('button', { name: 'a.pdf' });
    expect((getAssets.mock.calls[0][1] as CollectionQuery).filters).toEqual({
      status: 'active',
    });
    expect(screen.queryByRole('button', { name: /^Delete/ })).toBeNull();
  });

  it('removes a deleted item, marks the current file as gone, and never changes the form value', async () => {
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderWith(
      <MediaLibraryDialog
        academyId={ACADEMY}
        open
        onOpenChange={onOpenChange}
        onSelect={onSelect}
        selectedUrl="https://cdn.example/a1.pdf"
      />
    );
    const current = await screen.findByRole('button', { name: 'a.pdf' });
    expect(current.getAttribute('aria-current')).toBe('true');

    await user.click(screen.getByRole('button', { name: 'Delete a.pdf' }));

    expect(archiveAsset).toHaveBeenCalledWith(ACADEMY, 'a1');
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'a.pdf' })).toBeNull()
    );
    expect(
      screen.getByText(
        /was deleted from the library but is still set in the form/
      )
    ).toBeTruthy();
    expect(onSelect).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('shows the in-use refusal and keeps the item when a saved lesson uses it', async () => {
    archiveAsset.mockRejectedValue(
      conflictInUse([{ kind: 'lessonVideo', count: 1 }])
    );
    const onSelect = vi.fn();
    const user = userEvent.setup();
    renderWith(
      <MediaLibraryDialog
        academyId={ACADEMY}
        open
        onOpenChange={vi.fn()}
        onSelect={onSelect}
        selectedUrl="https://cdn.example/a1.pdf"
      />
    );
    await user.click(
      await screen.findByRole('button', { name: 'Delete a.pdf' })
    );

    expect(
      (await screen.findByTestId('media-delete-outcome')).textContent
    ).toContain('used by a lesson video');
    expect(screen.getByRole('button', { name: 'a.pdf' })).toBeTruthy();
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('Arabic', () => {
  it('renders the delete controls and selection count in Arabic', async () => {
    const user = userEvent.setup();
    renderWith(<AcademyMediaPage />, 'ar');
    expect(
      await screen.findByRole('button', { name: 'حذف a.pdf' })
    ).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'تحديد' }));
    await user.click(screen.getByRole('checkbox', { name: 'تحديد a.pdf' }));
    await user.click(screen.getByRole('checkbox', { name: 'تحديد b.pdf' }));
    expect(screen.getByTestId('media-selected-count').textContent).toBe(
      'عنصران محدَّدان'
    );
    expect(
      screen.getByTestId('media-selected-count').closest('[dir="rtl"]')
    ).toBeTruthy();
  });
});
