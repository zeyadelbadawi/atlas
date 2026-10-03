/**
 * Platform subscription-payment review (list + detail) — what the Platform
 * Owner sees and what is sent. Authorization is the backend's
 * (`PlatformOwnerGuard`); nothing here is a security test.
 *
 * Pinned here:
 *   - rows name the organization and the plan + billing cycle (never a raw
 *     organization id) and render the server page as-is;
 *   - the review queue opens on pending, newest first, and search goes to
 *     the server;
 *   - the detail names the organization and plan, and while an approval or
 *     a rejection is in flight NEITHER decision can be sent;
 *   - the approve/reject hooks invalidate every view the decision changes.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import type { Payment } from '@types';
import {
  analyticsKeys,
  platformMetricsKeys,
  platformOrganizationKeys,
  platformPaymentKeys,
  platformSubscriptionKeys,
} from '@services/query';
import { subscriptionPaymentDecisionKeys } from './hooks/platform-payment-decision.keys';

const usePlatformPayments = vi.fn();
const usePlatformPaymentDetail = vi.fn();
const approveMutate = vi.fn();
const rejectMutate = vi.fn();
const refetch = vi.fn();
const pending = { approve: false, reject: false };

vi.mock('./hooks', () => ({
  usePlatformPayments: (options: unknown) =>
    usePlatformPayments(options) as unknown,
  usePlatformPaymentDetail: (id: string) =>
    usePlatformPaymentDetail(id) as unknown,
  useApprovePayment: () => ({
    mutate: approveMutate,
    isPending: pending.approve,
    error: null,
  }),
  useRejectPayment: () => ({
    mutate: rejectMutate,
    isPending: pending.reject,
    error: null,
  }),
}));

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ organization: { id: 'reviewer-org' } }),
  usePermissions: () => ({ hasPermission: () => true }),
}));

vi.mock('@app/providers/toast/useToast', () => ({
  useToast: () => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }),
}));

const { default: ListPage } =
  await import('./pages/PlatformPaymentReviewListPage');
const { default: DetailPage } =
  await import('./pages/PlatformPaymentReviewDetailPage');

function payment(over: Partial<Payment> = {}): Payment {
  return {
    id: 'pay-1',
    organizationId: 'org-uuid-1',
    checkoutId: 'checkout-1',
    methodKey: 'bank',
    methodType: 'manual_bank_transfer',
    provider: 'atlas_manual',
    money: { amountMinorUnits: 300000, currency: 'EGP' },
    status: 'pending',
    reviewStatus: 'pending',
    attempts: [],
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
    organization: { id: 'org-uuid-1', name: 'Nile Learning Co' },
    checkoutSummary: {
      targetType: 'plan_subscription',
      targetKey: 'pro',
      displayName: 'Pro',
      billingCycle: 'yearly',
    },
    ...over,
  };
}

function page(items: readonly Payment[]) {
  return {
    data: {
      items,
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: items.length,
        totalPages: 1,
      },
    },
    isLoading: false,
    error: null,
    refetch,
  };
}

function renderList(language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter>
        <ListPage />
      </MemoryRouter>
    </I18nextProvider>
  );
}

function renderDetail() {
  return render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <MemoryRouter initialEntries={['/p/pay-1']}>
        <Routes>
          <Route path="/p/:paymentId" element={<DetailPage />} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  pending.approve = false;
  pending.reject = false;
});

describe('PlatformPaymentReviewListPage', () => {
  it('names the organization and the plan + cycle, never the raw organization id', () => {
    usePlatformPayments.mockReturnValue(
      page([
        payment(),
        payment({
          id: 'pay-2',
          reviewStatus: 'approved',
          organization: undefined,
          checkoutSummary: {
            targetType: 'add_on',
            targetKey: 'extra-seats',
            displayName: 'Extra seats',
          },
        }),
      ])
    );
    const { container } = renderList();
    expect(screen.getByText('Nile Learning Co')).toBeTruthy();
    expect(screen.getByText('Pro · Yearly')).toBeTruthy();
    expect(screen.getByText('Add-on: Extra seats')).toBeTruthy();
    expect(screen.getByText('Organization unavailable')).toBeTruthy();
    expect(container.textContent).not.toContain('org-uuid-1');
    expect(container.textContent).not.toMatch(/payments:/);
  });

  it('opens on the pending queue, newest first, server-side', () => {
    usePlatformPayments.mockReturnValue(page([payment()]));
    renderList();
    expect(usePlatformPayments).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          pagination: { page: 1, pageSize: 20 },
          sort: { field: 'createdAt', direction: 'desc' },
          filters: { reviewStatus: 'pending' },
        }),
      })
    );
  });

  it('sends the search to the server', async () => {
    usePlatformPayments.mockReturnValue(page([payment()]));
    renderList();
    fireEvent.change(
      screen.getByRole('searchbox', {
        name: 'Search by organization, reference or payment ID',
      }),
      { target: { value: 'Nile' } }
    );
    await waitFor(() =>
      expect(usePlatformPayments).toHaveBeenLastCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ search: 'Nile' }),
        })
      )
    );
  });

  it('shows the empty state and a retryable error', () => {
    usePlatformPayments.mockReturnValue(page([]));
    renderList();
    expect(screen.getByText('No payments to review')).toBeTruthy();
    cleanup();

    usePlatformPayments.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
      refetch,
    });
    renderList();
    fireEvent.click(screen.getByRole('button', { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('renders in Arabic with no missing keys', () => {
    usePlatformPayments.mockReturnValue(page([payment()]));
    const { container } = renderList('ar');
    expect(container.textContent).toMatch(/مراجعة المدفوعات/);
    expect(container.textContent).toMatch(/سنوي/);
    expect(container.textContent).not.toMatch(/payments:/);
  });
});

describe('PlatformPaymentReviewDetailPage', () => {
  it('names the organization and the plan', () => {
    usePlatformPaymentDetail.mockReturnValue({
      data: payment(),
      isLoading: false,
      error: null,
      refetch,
    });
    const { container } = renderDetail();
    expect(screen.getByText('Nile Learning Co')).toBeTruthy();
    expect(screen.getByText('Pro · Yearly')).toBeTruthy();
    expect(container.textContent).not.toContain('org-uuid-1');
  });

  it.each([
    ['an approval', 'approve'],
    ['a rejection', 'reject'],
  ] as const)(
    'disables BOTH decisions while %s is in flight',
    (_label, which) => {
      pending[which] = true;
      usePlatformPaymentDetail.mockReturnValue({
        data: payment(),
        isLoading: false,
        error: null,
        refetch,
      });
      renderDetail();
      const buttons = screen
        .getAllByRole('button')
        .filter((b) =>
          /Approve payment|Reject payment/.test(b.textContent ?? '')
        );
      expect(buttons).toHaveLength(2);
      for (const button of buttons) {
        expect((button as HTMLButtonElement).disabled).toBe(true);
      }
    }
  );

  it('enables both decisions when nothing is in flight', () => {
    usePlatformPaymentDetail.mockReturnValue({
      data: payment(),
      isLoading: false,
      error: null,
      refetch,
    });
    renderDetail();
    const buttons = screen
      .getAllByRole('button')
      .filter((b) =>
        /Approve payment|Reject payment/.test(b.textContent ?? '')
      );
    expect(buttons.every((b) => !(b as HTMLButtonElement).disabled)).toBe(true);
  });
});

describe('subscriptionPaymentDecisionKeys', () => {
  it('covers the queue, metrics, analytics, subscriptions overview and the organization', () => {
    expect(subscriptionPaymentDecisionKeys('pay-1', 'org-1')).toEqual([
      platformPaymentKeys.detail('pay-1'),
      platformPaymentKeys.all,
      platformMetricsKeys.all,
      analyticsKeys.all,
      platformSubscriptionKeys.all,
      platformOrganizationKeys.detail('org-1'),
    ]);
    expect(subscriptionPaymentDecisionKeys('pay-1', undefined)).toContainEqual(
      platformOrganizationKeys.all
    );
  });
});
