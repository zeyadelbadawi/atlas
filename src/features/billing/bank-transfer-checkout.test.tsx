/**
 * Bank Transfer — Organization side (2 Oct 2026).
 *
 * Pinned here:
 * - the payment page shows the instructions the payment was CREATED with
 *   (`payment.instructions`), including the SWIFT code, even once the
 *   method is disabled and no longer in the enabled catalog;
 * - the checkout offers "Yearly" only when the plan has a yearly price,
 *   and shows the catalog price of the chosen cycle;
 * - a 409 `alreadyUnderReview` leads to the existing payment instead of a
 *   retry that can only fail again.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { planService, tenantService } from '@features/tenant';
import { createApiError } from '@api';
import { paymentService } from './services/PaymentService';
import { checkoutService } from './services/CheckoutService';
import CheckoutPage from './pages/CheckoutPage';
import PaymentDetailsPage from './pages/PaymentDetailsPage';
import type {
  Checkout,
  CheckoutPaymentMethod,
  Payment,
  Plan,
  PlanPricingMetadata,
} from '@types';

// jsdom has no ResizeObserver; Radix RadioGroup measures its items with one.
globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};

const identity = {
  user: { id: 'u1', roles: [], organizations: [] },
  organization: { id: 'org-1', name: 'Nile', role: 'owner', permissions: [] },
} as unknown as IdentityContextValue;

function withProviders(entry: string, path: string, element: JSX.Element) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <I18nextProvider i18n={createI18nInstance('en')}>
        <ToastContext.Provider value={toastValue}>
          <IdentityContext.Provider value={identity}>
            <MemoryRouter initialEntries={[entry]}>
              <Routes>
                <Route path={path} element={element} />
              </Routes>
            </MemoryRouter>
          </IdentityContext.Provider>
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

/** Test-only values — obviously not a real account. */
const BANK_METHOD: CheckoutPaymentMethod = {
  id: 'pm-1',
  key: 'bank_transfer_test',
  type: 'manual_bank_transfer',
  displayName: 'Test Bank transfer',
  enabled: true,
  provider: 'atlas_manual',
  capabilities: {
    supportsManualReview: true,
    supportsProof: true,
    supportsRedirect: false,
    supportsEmbeddedCheckout: false,
    supportsAdditionalAuthentication: false,
    supportsWebhooks: false,
    supportsRefunds: false,
    supportsRecurring: false,
    supportsCancellation: true,
  },
  manualInstructions: {
    type: 'manual_bank_transfer',
    bankName: 'Current Test Bank',
    accountName: 'Current Holder',
    accountNumber: '9999',
    instructions: 'Current instructions.',
    referenceInstructions: 'Current reference.',
  },
};

