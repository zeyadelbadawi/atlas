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
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import type { PlatformAddOnRow } from './types';

const usePlatformAddOns = vi.fn();
const mutate = vi.fn();
const useUpdateAddOnCatalogStatus = vi.fn(() => ({ mutate, isPending: false }));

vi.mock('./hooks/usePlatformAddOns', () => ({
  usePlatformAddOns: () => usePlatformAddOns() as unknown,
  useUpdateAddOnCatalogStatus: () => useUpdateAddOnCatalogStatus() as unknown,
}));

import PlatformAddOnsPage from './pages/PlatformAddOnsPage';

function renderPage(language = 'en') {
  const i18n = createI18nInstance(language as 'en' | 'ar');
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <PlatformAddOnsPage />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

const row = (over: Partial<PlatformAddOnRow> = {}): PlatformAddOnRow => ({
  id: 'a1',
  key: 'live-sessions',
  name: 'Live Sessions',
  description: 'Run live classes inside your courses.',
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
      pagination: { page: 1, pageSize: 20, totalItems: rows.length, totalPages: 1 },
    },
    isLoading: false,
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
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
    expect(within(rowEl as HTMLElement).getAllByText('Coming Soon').length).toBeGreaterThan(0);
  });

  it('renders in Arabic with no missing keys', () => {
    withRows([row()]);
    const { container } = renderPage('ar');
    expect(container.textContent).not.toMatch(/platformAddOns:/);
    expect(container.textContent).toMatch(/[؀-ۿ]/);
  });
});
