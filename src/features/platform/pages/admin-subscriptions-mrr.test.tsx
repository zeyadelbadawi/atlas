/**
 * B0-ANL-01 — the Platform Owner subscriptions overview shows monthly
 * recurring revenue from approved payments, one figure per currency (never
 * summed), says how many active subscriptions have no approved payment,
 * that internal organizations are left out, and the active split by
 * billing cycle.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AtlasLocalizationProvider } from '@app/providers/localization/LocalizationProvider';
import type { AdminSubscriptionOverview } from '@types';

const getOverview = vi.fn<() => Promise<AdminSubscriptionOverview>>();
vi.mock('../services/AdminSubscriptionsService', () => ({
  adminSubscriptionsService: { getOverview: () => getOverview() },
}));

const { AdminSubscriptionsPage } = await import('./AdminSubscriptionsPage');

function overview(
  revenue: Partial<AdminSubscriptionOverview['revenue']> = {}
): AdminSubscriptionOverview {
  return {
    organizations: 4,
    subscriptions: {
      byStatus: { active: 3 },
      activePaid: 3,
      byStatusAndCycle: { active: { monthly: 2, yearly: 1, none: 0 } },
    },
    trials: { everRedeemed: 0, active: 0, cancelled: 0, convertedToPaid: 0 },
    cancellations: { trials: 0, paid: 0, byReason: {}, recent: [] },
    plans: [],
    totalPlansWithSubscriptions: 0,
    revenue: {
      tracked: true,
      mrr: [
        { currency: 'EGP', monthlyAmountMinorUnits: 219_000, subscriptions: 2 },
        { currency: 'USD', monthlyAmountMinorUnits: 4_900, subscriptions: 1 },
      ],
      activeSubscriptions: 4,
      activeWithoutPayment: 1,
      excludesInternalOrganizations: true,
      ...revenue,
    },
    generatedAt: '2026-10-13T00:00:00.000Z',
  };
}

function renderPage(language: 'en' | 'ar' = 'en') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <AtlasLocalizationProvider initialLanguage={language}>
        <AdminSubscriptionsPage />
      </AtlasLocalizationProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  getOverview.mockReset();
});

describe('Platform subscriptions overview — MRR (B0-ANL-01)', () => {
  it('shows one MRR figure per currency, never a combined total', async () => {
    getOverview.mockResolvedValue(overview());
    renderPage();
    const mrr = await screen.findByTestId('platform-mrr');
    expect(within(mrr).getByText('Per month (EGP)')).toBeTruthy();
    expect(within(mrr).getByText('Per month (USD)')).toBeTruthy();
    expect(within(mrr).getByText(/2,190/)).toBeTruthy();
    expect(within(mrr).getByText(/49\.00/)).toBeTruthy();
    expect(within(mrr).getByText('From 2 paid subscriptions')).toBeTruthy();
    expect(within(mrr).getByText('From 1 paid subscription')).toBeTruthy();
  });

  it('counts active subscriptions with no approved payment instead of valuing them', async () => {
    getOverview.mockResolvedValue(overview());
    renderPage();
    const mrr = await screen.findByTestId('platform-mrr');
    expect(
      within(mrr).getByText(
        '1 active subscription has no approved payment on record (for example, time granted by the platform) and is not included.'
      )
    ).toBeTruthy();
    expect(
      within(mrr).getByText(
        'Organizations marked as internal (test, demo or staff) are not included.'
      )
    ).toBeTruthy();
  });

  it('shows the active split by billing cycle', async () => {
    getOverview.mockResolvedValue(overview());
    renderPage();
    const mrr = await screen.findByTestId('platform-mrr');
    expect(within(mrr).getByText('Monthly').nextSibling?.textContent).toBe('2');
    expect(within(mrr).getByText('Yearly').nextSibling?.textContent).toBe('1');
  });

  it('says so plainly when no active subscription has an approved payment yet', async () => {
    getOverview.mockResolvedValue(
      overview({ mrr: [], activeWithoutPayment: 0 })
    );
    renderPage();
    const mrr = await screen.findByTestId('platform-mrr');
    expect(
      within(mrr).getByText(
        'No active subscription has an approved payment yet.'
      )
    ).toBeTruthy();
    expect(within(mrr).queryByText(/no approved payment on record/)).toBeNull();
  });

  it('renders the Arabic copy without raw keys', async () => {
    getOverview.mockResolvedValue(overview());
    renderPage('ar');
    const mrr = await screen.findByTestId('platform-mrr');
    expect(within(mrr).getByText('شهريًا (EGP)')).toBeTruthy();
    expect(mrr.textContent).not.toContain('adminSubscriptions.');
  });
});
