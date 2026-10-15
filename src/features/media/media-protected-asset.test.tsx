/**
 * D5-4 (B0-MED-05 residual) — a protected file in the staff Media Library.
 *
 * The API now reports a protected asset with `url: null` and
 * `protected: true` (it used to derive a public-looking path). Pinned here:
 * the library row and card show a Protected badge and never an image or a
 * link; the details dialog offers owners and managers "Open file", which
 * asks for a short-lived grant and opens exactly that link; a member
 * without the managing permission gets no such action; a public asset
 * renders as before; and the picker never offers a protected file to a
 * public field.
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
import type { CollectionQuery, MediaAssetSummary } from '@types';

const ACADEMY = 'academy-1';

const hasPermission = vi.fn<(permission: string) => boolean>();
const getAssets = vi.fn();
const getProtectedFileGrant = vi.fn();

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
  useConfirmDialog: () => ({ confirm: async () => true }),
  useToast: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}));

vi.mock('./services/MediaService', () => ({
  mediaService: {
    getAssets: (academyId: string, query?: CollectionQuery) =>
      getAssets(academyId, query) as unknown,
    getProtectedFileGrant: (academyId: string, assetId: string) =>
      getProtectedFileGrant(academyId, assetId) as unknown,
    archiveAsset: vi.fn(),
    archiveAssets: vi.fn(),
    uploadAsset: vi.fn(),
    updateAsset: vi.fn(),
  },
}));

const { default: AcademyMediaPage } = await import('./pages/AcademyMediaPage');
const { MediaLibraryDialog } = await import('./components/MediaLibraryDialog');

const PUBLIC_URL = '/api/v1/public/media/academies/academy-1/public-1.png';

const publicImage: MediaAssetSummary = {
  id: 'public-1',
  academyId: ACADEMY,
  type: 'image',
  status: 'active',
  fileName: 'logo.png',
  url: PUBLIC_URL,
  protected: false,
  mimeType: 'image/png',
  sizeBytes: 2048,
  createdAt: '2026-09-01T00:00:00.000Z',
};

const protectedImage: MediaAssetSummary = {
  id: 'protected-1',
  academyId: ACADEMY,
  type: 'image',
  status: 'active',
  fileName: 'answer-key.png',
  url: null,
  protected: true,
  mimeType: 'image/png',
  sizeBytes: 4096,
  createdAt: '2026-09-02T00:00:00.000Z',
};

const protectedPdf: MediaAssetSummary = {
  ...protectedImage,
  id: 'protected-2',
  type: 'document',
  fileName: 'worksheet.pdf',
  mimeType: 'application/pdf',
};

function serve(items: readonly MediaAssetSummary[]) {
  getAssets.mockImplementation(async () => ({
    items,
    pagination: {
      page: 1,
      pageSize: 24,
      totalItems: items.length,
      totalPages: 1,
    },
  }));
}

function renderWith(ui: JSX.Element) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18nInstance('en')}>{ui}</I18nextProvider>
    </QueryClientProvider>
  );
}

/** The grid card that names this file. */
function itemFor(fileName: string): HTMLElement {
  return screen.getByText(fileName).closest('.group') as HTMLElement;
}

