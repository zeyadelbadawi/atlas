/**
 * B0-CPY-22 — no invoice is ever issued yet, so the billing overview does
 * not send customers to an always-empty Invoices page; it links to their
 * payment history instead.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';

vi.mock('./hooks', () => ({
  usePaymentHistory: () => ({
    isLoading: false,
    error: null,
    data: { items: [] },
    refetch: vi.fn(),
  }),
}));
vi.mock('@features/tenant', () => ({
  SubscriptionGiftDetails: () => null,
  useTenantSubscription: () => ({
    isLoading: false,
    error: null,
    data: { plan: { name: 'Teacher' }, billingCycle: 'monthly' },
    refetch: vi.fn(),
  }),
}));

const { default: BillingOverviewPage } =
  await import('./pages/BillingOverviewPage');

afterEach(cleanup);

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderPage(language: 'en' | 'ar' = 'en') {
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter initialEntries={['/billing']}>
        <Routes>
          <Route path="/billing" element={<BillingOverviewPage />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe('billing overview — no invoices link', () => {
  it('offers payment history, not invoices', () => {
    renderPage();
    expect(screen.queryByText('Invoices')).toBeNull();
    expect(screen.queryByText(/invoices/i)).toBeNull();
    fireEvent.click(screen.getByText('Payment history'));
    expect(screen.getByTestId('where').textContent).toBe(
      DASHBOARD_ROUTES.tenantBillingPayments
    );
  });

  it('has no invoices wording in Arabic either', () => {
    renderPage('ar');
    // The page title «الفواتير والمدفوعات» is the existing nav label for
    // Billing; only the always-empty link must be gone.
    expect(screen.queryByText('الفواتير')).toBeNull();
    expect(screen.queryByText(/فواتيرك|الفواتير الصادرة/)).toBeNull();
    expect(screen.getByText('سجل المدفوعات')).toBeTruthy();
  });
});