beforeEach(() => {
  vi.spyOn(tenantService, 'getSubscription').mockRejectedValue(
    new Error('none')
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PaymentDetailsPage — kept instructions', () => {
  const PAYMENT: Payment = {
    id: 'pay-1',
    organizationId: 'org-1',
    checkoutId: 'chk-1',
    methodKey: 'bank_transfer_test',
    methodType: 'manual_bank_transfer',
    provider: 'atlas_manual',
    money: { amountMinorUnits: 10000, currency: 'EGP' },
    status: 'pending',
    reviewStatus: 'not_required',
    attempts: [],
    instructions: {
      type: 'manual_bank_transfer',
      bankName: 'Snapshot Test Bank',
      accountName: 'Snapshot Holder',
      accountNumber: '0000-1111',
      iban: 'XX12TEST000000000000',
      swiftCode: 'TESTXXAA',
      instructions: 'Snapshot instructions.',
      referenceInstructions: 'Snapshot reference.',
    },
    createdAt: '2026-10-02T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z',
  };

  const renderPayment = () =>
    withProviders(
      '/dashboard/tenant/billing/payments/pay-1',
      '/dashboard/tenant/billing/payments/:paymentId',
      <PaymentDetailsPage />
    );

  it('shows the snapshot, SWIFT included, when the method is gone from the catalog', async () => {
    vi.spyOn(paymentService, 'getPayment').mockResolvedValue(PAYMENT);
    // The method was disabled after this payment was created.
    vi.spyOn(paymentService, 'getPaymentMethods').mockResolvedValue([]);
    renderPayment();

    expect(await screen.findByText('Snapshot Test Bank')).toBeTruthy();
    expect(screen.getByText('0000-1111')).toBeTruthy();
    expect(screen.getByText('XX12TEST000000000000')).toBeTruthy();
    expect(screen.getByTestId('payment-instructions-swift').textContent).toBe(
      'TESTXXAA'
    );
    expect(screen.getByText('Snapshot reference.')).toBeTruthy();
    // The proof upload is still offered.
    expect(screen.getByText('Proof of payment')).toBeTruthy();
  });

  it('prefers the snapshot over the method’s current instructions', async () => {
    vi.spyOn(paymentService, 'getPayment').mockResolvedValue(PAYMENT);
    vi.spyOn(paymentService, 'getPaymentMethods').mockResolvedValue([
      BANK_METHOD,
    ]);
    renderPayment();

    expect(await screen.findByText('Snapshot Test Bank')).toBeTruthy();
    expect(screen.queryByText('Current Test Bank')).toBeNull();
  });

  it('falls back to the method’s instructions when there is no snapshot', async () => {
    vi.spyOn(paymentService, 'getPayment').mockResolvedValue({
      ...PAYMENT,
      instructions: undefined,
    });
    vi.spyOn(paymentService, 'getPaymentMethods').mockResolvedValue([
      BANK_METHOD,
    ]);
    renderPayment();

    expect(await screen.findByText('Current Test Bank')).toBeTruthy();
    expect(screen.queryByTestId('payment-instructions-swift')).toBeNull();
  });
});

describe('CheckoutPage — billing cycles', () => {
  const planWith = (pricing: PlanPricingMetadata): Plan =>
    ({ id: 'p-growth', key: 'growth', name: 'Growth', pricing }) as Plan;

  const renderCheckout = () =>
    withProviders(
      '/dashboard/tenant/billing/checkout/plan_subscription/growth',
      '/dashboard/tenant/billing/checkout/:targetType/:targetKey',
      <CheckoutPage />
    );

  beforeEach(() => {
    vi.spyOn(paymentService, 'getPaymentMethods').mockResolvedValue([
      BANK_METHOD,
    ]);
  });

  it('offers only Monthly when the plan has no yearly price', async () => {
    vi.spyOn(planService, 'getPlans').mockResolvedValue([
      planWith({ amount: 100, currency: 'USD', billingCycle: 'monthly' }),
    ]);
    renderCheckout();

    const price = await screen.findByTestId('checkout-cycle-price');
    expect(price.textContent).toContain('$100');
    expect(screen.getByLabelText('Monthly')).toBeTruthy();
    expect(screen.queryByLabelText('Yearly')).toBeNull();
  });

  it('offers Yearly at its own price when the plan has one', async () => {
    vi.spyOn(planService, 'getPlans').mockResolvedValue([
      planWith({
        amount: 100,
        currency: 'USD',
        billingCycle: 'monthly',
        yearlyAmount: 1000,
      }),
    ]);
    const createCheckout = vi
      .spyOn(checkoutService, 'createCheckout')
      .mockRejectedValue(createApiError('server'));
    renderCheckout();

    const yearly = await screen.findByLabelText('Yearly');
    fireEvent.click(yearly);
    await waitFor(() =>
      expect(screen.getByTestId('checkout-cycle-price').textContent).toContain(
        '$1,000'
      )
    );

    fireEvent.click(screen.getByText('Start checkout'));
    await waitFor(() => expect(createCheckout).toHaveBeenCalledTimes(1));
    expect(createCheckout.mock.calls[0][1]).toMatchObject({
      billingCycle: 'yearly',
    });
  });

  it('offers only Yearly for a plan priced per year', async () => {
    vi.spyOn(planService, 'getPlans').mockResolvedValue([
      planWith({ amount: 900, currency: 'USD', billingCycle: 'yearly' }),
    ]);
    renderCheckout();

    expect(await screen.findByLabelText('Yearly')).toBeTruthy();
    expect(screen.queryByLabelText('Monthly')).toBeNull();
  });
});

describe('CheckoutPage — payment already under review', () => {
  it('links to the existing payment on a 409 alreadyUnderReview', async () => {
    vi.spyOn(planService, 'getPlans').mockResolvedValue([]);
    vi.spyOn(paymentService, 'getPaymentMethods').mockResolvedValue([
      BANK_METHOD,
    ]);
    const checkout = {
      id: 'chk-1',
      organizationId: 'org-1',
      target: { type: 'plan_subscription', planKey: 'growth' },
      billingCycle: 'monthly',
      snapshot: {
        target: { type: 'plan_subscription', planKey: 'growth' },
        billingCycle: 'monthly',
        displayName: 'Growth',
        price: { amountMinorUnits: 10000, currency: 'USD' },
        capturedAt: '2026-10-02T00:00:00Z',
      },
      status: 'draft',
      expiresAt: '2026-10-03T00:00:00Z',
      idempotencyKey: 'k-1',
      createdAt: '2026-10-02T00:00:00Z',
    } as unknown as Checkout;
    vi.spyOn(checkoutService, 'createCheckout').mockResolvedValue(checkout);
    vi.spyOn(paymentService, 'createPayment').mockRejectedValue(
      createApiError('conflict', {
        status: 409,
        messageKey: 'errors.payment.alreadyUnderReview',
        details: { paymentId: 'pay-9' },
      })
    );

    withProviders(
      '/dashboard/tenant/billing/checkout/plan_subscription/growth',
      '/dashboard/tenant/billing/checkout/:targetType/:targetKey',
      <CheckoutPage />
    );

    fireEvent.click(await screen.findByText('Start checkout'));
    fireEvent.click(await screen.findByLabelText(/Test Bank transfer/));
    fireEvent.click(screen.getByText('Continue to payment'));

    const notice = await screen.findByTestId('checkout-payment-under-review');
    expect(notice.textContent).toContain(
      'A payment for this order is already awaiting review.'
    );
    const link = screen.getByRole('link', { name: 'View that payment' });
    expect(link.getAttribute('href')).toBe(
      '/dashboard/tenant/billing/payments/pay-9'
    );
  });
});
