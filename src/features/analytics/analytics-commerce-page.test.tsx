/**
 * Analysis › Commerce (P64 Phase 4).
 *
 * Native DOM assertions only (this repo has no jest-dom). The hook and
 * i18n are mocked the way `platform-video-metrics.test.tsx` does it, so
 * assertions pin structure — which figures appear, where, and in which
 * live region — rather than copy.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AnalyticsCommercePage from './pages/AnalyticsCommercePage';
import type { PlatformCommerceMetrics } from '@types';

const mockQuery = vi.fn();
vi.mock('@features/platform', () => ({
  usePlatformCommerceMetrics: (days: number) => mockQuery(days),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${Object.values(vars).join(',')}` : key,
    i18n: { language: 'en' },
  }),
}));

afterEach(() => {
  cleanup();
  mockQuery.mockReset();
});

function renderAt(url = '/dashboard/analytics/commerce') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AnalyticsCommercePage />
    </MemoryRouter>
  );
}

const data: PlatformCommerceMetrics = {
  windowDays: 30,
  generatedAt: '2026-09-24T10:00:00.000Z',
  orders: {
    created: 40,
    pendingPayment: 5,
    paid: 30,
    expired: 2,
    refunded: 2,
    cancelled: 1,
  },
  payments: { awaitingReview: 3, approvedInWindow: 28, rejectedInWindow: 2 },
  approvalLatencySeconds: {
    p50: 5_400,
    p95: 90_000,
    sampleSize: 28,
    truncated: false,
  },
  refunds: { requestedInWindow: 4, completedInWindow: 2 },
  revenue: { paidByCurrency: { AED: 150_000, USD: 20_050 } },
};

const empty: PlatformCommerceMetrics = {
  ...data,
  orders: {
    created: 0,
    pendingPayment: 0,
    paid: 0,
    expired: 0,
    refunded: 0,
    cancelled: 0,
  },
  payments: { awaitingReview: 0, approvedInWindow: 0, rejectedInWindow: 0 },
  approvalLatencySeconds: { p50: null, p95: null, sampleSize: 0, truncated: false },
  refunds: { requestedInWindow: 0, completedInWindow: 0 },
  revenue: { paidByCurrency: {} },
};

describe('AnalyticsCommercePage', () => {
  it('asks for the window the shared analytics range names', () => {
    mockQuery.mockReturnValue({ isLoading: true });
    renderAt('/dashboard/analytics/commerce?range=90d');
    expect(mockQuery).toHaveBeenCalledWith(90);
  });

  it('renders a busy skeleton while loading', () => {
    mockQuery.mockReturnValue({ isLoading: true });
    const { container } = renderAt();
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.queryByText('analytics:commerce.orders.title')).toBeNull();
  });

  it('renders the headline figures, the orders table and revenue per currency', () => {
    mockQuery.mockReturnValue({ data, isLoading: false });
    renderAt();

    expect(screen.getByText('analytics:commerce.headline.paidOrders')).toBeTruthy();
    // Paid orders appears once as the headline tile; other 30s are legitimate.
    expect(screen.getAllByText('30').length).toBeGreaterThan(0);
    // Awaiting review is a current backlog and says so.
    expect(
      screen.getByText('analytics:commerce.headline.awaitingReviewHint')
    ).toBeTruthy();
    // 5 400 s → 1 h 30 min; 90 000 s → 1 d 1 h. Humanised, never raw seconds.
    expect(
      screen.getAllByText('analytics:duration.hours:1 analytics:duration.minutes:30')
        .length
    ).toBeGreaterThan(0);
    expect(screen.queryByText('5400')).toBeNull();

    // Orders by status is a real table with a row header per status.
    const table = screen.getByRole('table', { name: 'analytics:commerce.orders.title' });
    expect(table).toBeTruthy();
    expect(
      screen.getByRole('rowheader', { name: 'analytics:commerce.orders.status.pendingPayment' })
    ).toBeTruthy();

    // Minor units go through formatMoney: 150000 AED → 1,500.00; never summed.
    expect(screen.getAllByText(/1,500\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/200\.50/).length).toBeGreaterThan(0);
    expect(screen.getByText('AED')).toBeTruthy();
    expect(screen.getByText('USD')).toBeTruthy();

    // Report sections are h2s under the layout's h1.
    const h2s = screen.getAllByRole('heading', { level: 2 });
    expect(h2s.length).toBeGreaterThanOrEqual(4);
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('shows the empty state when nothing happened in the window', () => {
    mockQuery.mockReturnValue({ data: empty, isLoading: false });
    renderAt();
    // EmptyState passes the window as a value, which the mocked t echoes.
    expect(screen.getByText(/^analytics:commerce\.empty\.title/)).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('renders an error state with a retry that refetches', () => {
    const refetch = vi.fn();
    mockQuery.mockReturnValue({
      error: { kind: 'server', requestId: 'req_1' },
      isLoading: false,
      refetch,
    });
    renderAt();
    expect(screen.queryByText('analytics:commerce.orders.title')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'common:actions.retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('announces a capped latency sample in a status region', () => {
    mockQuery.mockReturnValue({
      data: {
        ...data,
        approvalLatencySeconds: { ...data.approvalLatencySeconds, truncated: true },
      },
      isLoading: false,
    });
    renderAt();
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('analytics:commerce.payments.truncated');
  });

  it('omits the truncated notice when the sample is complete', () => {
    mockQuery.mockReturnValue({ data, isLoading: false });
    renderAt();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
