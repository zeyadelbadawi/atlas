/**
 * Academy Media asks for the academy in the route, and nothing else.
 *
 * The backend half of this is already settled and already tested —
 * `media-tenant-isolation.e2e-spec.ts` proves that another Organization
 * cannot read, list, update or archive an asset even with a guessed id, and
 * that storage keys are namespaced by the real academy id rather than
 * anything a client sends. None of that can be weakened from here.
 *
 * What THIS pins is the new surface's own contract: the page is scoped by
 * its route parameter, so switching the active Academy switches what it
 * shows. A page that cached an academy id, or read one from anywhere other
 * than the route, would show the previous Academy's assets after a switch —
 * a leak the server would never produce and the server-side tests would
 * never catch, because every request would look perfectly legitimate.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { MediaAssetSummary } from '@types';

const hasPermission = vi.fn<(permission: string) => boolean>();
const useMediaAssets = vi.fn();
let routeAcademyId = 'academy-a';

vi.mock('react-router-dom', () => ({
  useParams: () => ({ academyId: routeAcademyId }),
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
}));

const idleMutation = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false, error: null };

vi.mock('./hooks', () => ({
  useMediaAssets: (academyId: string | undefined, options?: unknown) =>
    useMediaAssets(academyId, options) as unknown,
  useUploadMediaAsset: () => idleMutation,
  useArchiveMediaAsset: () => idleMutation,
}));
vi.mock('./hooks/useUpdateMediaAsset', () => ({
  useUpdateMediaAsset: () => idleMutation,
}));

const { default: AcademyMediaPage } = await import('./pages/AcademyMediaPage');

afterEach(cleanup);

function asset(id: string, fileName: string): MediaAssetSummary {
  return {
    id,
    academyId: routeAcademyId,
    type: 'image',
    status: 'active',
    fileName,
    url: `https://cdn.example/${id}.png`,
    mimeType: 'image/png',
    sizeBytes: 2048,
    createdAt: '2026-09-01T00:00:00.000Z',
  } as MediaAssetSummary;
}

function renderPage(items: MediaAssetSummary[]) {
  useMediaAssets.mockReturnValue({
    data: { items, pagination: { totalPages: 1 } },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
  const i18n = createI18nInstance('en');
  return render(
    <I18nextProvider i18n={i18n}>
      <AcademyMediaPage />
    </I18nextProvider>,
  );
}

describe('AcademyMediaPage — scope', () => {
  it('requests media for the academy in the route', () => {
    hasPermission.mockReturnValue(true);
    routeAcademyId = 'academy-a';
    renderPage([asset('a1', 'logo-a.png')]);

    expect(useMediaAssets).toHaveBeenCalledWith('academy-a', expect.anything());
  });

  /*
   * The switch is the whole point of the feature's naming: "Academy Media"
   * means the media of the Academy you are currently managing.
   */
  it('requests the other academy after the route changes', () => {
    hasPermission.mockReturnValue(true);
    routeAcademyId = 'academy-b';
    renderPage([asset('b1', 'logo-b.png')]);

    expect(useMediaAssets).toHaveBeenCalledWith('academy-b', expect.anything());
    expect(useMediaAssets).not.toHaveBeenCalledWith('academy-a', expect.anything());
  });

  it('renders only the assets the query returned', () => {
    hasPermission.mockReturnValue(true);
    routeAcademyId = 'academy-b';
    renderPage([asset('b1', 'logo-b.png')]);

    expect(screen.getByText('logo-b.png')).toBeTruthy();
    expect(screen.queryByText('logo-a.png')).toBeNull();
  });
});

describe('AcademyMediaPage — controls follow the permission', () => {
  it('offers Upload to a user who can manage the website', () => {
    hasPermission.mockImplementation((p) => p === 'academy.website.manage');
    renderPage([asset('a1', 'logo.png')]);

    expect(screen.getByRole('button', { name: /upload/i })).toBeTruthy();
  });

  /*
   * A member with `academy.view` alone may browse the library — the route
   * is guarded on `view` for that reason — but every write would be refused
   * by the backend, so no write control is offered.
   */
  it('offers no Upload to a read-only member', () => {
    hasPermission.mockImplementation((p) => p === 'academy.view');
    renderPage([asset('a1', 'logo.png')]);

    expect(screen.queryByRole('button', { name: /upload/i })).toBeNull();
  });

  it('still lists the assets for a read-only member', () => {
    hasPermission.mockImplementation((p) => p === 'academy.view');
    renderPage([asset('a1', 'logo.png')]);

    expect(screen.getByText('logo.png')).toBeTruthy();
  });
});
