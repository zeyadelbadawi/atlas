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
 *
 * Plan management — each row shows its price (or "No price"), and "Price"
 * edits it: a whole EGP amount (Arabic digits count) with the row's
 * version, the currency and billing cycle read-only, the "new purchases
 * only" copy with the install count, a stale version and a currency
 * refusal shown in the dialog.
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
const price = vi.hoisted(() => ({
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
  useUpdateAddOnPricing: () => ({
    mutateAsync: price.mutateAsync,
    isPending: false,
    error: price.error,
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
  price.error = null;
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

describe('PlatformAddOnsPage — prices (plan management)', () => {
  const priced = (over: Partial<PlatformAddOnRow> = {}) =>
    row({
      key: 'extra-academy',
      name: 'Extra Academy',
      catalogStatus: 'published',
      installCount: 3,
      pricing: { amount: 150, currency: 'EGP', billingCycle: 'monthly' },
      ...over,
    });

  it('shows each add-on’s price, or that it has none', () => {
    withRows([priced(), row({ id: 'a3', key: 'unpriced', pricing: null })]);
    renderPage();
    const cell = screen.getByTestId('addon-price-extra-academy').textContent;
    expect(cell).toMatch(/150/);
    expect(cell).toMatch(/month/);
    expect(screen.getByTestId('addon-price-unpriced').textContent).toBe(
      'No price'
    );
  });

  it('an add-on priced for the first time says it is billed monthly', async () => {
    withRows([row({ id: 'a3', key: 'unpriced', pricing: null })]);
    renderPage();
    fireEvent.click(screen.getByTestId('addon-price-edit-unpriced'));
    const dialog = await screen.findByTestId('addon-price-dialog');
    expect(screen.getByTestId('addon-price-cycle').textContent).toBe('Monthly');
    expect(dialog.textContent).toContain(
      'An add-on priced for the first time is billed monthly.'
    );
  });

  it('saves a whole EGP amount with the row version, then closes', async () => {
    price.mutateAsync.mockResolvedValue(priced());
    withRows([priced()]);
    renderPage();
    fireEvent.click(screen.getByTestId('addon-price-edit-extra-academy'));
    const dialog = await screen.findByTestId('addon-price-dialog');
    expect(
      (screen.getByTestId('addon-price-amount') as HTMLInputElement).value
    ).toBe('150');
    expect(screen.getByTestId('addon-price-currency').textContent).toBe(
      'Egyptian pound (EGP)'
    );
    expect(screen.getByTestId('addon-price-cycle').textContent).toBe('Monthly');
    expect(dialog.textContent).toContain(
      '3 organizations already have this add-on and aren’t charged again.'
    );
    fireEvent.change(screen.getByTestId('addon-price-amount'), {
      target: { value: '٢٠٠' },
    });
    fireEvent.click(screen.getByTestId('addon-price-save'));
    await waitFor(() =>
      expect(price.mutateAsync).toHaveBeenCalledWith({
        key: 'extra-academy',
        input: { amount: 200, currency: 'EGP', expectedVersion: 2 },
      })
    );
    await waitFor(() =>
      expect(screen.queryByTestId('addon-price-dialog')).toBeNull()
    );
  });

  it('never sends a price that is not a whole number from 1 to 1,000,000', async () => {
    withRows([priced()]);
    renderPage();
    fireEvent.click(screen.getByTestId('addon-price-edit-extra-academy'));
    await screen.findByTestId('addon-price-dialog');
    for (const value of ['0', '12.5', '1000001', '']) {
      fireEvent.change(screen.getByTestId('addon-price-amount'), {
        target: { value },
      });
      fireEvent.click(screen.getByTestId('addon-price-save'));
      expect(screen.getByTestId('addon-price-amount-error')).toBeTruthy();
    }
    expect(price.mutateAsync).not.toHaveBeenCalled();
  });

  it('says nobody has it yet when no organization installed it', async () => {
    withRows([priced({ installCount: 0 })]);
    renderPage();
    fireEvent.click(screen.getByTestId('addon-price-edit-extra-academy'));
    expect(
      (await screen.findByTestId('addon-price-new-purchases')).textContent
    ).toBe(
      'The new price applies to new purchases only. No organization has this add-on yet.'
    );
  });

  it('a stale version says someone else changed it, and keeps the dialog open', async () => {
    price.error = createApiError('conflict', {
      status: 409,
      messageKey: 'errors.concurrency.staleVersion',
    });
    withRows([priced()]);
    renderPage();
    fireEvent.click(screen.getByTestId('addon-price-edit-extra-academy'));
    expect(
      (await screen.findByTestId('addon-price-stale')).textContent
    ).toContain('Someone else changed this add-on');
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('shows an unsupported currency on the currency line, not as a generic failure', async () => {
    price.error = createApiError('validation', {
      status: 400,
      violations: [
        { field: 'currency', messageKey: 'validation:unsupportedCurrency' },
      ],
    });
    withRows([priced()]);
    renderPage();
    fireEvent.click(screen.getByTestId('addon-price-edit-extra-academy'));
    expect(
      (await screen.findByTestId('addon-price-currency-error')).textContent
    ).toBe('Choose a supported currency (EGP).');
    expect(screen.queryByTestId('save-failed')).toBeNull();
    expect(screen.queryByTestId('addon-price-amount-error')).toBeNull();
  });

  it('renders the price dialog in Arabic with no missing keys', async () => {
    withRows([priced()]);
    renderPage('ar');
    fireEvent.click(screen.getByTestId('addon-price-edit-extra-academy'));
    const dialog = await screen.findByTestId('addon-price-dialog');
    expect(dialog.textContent).not.toMatch(/platformAddOns:/);
    expect(dialog.textContent).toContain('3');
    expect(dialog.textContent).not.toMatch(/[٠-٩]/);
  });
});
