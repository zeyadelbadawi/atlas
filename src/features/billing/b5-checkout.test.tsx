/**
 * B5 (UX audit) — the checkout says what is being bought and what happens.
 *
 *  V08  a 409 never prints "key 'conflict (en)' returned an object…".
 *  V10/V11  the current plan is "paying for its next period", with the date
 *       the new period starts; a change says paid days aren't lost.
 *  V21  seeded payment-method names show in Arabic.
 *  V23  an add-on checkout names the add-on and its price; none is offered
 *       for an active add-on or one that isn't for sale.
 *  V25  "Continue to payment" is never greyed without a reason; focus moves
 *       to the order summary after "Start checkout".
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
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
import { AtlasDialogProvider } from '@app/providers/dialog/DialogProvider';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { planService, tenantService } from '@features/tenant';
import { createApiError } from '@api';
import { paymentService } from './services/PaymentService';
import { checkoutService } from './services/CheckoutService';
import CheckoutPage, { planCheckoutMode } from './pages/CheckoutPage';
import { PlanChangeSummary } from './components/PlanChangeSummary';
import type {
  AddOn,
  Checkout,
  CheckoutPaymentMethod,
  LanguageCode,
  Plan,
  TenantSubscription,
} from '@types';

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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function providers(children: JSX.Element, language: LanguageCode = 'en') {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <I18nextProvider i18n={createI18nInstance(language)}>
        <AtlasDialogProvider>
          <ToastContext.Provider value={toastValue}>
            <IdentityContext.Provider value={identity}>
              {children}
            </IdentityContext.Provider>
          </ToastContext.Provider>
        </AtlasDialogProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

function renderCheckout(
  target: string,
  language: LanguageCode = 'en'
): ReturnType<typeof render> {
  return render(
    providers(
      <MemoryRouter
        initialEntries={[`/dashboard/tenant/billing/checkout/${target}`]}
      >
        <Routes>
          <Route
            path="/dashboard/tenant/billing/checkout/:targetType/:targetKey"
            element={<CheckoutPage />}
          />
        </Routes>
      </MemoryRouter>,
      language
    )
  );
}

const GROWTH = {
  id: 'p-growth',
  key: 'growth',
  name: 'Growth',
  nameLocalized: { en: 'Growth', ar: 'النمو' },
  status: 'active',
  pricing: { amount: 699, currency: 'EGP', billingCycle: 'monthly' },
} as unknown as Plan;

const SUBSCRIPTION = {
  organizationId: 'org-1',
  status: 'active',
  planId: 'p-growth',
  plan: GROWTH,
  billingCycle: 'monthly',
  currentPeriodEnd: new Date(2099, 11, 1, 12).toISOString(),
  cancelAtPeriodEnd: false,
} as unknown as TenantSubscription;

const EXTRA: AddOn = {
  id: 'a-extra',
  key: 'extra-academy',
  name: 'Extra Academy',
  description: 'Raises your academy limit by 2.',
  effect: { type: 'limit', limitKey: 'academies', amount: 2 },
  compatiblePlanKeys: ['growth'],
  pricing: { amount: 15, currency: 'USD', billingCycle: 'monthly' },
  catalogStatus: 'published',
} as AddOn;

const BANK: CheckoutPaymentMethod = {
  id: 'm1',
  key: 'atlas_bank_transfer',
  type: 'manual_bank_transfer',
  displayName: 'Bank Transfer',
  description:
    'Pay by direct bank transfer — reviewed manually within 1-2 business days.',
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
};

const CHECKOUT: Checkout = {
  id: 'chk-1',
  organizationId: 'org-1',
  target: { type: 'plan_subscription', planKey: 'growth' },
  billingCycle: 'monthly',
  snapshot: {
    target: { type: 'plan_subscription', planKey: 'growth' },
    billingCycle: 'monthly',
    displayName: 'Growth',
    price: { amountMinorUnits: 69900, currency: 'EGP' },
    capturedAt: '2026-11-06T00:00:00Z',
  },
  status: 'draft',
  expiresAt: '2026-11-06T00:30:00Z',
  idempotencyKey: 'k',
  createdAt: '2026-11-06T00:00:00Z',
};

function mockCatalog(options: { active?: boolean; addOn?: AddOn } = {}) {
  vi.spyOn(planService, 'getPlans').mockResolvedValue([GROWTH]);
  vi.spyOn(planService, 'getAddOns').mockResolvedValue([
    options.addOn ?? EXTRA,
  ]);
  vi.spyOn(tenantService, 'getSubscription').mockResolvedValue(SUBSCRIPTION);
  vi.spyOn(tenantService, 'getActiveAddOns').mockResolvedValue(
    options.active
      ? [
          {
            id: 'ta-1',
            organizationId: 'org-1',
            addOnId: EXTRA.id,
            addOn: EXTRA,
            activatedAt: '2026-10-01T00:00:00Z',
          },
        ]
      : []
  );
  vi.spyOn(paymentService, 'getPaymentMethods').mockResolvedValue([BANK]);
}

describe('V08 — a 409 on start', () => {
  it('shows the conflict description, never "returned an object"', async () => {
    mockCatalog();
    vi.spyOn(checkoutService, 'createCheckout').mockRejectedValue(
      createApiError('conflict', { status: 409, messageKey: 'errors.conflict' })
    );
    renderCheckout('plan_subscription/growth');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Start checkout' })
    );
    expect(
      await screen.findByText(
        'Reload the page to see the latest version, then try again.'
      )
    ).toBeTruthy();
    expect(document.body.textContent).not.toContain('returned an object');
    expect(toastValue.notifyError).not.toHaveBeenCalled();
  });
});

describe('V10 / V11 — buying the current plan again', () => {
  it('says it pays for the next period, starting when the current one ends', async () => {
    mockCatalog();
    renderCheckout('plan_subscription/growth');
    expect(
      await screen.findByText(
        'This is your current plan. You’re paying for its next period.'.replace(
          '’',
          "'"
        )
      )
    ).toBeTruthy();
    expect(screen.getByTestId('checkout-renew-note').textContent).toContain(
      '1 Dec 2099'
    );
  });

  it('decides the mode from the subscription as the backend applies it', () => {
    const now = new Date('2026-11-06T00:00:00Z');
    expect(planCheckoutMode(undefined, 'growth', now)).toBe('first');
    expect(planCheckoutMode(SUBSCRIPTION, 'growth', now)).toBe('renew');
    expect(planCheckoutMode(SUBSCRIPTION, 'starter', now)).toBe('change');
    expect(
      planCheckoutMode(
        { ...SUBSCRIPTION, status: 'trialing' } as TenantSubscription,
        'growth',
        now
      )
    ).toBe('change');
  });

  it('a plan change says paid days are kept (EN and AR)', () => {
    for (const [language, text] of [
      ['en', 'Days you’ve already paid for aren’t lost'.replace(/’/g, "'")],
      ['ar', 'لا تضيع الأيام التي دفعت مقابلها'],
    ] as const) {
      const { unmount } = render(
        providers(
          <PlanChangeSummary
            subscription={SUBSCRIPTION}
            newPlanName="Starter"
            mode="change"
          />,
          language
        )
      );
      expect(screen.getByTestId('plan-change-note').textContent).toContain(
        text
      );
      unmount();
    }
  });
});

describe('V23 — add-on checkout', () => {
  it('names the add-on and its price before anything starts', async () => {
    mockCatalog();
    renderCheckout('add_on/extra-academy');
    expect(
      (await screen.findByTestId('checkout-target')).textContent
    ).toContain('Extra Academy');
    // V33 — the add-on's own currency, by its code.
    expect(screen.getByTestId('checkout-add-on-price').textContent).toMatch(
      /USD\s15\.00/
    );
    expect(screen.getByRole('button', { name: 'Start checkout' })).toBeTruthy();
  });

  it('names it in Arabic (seeded add-on)', async () => {
    mockCatalog();
    renderCheckout('add_on/extra-academy', 'ar');
    expect(
      (await screen.findByTestId('checkout-target')).textContent
    ).toContain('أكاديمية إضافية');
  });

  it('offers no checkout for an add-on that is already active', async () => {
    mockCatalog({ active: true });
    renderCheckout('add_on/extra-academy');
    expect(await screen.findByTestId('checkout-add-on-active')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start checkout' })).toBeNull();
  });

  it('a failed catalog request does not read as "not for sale"', async () => {
    mockCatalog();
    const getAddOns = vi
      .spyOn(planService, 'getAddOns')
      .mockRejectedValue(
        createApiError('server', { status: 500, messageKey: 'errors.internal' })
      );
    renderCheckout('add_on/extra-academy');
    await waitFor(() => expect(getAddOns).toHaveBeenCalled());
    await screen.findByRole('button', { name: 'Start checkout' });
    expect(screen.queryByTestId('checkout-add-on-notForSale')).toBeNull();
  });

  it('offers no checkout for an add-on that is not for sale', async () => {
    mockCatalog({ addOn: { ...EXTRA, comingSoon: true } });
    renderCheckout('add_on/extra-academy');
    expect(
      await screen.findByTestId('checkout-add-on-notForSale')
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Start checkout' })).toBeNull();
  });
});

describe('V25 / V21 — choosing a payment method', () => {
  it('moves focus to the summary and asks for a method instead of greying the button', async () => {
    mockCatalog();
    vi.spyOn(checkoutService, 'createCheckout').mockResolvedValue(CHECKOUT);
    const createPayment = vi.spyOn(paymentService, 'createPayment');
    renderCheckout('plan_subscription/growth');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Start checkout' })
    );
    const heading = await screen.findByTestId('checkout-summary-heading');
    await waitFor(() => expect(document.activeElement).toBe(heading));

    const proceed = await screen.findByRole('button', {
      name: 'Continue to payment',
    });
    expect(proceed.hasAttribute('disabled')).toBe(false);
    fireEvent.click(proceed);
    expect(
      (await screen.findByTestId('checkout-method-missing')).textContent
    ).toBe('Choose a payment method first.');
    expect(createPayment).not.toHaveBeenCalled();
  });

  it('shows the seeded method name and description in Arabic', async () => {
    mockCatalog();
    vi.spyOn(checkoutService, 'createCheckout').mockResolvedValue(CHECKOUT);
    renderCheckout('plan_subscription/growth', 'ar');
    fireEvent.click(
      await screen.findByRole('button', { name: 'بدء عملية الدفع' })
    );
    // The method's own name (the type chip beside it says "تحويل بنكي" too).
    expect((await screen.findAllByText('تحويل بنكي')).length).toBe(2);
    expect(
      screen.getByText(
        'ادفع بتحويل بنكي مباشر — تُراجع الدفعة يدويًا خلال يوم إلى يومي عمل.'
      )
    ).toBeTruthy();
    expect(screen.queryByText('Bank Transfer')).toBeNull();
  });
});

describe('V22 — what an open payment needs', () => {
  it('names the next step by the payment state', async () => {
    const { paymentNextStepKey } = await import('./pages/BillingOverviewPage');
    expect(
      paymentNextStepKey({
        reviewStatus: 'pending',
        methodType: 'manual_bank_transfer',
      })
    ).toBe('payments:overview.nextStep.awaitingReview');
    expect(
      paymentNextStepKey({
        reviewStatus: 'not_required',
        methodType: 'manual_bank_transfer',
      })
    ).toBe('payments:overview.nextStep.transferAndUpload');
    const i18n = createI18nInstance('en');
    expect(i18n.t('payments:overview.nextStep.transferAndUpload')).toBe(
      'send the transfer, then upload your receipt.'
    );
    expect(
      i18n.t('payments:overview.noAttentionNeededDescription')
    ).not.toMatch(/content/i);
  });
});