beforeEach(() => {
  hasPermission.mockImplementation((p) => p === 'academy.website.manage');
  serve([publicImage, protectedImage, protectedPdf]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('Academy Media — a protected file in the library', () => {
  it('shows a Protected badge and no image or link for a protected card; a public card is unchanged', async () => {
    renderWith(<AcademyMediaPage />);
    await screen.findByText('answer-key.png');

    const grid = screen.getByTestId('media-grid');
    const images = within(grid).getAllByRole('img');
    // Only the public image is rendered as an image, from its own URL.
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('src')).toBe(PUBLIC_URL);
    expect(grid.querySelector('a[href]')).toBeNull();
    expect(grid.innerHTML).not.toContain(
      '/public/media/academies/academy-1/protected'
    );

    expect(
      within(itemFor('answer-key.png')).getByText('Protected')
    ).toBeTruthy();
    expect(
      within(itemFor('worksheet.pdf')).getByText('Protected')
    ).toBeTruthy();
    expect(within(itemFor('logo.png')).queryByText('Protected')).toBeNull();
  });

  it('marks the protected row in the list view too', async () => {
    const user = userEvent.setup();
    renderWith(<AcademyMediaPage />);
    await screen.findByText('worksheet.pdf');
    await user.click(screen.getByRole('button', { name: 'List view' }));

    const list = screen.getByTestId('media-list');
    expect(within(list).getAllByText('Protected')).toHaveLength(2);
    expect(list.querySelector('a[href], img')).toBeNull();
  });

  it('opens a protected file only through a short-lived grant', async () => {
    const user = userEvent.setup();
    const tab = {
      opener: {} as unknown,
      location: { href: '' },
      close: vi.fn(),
    };
    const open = vi.fn(() => tab);
    vi.stubGlobal('open', open);
    getProtectedFileGrant.mockResolvedValue({
      url: 'https://storage.example/protected/worksheet.pdf?X-Amz-Signature=abc',
      expiresAt: '2026-10-14T10:10:00.000Z',
    });

    renderWith(<AcademyMediaPage />);
    await user.click(await screen.findByText('worksheet.pdf'));

    const details = await screen.findByTestId('media-asset-details');
    expect(within(details).queryByRole('img')).toBeNull();
    expect(within(details).getByText('Protected')).toBeTruthy();
    await user.click(
      within(details).getByRole('button', { name: 'Open file' })
    );

    await waitFor(() =>
      expect(tab.location.href).toBe(
        'https://storage.example/protected/worksheet.pdf?X-Amz-Signature=abc'
      )
    );
    expect(getProtectedFileGrant).toHaveBeenCalledWith(ACADEMY, 'protected-2');
    expect(open).toHaveBeenCalledWith('', '_blank');
    expect(tab.opener).toBeNull();
  });

  it('closes the blank tab when the grant is refused', async () => {
    const user = userEvent.setup();
    const tab = {
      opener: {} as unknown,
      location: { href: '' },
      close: vi.fn(),
    };
    vi.stubGlobal(
      'open',
      vi.fn(() => tab)
    );
    getProtectedFileGrant.mockRejectedValue(new Error('forbidden'));

    renderWith(<AcademyMediaPage />);
    await user.click(await screen.findByText('worksheet.pdf'));
    const details = await screen.findByTestId('media-asset-details');
    await user.click(
      within(details).getByRole('button', { name: 'Open file' })
    );

    await waitFor(() => expect(tab.close).toHaveBeenCalled());
    expect(tab.location.href).toBe('');
  });

  it('offers no Open file to a member without the managing permission', async () => {
    hasPermission.mockImplementation((p) => p === 'academy.view');
    const user = userEvent.setup();
    renderWith(<AcademyMediaPage />);
    await user.click(await screen.findByText('worksheet.pdf'));

    const details = await screen.findByTestId('media-asset-details');
    expect(within(details).getByText('Protected')).toBeTruthy();
    expect(
      within(details).queryByRole('button', { name: 'Open file' })
    ).toBeNull();
    expect(getProtectedFileGrant).not.toHaveBeenCalled();
  });

  it('keeps the image preview for a public asset', async () => {
    const user = userEvent.setup();
    renderWith(<AcademyMediaPage />);
    await user.click(await screen.findByText('logo.png'));

    const details = await screen.findByTestId('media-asset-details');
    expect(within(details).getByRole('img').getAttribute('src')).toBe(
      PUBLIC_URL
    );
    expect(within(details).queryByText('Protected')).toBeNull();
    expect(
      within(details).queryByRole('button', { name: 'Open file' })
    ).toBeNull();
  });
});

describe('Media Library picker — public assets only', () => {
  it('asks for the public tier and never offers an asset without a URL', async () => {
    const onSelect = vi.fn();
    renderWith(
      <MediaLibraryDialog
        academyId={ACADEMY}
        open
        onOpenChange={vi.fn()}
        onSelect={onSelect}
      />
    );
    await screen.findByRole('button', { name: 'logo.png' });
    expect((getAssets.mock.calls[0][1] as CollectionQuery).filters).toEqual({
      status: 'active',
      access: 'public',
    });
    // Even if the server sent one, a protected asset is not offered.
    expect(screen.queryByRole('button', { name: 'answer-key.png' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'worksheet.pdf' })).toBeNull();
  });
});
