/**
 * CF-23 — the add-on store must not offer a free "Install" for a paid
 * add-on. The API now refuses that install (a paid add-on is activated only
 * when its checkout is paid and approved), so the honest action is "Buy",
 * which goes to checkout. Free add-ons keep "Install".
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import type { AddOnCatalogEntry } from '@types';

let catalog: readonly AddOnCatalogEntry[] = [];

// The page's data and mutation hooks are replaced so the test pins only
// what the page RENDERS for a given catalog (the hooks' own toast/error
// plumbing is covered elsewhere).
vi.mock('@hooks', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useAuth: () => ({ organization: { id: 'org-1' } }),
    useApiQuery: () => ({
      data: catalog,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useApiMutation: () => ({ mutate: vi.fn(), isPending: false }),
  };
});

import AddOnsCatalogPage from './pages/AddOnsCatalogPage';

const entry = (over: Partial<AddOnCatalogEntry>): AddOnCatalogEntry =>
  ({
    id: 'a-1',
    key: 'extra-academy',
    name: 'Extra academies',
    effect: { type: 'limit' },
    compatiblePlanKeys: [],
    isFree: false,
    pricing: { amount: 450, currency: 'EGP' },
    installStatus: 'uninstalled',
    ...over,
  }) as AddOnCatalogEntry;

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
}

function renderPage() {
  const i18n = createI18nInstance('en');
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={['/dashboard/add-ons']}>
          <Routes>
            <Route path="/dashboard/add-ons" element={<AddOnsCatalogPage />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  catalog = [];
});

describe('Add-ons catalog — paid add-ons', () => {
  it('offers Buy (to checkout), not Install, for a paid add-on', async () => {
    catalog = [entry({})];
    renderPage();
    const buy = await screen.findByRole('button', { name: 'Buy' });
    expect(screen.queryByRole('button', { name: 'Install' })).toBeNull();
    fireEvent.click(buy);
    const where = await screen.findByTestId('where');
    expect(where.textContent).toContain('add_on');
    expect(where.textContent).toContain('extra-academy');
  });

  it('keeps Install for a free add-on', async () => {
    catalog = [
      entry({
        key: 'free-thing',
        name: 'Free thing',
        isFree: true,
        pricing: undefined,
      }),
    ];
    renderPage();
    expect(await screen.findByRole('button', { name: 'Install' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Buy' })).toBeNull();
  });
});

describe('Add-ons catalog — price line (B0-LIV-02)', () => {
  it('shows no price for a "coming soon" add-on', () => {
    catalog = [
      entry({
        key: 'live-sessions',
        name: 'Live sessions',
        comingSoon: true,
        pricing: { amount: 0, currency: 'USD' },
      }),
    ];
    renderPage();
    expect(screen.getByText('Live sessions')).toBeTruthy();
    expect(screen.queryByText(/USD|EGP/)).toBeNull();
  });

  it('shows no invented currency when the add-on has none', () => {
    catalog = [entry({ pricing: { amount: 450 } })];
    renderPage();
    expect(screen.getByText('Extra academies')).toBeTruthy();
    expect(screen.queryByText(/USD|EGP|450/)).toBeNull();
  });

  it('still shows the price of a priced add-on with its currency', () => {
    catalog = [entry({})];
    renderPage();
    expect(screen.getByText(/450/)).toBeTruthy();
    expect(screen.getByText(/EGP/)).toBeTruthy();
  });
});
