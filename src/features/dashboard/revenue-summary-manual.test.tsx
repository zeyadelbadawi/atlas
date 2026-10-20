/**
 * B0-CPY-15 — the revenue card picks its "not tracked" message from what
 * the academy actually has: manual methods configured → "not shown here
 * yet"; none → "set up how you collect payments"; own gateway → unchanged.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { RevenueSummary } from './components/RevenueSummary';
import type { DashboardRevenue } from '@types';

afterEach(cleanup);

function renderCard(revenue: DashboardRevenue, language: 'en' | 'ar' = 'en') {
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <RevenueSummary revenue={revenue} />
    </I18nextProvider>
  );
}

const base = {
  tracked: false,
  paymentCollectionMode: 'unconfigured',
  totals: [],
} as const satisfies DashboardRevenue;

describe('RevenueSummary — not-tracked message', () => {
  it('tells an academy with manual methods that those earnings are not shown yet', () => {
    renderCard({ ...base, manualPaymentMethodsEnabled: true });
    expect(
      screen.getByText(
        "Earnings from manual payments aren't shown here yet. You can see each approved payment in Orders."
      )
    ).toBeTruthy();
    expect(screen.queryByText(/set up how you collect payments/i)).toBeNull();
  });

  it('says the same in Arabic', () => {
    renderCard({ ...base, manualPaymentMethodsEnabled: true }, 'ar');
    expect(
      screen.getByText(/لا تظهر أرباح المدفوعات اليدوية هنا بعد/)
    ).toBeTruthy();
  });

  it('asks to set up payments only when nothing is configured', () => {
    renderCard({ ...base, manualPaymentMethodsEnabled: false });
    expect(
      screen.getByText(
        'Set up how you collect payments to start seeing earnings here.'
      )
    ).toBeTruthy();
  });

  it('keeps the own-gateway message', () => {
    renderCard({
      ...base,
      paymentCollectionMode: 'organization_gateway',
      manualPaymentMethodsEnabled: true,
    });
    expect(screen.getByText(/your own gateway/)).toBeTruthy();
  });
});

describe('RevenueSummary — manual-payment sales (B0-COM-02)', () => {
  const manualSales = {
    periods: [
      { days: 7, totals: [] },
      {
        days: 30,
        totals: [{ currency: 'EGP', amountMinorUnits: 119000, count: 1 }],
      },
      {
        days: 90,
        totals: [{ currency: 'EGP', amountMinorUnits: 169000, count: 2 }],
      },
    ],
  };

  it('shows the owner the last 30 days by default, labelled as manual sales, not revenue', () => {
    renderCard({ ...base, manualPaymentMethodsEnabled: true, manualSales });
    expect(
      screen.getByText('Sales recorded in Atlas (manual payments)')
    ).toBeTruthy();
    expect(
      screen
        .getByRole('button', { name: 'Last 30 days' })
        .getAttribute('aria-pressed')
    ).toBe('true');
    expect(screen.getByText('Approved orders: 1')).toBeTruthy();
    expect(screen.queryByText('After platform fees')).toBeNull();
    expect(screen.queryByText(/aren't shown here yet/)).toBeNull();
  });

  it('switches windows, and says so when a window has no sales', () => {
    renderCard({ ...base, manualPaymentMethodsEnabled: true, manualSales });
    fireEvent.click(screen.getByRole('button', { name: 'Last 90 days' }));
    expect(screen.getByText('Approved orders: 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }));
    expect(
      screen.getByText('No approved manual payments in the last 7 days.')
    ).toBeTruthy();
  });

  it('renders in Arabic', () => {
    renderCard(
      { ...base, manualPaymentMethodsEnabled: true, manualSales },
      'ar'
    );
    expect(
      screen.getByText('المبيعات المسجّلة في أطلس (المدفوعات اليدوية)')
    ).toBeTruthy();
    expect(screen.getByText('الطلبات المعتمدة: 1')).toBeTruthy();
  });

  it('keeps the earlier message for anyone without sales figures (null)', () => {
    renderCard({
      ...base,
      manualPaymentMethodsEnabled: true,
      manualSales: null,
    });
    expect(
      screen.getByText(
        "Earnings from manual payments aren't shown here yet. You can see each approved payment in Orders."
      )
    ).toBeTruthy();
  });
});
