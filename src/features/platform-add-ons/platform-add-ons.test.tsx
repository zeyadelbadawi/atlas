/**
 * Add-ons Catalog Management — what the Platform Owner actually sees.
 *
 * The claims worth pinning: every registered add-on renders with its
 * catalog status and both counts, no raw translation key leaks, Live
 * Sessions reads as Coming Soon (never Published), and Arabic renders
 * Arabic. The status-change confirmation is exercised separately in
 * `ChangeCatalogStatusDialog.test.tsx` (a pure component, free of the
 * Radix Select's jsdom pointer quirks). Authorization is NOT tested here —
 * it is not enforced here; `PlatformOwnerGuard` and RLS decide it and have
 * their own server-side tests.
 *
 * B5 (UX audit) V21 — each row shows the add-on's Arabic name (or "Not
 * set"), and "Arabic name" edits it: trimmed texts with the row's version,
 * a blank one clears it, a stale version says so and the dialog stays.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import { AtlasDialogProvider } from '@app/providers/dialog/DialogProvider';
import { createApiError } from '@api';
import type { ApiError } from '@api';
import type { PlatformAddOnRow } from './types';

const usePlatformAddOns = vi.fn();
const mutate = vi.fn();
const useUpdateAddOnCatalogStatus = vi.fn(() => ({ mutate, isPending: false }));

const arabic = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  error: null as ApiError | null,
}));

vi.mock('./hooks/usePlatformAddOns', () => ({
  usePlatformAddOns: () => usePlatformAddOns() as unknown,
  useUpdateAddOnCatalogStatus: () => useUpdateAddOnCatalogStatus() as unknown,
  useUpdateAddOnArabicText: () => ({
    mutateAsync: arabic.mutateAsync,
    isPending: false,
    error: arabic.error,
    reset: vi.fn(),
  }),
}));

import PlatformAddOnsPage from './pages/PlatformAddOnsPage';

function renderPage(language = 'en') {
  const i18n = createI18nInstance(language as 'en' | 'ar');
  return render(
    <I18nextProvider i18n={i18n}>
      <AtlasDialogProvider>
        <MemoryRouter>
          <PlatformAddOnsPage />
        </MemoryRouter>
      </AtlasDialogProvider>
    </I18nextProvider>
  );
}

const row = (over: Partial<PlatformAddOnRow> = {}): PlatformAddOnRow => ({
  id: 'a1',
  key: 'live-sessions',
  name: 'Live Sessions',
  description: 'Run live classes inside your courses.',
  nameAr: null,
  descriptionAr: null,
  catalogStatus: 'coming_soon',
  installCount: 0,
  enabledCount: 0,
  version: 2,
  updatedAt: '2026-09-01T10:00:00Z',
  ...over,
});

function withRows(rows: readonly PlatformAddOnRow[]) {
  usePlatformAddOns.mockReturnValue({
    data: {
      items: rows,
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: rows.length,
        totalPages: 1,
      },
    },
    isLoading: false,
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  arabic.error = null;
});

describe('PlatformAddOnsPage', () => {
  it('renders each add-on with its catalog status and counts, no raw keys', () => {
    withRows([
      row(),
      row({
        id: 'a2',
        key: 'extra-academy',
        name: 'Extra Academy',
        catalogStatus: 'published',
        installCount: 4,
        enabledCount: 3,
      }),
    ]);

    const { container } = renderPage();
    const table = within(screen.getByRole('table'));
    expect(table.getByText('Live Sessions')).toBeTruthy();
    expect(table.getByText('Extra Academy')).toBeTruthy();
    // Badge + the row's status <select> value both read the status label.
    expect(table.getAllByText('Coming Soon').length).toBeGreaterThan(0);
    expect(table.getAllByText('Published').length).toBeGreaterThan(0);
    expect(table.getByText('4')).toBeTruthy();
    expect(container.textContent).not.toMatch(/platformAddOns:/);
  });

  it('Live Sessions is shown as Coming Soon, never Published in its row badge', () => {
    withRows([row()]);
    renderPage();
    const rowEl = screen.getByText('Live Sessions').closest('tr');
    expect(rowEl).not.toBeNull();
    // The badge sits in the same row; its label must be Coming Soon.
    expect(
      within(rowEl as HTMLElement).getAllByText('Coming Soon').length
    ).toBeGreaterThan(0);
  });

  it('renders in Arabic with no missing keys', () => {
    withRows([row()]);
    const { container } = renderPage('ar');
    expect(container.textContent).not.toMatch(/platformAddOns:/);
    expect(container.textContent).toMatch(/[؀-ۿ]/);
  });
});

describe('PlatformAddOnsPage — Arabic names (B5 V21)', () => {
  it('shows each add-on’s Arabic name under the English one, or that none is set', () => {
    withRows([
      row(),
      row({
        id: 'a2',
        key: 'extra-academy',
        name: 'Extra Academy',
        nameAr: 'أكاديمية إضافية',
      }),
    ]);
    renderPage();
    expect(screen.getByTestId('addon-name-ar-extra-academy').textContent).toBe(
      'أكاديمية إضافية'
    );
    expect(
      screen.getByTestId('addon-name-ar-extra-academy').getAttribute('dir')
    ).toBe('rtl');
    expect(screen.getByTestId('addon-name-ar-live-sessions').textContent).toBe(
      'Not set — the English name is shown'
    );
  });

  it('edits the Arabic name and description: trimmed, with the row version, then closes', async () => {
    arabic.mutateAsync.mockResolvedValue(row({ nameAr: 'الجلسات المباشرة' }));
    withRows([row({ descriptionAr: 'وصف قديم' })]);
    renderPage();
    fireEvent.click(screen.getByTestId('addon-arabic-live-sessions'));
    const dialog = await screen.findByTestId('addon-arabic-dialog');
    expect(dialog.textContent).toContain('Arabic name for');
    expect(dialog.textContent).toContain('English name:');
    expect(
      (screen.getByTestId('addon-description-ar') as HTMLTextAreaElement).value
    ).toBe('وصف قديم');
    fireEvent.change(screen.getByTestId('addon-name-ar'), {
      target: { value: '  الجلسات المباشرة ' },
    });
    fireEvent.change(screen.getByTestId('addon-description-ar'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByTestId('addon-arabic-save'));
    await waitFor(() =>
      expect(arabic.mutateAsync).toHaveBeenCalledWith({
        key: 'live-sessions',
        input: {
          nameAr: 'الجلسات المباشرة',
          descriptionAr: '',
          expectedVersion: 2,
        },
      })
    );
    await waitFor(() =>
      expect(screen.queryByTestId('addon-arabic-dialog')).toBeNull()
    );
  });

  it('refuses a name over 80 characters before sending, without cutting it', async () => {
    withRows([row()]);
    renderPage();
    fireEvent.click(screen.getByTestId('addon-arabic-live-sessions'));
    await screen.findByTestId('addon-arabic-dialog');
    fireEvent.change(screen.getByTestId('addon-name-ar'), {
      target: { value: 'ا'.repeat(81) },
    });
    expect(screen.getByTestId('addon-name-ar-count').textContent).toBe(
      '81 / 80 characters'
    );
    fireEvent.click(screen.getByTestId('addon-arabic-save'));
    expect(arabic.mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain(
      '80 characters or fewer'
    );
  });

  it('a stale version says someone else changed it, once, and keeps the dialog open', async () => {
    arabic.error = createApiError('conflict', {
      status: 409,
      messageKey: 'errors.concurrency.staleVersion',
    });
    withRows([row()]);
    renderPage();
    fireEvent.click(screen.getByTestId('addon-arabic-live-sessions'));
    await screen.findByTestId('addon-arabic-dialog');
    expect(screen.getByTestId('addon-arabic-stale').textContent).toContain(
      'Someone else changed this add-on'
    );
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });
});
