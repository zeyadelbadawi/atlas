/**
 * E-Wallets and InstaPay — Organization side (2 Oct 2026).
 *
 * The SAME checkout and payment page as Bank Transfer. Pinned here:
 * - the checkout tells Bank Transfer / E-Wallet (with its provider, e.g.
 *   "Vodafone Cash") / InstaPay apart, and warns on a placeholder method;
 * - the payment page renders a wallet's and an InstaPay snapshot — in
 *   Arabic with the Arabic texts (RTL) when they exist, English otherwise —
 *   with a "do not send money" banner for a placeholder snapshot, and the
 *   receipt upload working for both types;
 * - a payment the API refuses to show (403/404, e.g. another
 *   Organization's) is "not found", not an unexpected error to retry.
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
  LanguageCode,
  ManualPaymentInstructions,
  Payment,
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

function withProviders(
  entry: string,
  path: string,
  element: JSX.Element,
  language: LanguageCode = 'en'
) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <I18nextProvider i18n={createI18nInstance(language)}>
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

const CAPABILITIES = {
  supportsManualReview: true,
  supportsProof: true,
  supportsRedirect: false,
  supportsEmbeddedCheckout: false,
  supportsAdditionalAuthentication: false,
  supportsWebhooks: false,
  supportsRefunds: false,
  supportsRecurring: false,
  supportsCancellation: true,
};

function methodOf(
  key: string,
  displayName: string,
  manualInstructions: ManualPaymentInstructions
): CheckoutPaymentMethod {
  return {
    id: `id-${key}`,
    key,
    type: manualInstructions.type,
    displayName,
    enabled: true,
    provider: 'atlas_manual',
    capabilities: CAPABILITIES,
    manualInstructions,
  };
}

/** Test-only values — obviously not real accounts. */
const TEXTS = {
  accountName: 'Test Holder',
  accountNameAr: 'صاحب اختبار',
  instructions: 'Send the exact amount.',
  instructionsAr: 'أرسل المبلغ بالضبط.',
  referenceInstructions: 'Write the payment reference.',
  referenceInstructionsAr: 'اكتب مرجع الدفع.',
};

const WALLET_DETAILS: ManualPaymentInstructions = {
  type: 'manual_wallet_transfer',
  walletProvider: 'vodafone_cash',
  walletNumber: '01000000000',
  ...TEXTS,
};

const INSTAPAY_DETAILS: ManualPaymentInstructions = {
  type: 'manual_instapay',
  instapayAddress: 'test.holder@instapay',
  // English only: Arabic falls back to these.
  accountName: 'Test Holder',
  instructions: 'Send the exact amount.',
  referenceInstructions: 'Write the payment reference.',
};

const BANK = methodOf('bank_test', 'Test Bank account', {
  type: 'manual_bank_transfer',
  bankName: 'Test Bank',
  accountNumber: '0000-1111',
  ...TEXTS,
});
const WALLET = methodOf('wallet_test', 'Pay by wallet', WALLET_DETAILS);
const INSTAPAY = methodOf('instapay_test', 'Pay by InstaPay', INSTAPAY_DETAILS);
const PLACEHOLDER = methodOf('wallet_orange_cash', 'Orange Cash', {
  type: 'manual_wallet_transfer',
  walletProvider: 'orange_cash',
  walletNumber: 'PLACEHOLDER-NOT-A-WALLET',
  accountName: 'Placeholder Holder',
  instructions: 'Placeholder instructions.',
  referenceInstructions: 'Placeholder reference.',
  placeholder: true,
});

beforeEach(() => {
  vi.spyOn(tenantService, 'getSubscription').mockRejectedValue(
    new Error('none')
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  document.body.innerHTML = '';
});

describe('CheckoutPage — telling the manual methods apart', () => {
  it('labels Bank Transfer, E-Wallet (with provider) and InstaPay, and warns on a placeholder', async () => {
    vi.spyOn(planService, 'getPlans').mockResolvedValue([]);
    vi.spyOn(paymentService, 'getPaymentMethods').mockResolvedValue([
      BANK,
      WALLET,
      INSTAPAY,
      PLACEHOLDER,
    ]);
    vi.spyOn(checkoutService, 'createCheckout').mockResolvedValue({
      id: 'chk-1',
      organizationId: 'org-1',
      target: { type: 'plan_subscription', planKey: 'growth' },
      billingCycle: 'monthly',
      snapshot: {
        target: { type: 'plan_subscription', planKey: 'growth' },
        billingCycle: 'monthly',
        displayName: 'Growth',
        price: { amountMinorUnits: 10000, currency: 'EGP' },
        capturedAt: '2026-10-02T00:00:00Z',
      },
      status: 'draft',
      expiresAt: '2026-10-03T00:00:00Z',
      idempotencyKey: 'k-1',
      createdAt: '2026-10-02T00:00:00Z',
    } as unknown as Checkout);

    withProviders(
      '/dashboard/tenant/billing/checkout/plan_subscription/growth',
      '/dashboard/tenant/billing/checkout/:targetType/:targetKey',
      <CheckoutPage />
    );
    fireEvent.click(await screen.findByText('Start checkout'));

    expect(
      (await screen.findByTestId('checkout-method-type-bank_test')).textContent
    ).toBe('Bank transfer');
    expect(
      screen.getByTestId('checkout-method-type-wallet_test').textContent
    ).toBe('E-wallet');
    expect(
      screen.getByTestId('checkout-method-provider-wallet_test').textContent
    ).toBe('Vodafone Cash');
    expect(
      screen.getByTestId('checkout-method-type-instapay_test').textContent
    ).toBe('InstaPay');
    expect(
      screen.getByTestId('checkout-method-provider-wallet_orange_cash')
        .textContent
    ).toBe('Orange Cash');

    // Only the placeholder carries the warning.
    expect(
      screen.getByTestId('checkout-method-placeholder-wallet_orange_cash')
        .textContent
    ).toContain('Placeholder details — do not send money');
    for (const key of ['bank_test', 'wallet_test', 'instapay_test']) {
      expect(
        screen.queryByTestId(`checkout-method-placeholder-${key}`)
      ).toBeNull();
    }
    // The wallet is selectable by its own name.
    expect(screen.getByLabelText(/Pay by wallet/)).toBeTruthy();
  });
});

describe('PaymentDetailsPage — wallet and InstaPay snapshots', () => {
  const paymentWith = (
    instructions: ManualPaymentInstructions,
    methodKey: string
  ): Payment => ({
    id: 'pay-1',
    organizationId: 'org-1',
    checkoutId: 'chk-1',
    methodKey,
    methodType: instructions.type,
    provider: 'atlas_manual',
    money: { amountMinorUnits: 10000, currency: 'EGP' },
    status: 'pending',
    reviewStatus: 'not_required',
    attempts: [],
    instructions,
    createdAt: '2026-10-02T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z',
  });

  const renderPayment = (language: LanguageCode = 'en') =>
    withProviders(
      '/dashboard/tenant/billing/payments/pay-1',
      '/dashboard/tenant/billing/payments/:paymentId',
      <PaymentDetailsPage />,
      language
    );

  it('shows a wallet snapshot in English, with a copy button and the receipt upload', async () => {
    vi.spyOn(paymentService, 'getPayment').mockResolvedValue(
      paymentWith(WALLET_DETAILS, 'wallet_test')
    );
    // The method was disabled since: the snapshot still drives the page.
    vi.spyOn(paymentService, 'getPaymentMethods').mockResolvedValue([]);
    const submitProof = vi
      .spyOn(paymentService, 'submitProof')
      .mockResolvedValue({
        ...paymentWith(WALLET_DETAILS, 'wallet_test'),
        reviewStatus: 'pending',
      });
    renderPayment();

    expect(
      (await screen.findByTestId('payment-instructions-provider')).textContent
    ).toBe('Vodafone Cash');
    expect(
      screen.getByTestId('payment-instructions-wallet-number').textContent
    ).toBe('01000000000');
    expect(
      screen.getByTestId('payment-instructions-wallet-number').getAttribute('dir')
    ).toBe('ltr');
    expect(
      screen.getByTestId('payment-instructions-account-name').textContent
    ).toBe('Test Holder');
    expect(screen.getByTestId('payment-instructions-text').textContent).toBe(
      'Send the exact amount.'
    );
    expect(
      screen.getByRole('button', { name: 'Copy Wallet number' })
    ).toBeTruthy();
    expect(screen.queryByTestId('payment-placeholder-banner')).toBeNull();

    // The receipt upload is the same as Bank Transfer's.
    expect(screen.getByText('Proof of payment')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));
    const input = document.querySelector<HTMLInputElement>(
      'input[type="file"]'
    );
    expect(input).toBeTruthy();
    fireEvent.change(input!, {
      target: {
        files: [new File(['png'], 'receipt.png', { type: 'image/png' })],
      },
    });
    fireEvent.click(
      await screen.findByRole('button', { name: 'Submit for review' })
    );
    await waitFor(() => expect(submitProof).toHaveBeenCalledTimes(1));
    expect(submitProof.mock.calls[0][0]).toBe('org-1');
    expect(submitProof.mock.calls[0][1]).toBe('pay-1');
    expect(submitProof.mock.calls[0][2]).toMatchObject({
      fileName: 'receipt.png',
      mimeType: 'image/png',
    });
  });

  it('shows the Arabic texts, right-to-left, when the UI is Arabic', async () => {
    vi.spyOn(paymentService, 'getPayment').mockResolvedValue(
      paymentWith(WALLET_DETAILS, 'wallet_test')
    );
    vi.spyOn(paymentService, 'getPaymentMethods').mockResolvedValue([]);
    renderPayment('ar');

    expect(
      (await screen.findByTestId('payment-instructions-provider')).textContent
    ).toBe('فودافون كاش');
    const holder = screen.getByTestId('payment-instructions-account-name');
    expect(holder.textContent).toBe('صاحب اختبار');
    expect(holder.getAttribute('dir')).toBe('rtl');
    const text = screen.getByTestId('payment-instructions-text');
    expect(text.textContent).toBe('أرسل المبلغ بالضبط.');
    expect(text.getAttribute('dir')).toBe('rtl');
    expect(
      screen.getByTestId('payment-instructions-reference').textContent
    ).toBe('اكتب مرجع الدفع.');
    // The number itself stays left-to-right.
    expect(
      screen.getByTestId('payment-instructions-wallet-number').getAttribute('dir')
    ).toBe('ltr');
    expect(screen.getByText('إثبات الدفع')).toBeTruthy();
  });

  it('shows an InstaPay snapshot, falling back to English texts in Arabic', async () => {
    vi.spyOn(paymentService, 'getPayment').mockResolvedValue(
      paymentWith(INSTAPAY_DETAILS, 'instapay_test')
    );
    vi.spyOn(paymentService, 'getPaymentMethods').mockResolvedValue([
      INSTAPAY,
    ]);
    renderPayment('ar');

    expect(
      (await screen.findByTestId('payment-instructions-instapay-address'))
        .textContent
    ).toBe('test.holder@instapay');
    expect(
      screen.getByTestId('payment-instructions-provider').textContent
    ).toBe('إنستاباي');
    const holder = screen.getByTestId('payment-instructions-account-name');
    expect(holder.textContent).toBe('Test Holder');
    expect(holder.getAttribute('dir')).toBe('auto');
    expect(screen.getByTestId('payment-instructions-text').textContent).toBe(
      'Send the exact amount.'
    );
    // Receipt upload offered for InstaPay too.
    expect(screen.getByText('إثبات الدفع')).toBeTruthy();
  });

  it('shows an InstaPay snapshot in English with its copy button', async () => {
    vi.spyOn(paymentService, 'getPayment').mockResolvedValue(
      paymentWith(INSTAPAY_DETAILS, 'instapay_test')
    );
    vi.spyOn(paymentService, 'getPaymentMethods').mockResolvedValue([]);
    renderPayment();

    expect(
      (await screen.findByTestId('payment-instructions-provider')).textContent
    ).toBe('InstaPay');
    expect(
      screen.getByRole('button', { name: 'Copy InstaPay address' })
    ).toBeTruthy();
    expect(screen.getByText('Proof of payment')).toBeTruthy();
  });

  it('warns not to send money when the snapshot is a placeholder', async () => {
    vi.spyOn(paymentService, 'getPayment').mockResolvedValue(
      paymentWith(PLACEHOLDER.manualInstructions!, 'wallet_orange_cash')
    );
    vi.spyOn(paymentService, 'getPaymentMethods').mockResolvedValue([]);
    renderPayment();

    const banner = await screen.findByTestId('payment-placeholder-banner');
    expect(banner.textContent).toContain(
      'Placeholder details — do not send money'
    );
  });

  it.each([
    ['forbidden', 403],
    ['notFound', 404],
  ] as const)(
    'shows "not found" when the API refuses the read (%s)',
    async (kind, status) => {
      vi.spyOn(paymentService, 'getPayment').mockRejectedValue(
        createApiError(kind, { status })
      );
      vi.spyOn(paymentService, 'getPaymentMethods').mockResolvedValue([]);
      renderPayment();

      expect(await screen.findByText('Payment not found')).toBeTruthy();
      expect(
        screen.getByText(
          "This payment doesn't exist, or it belongs to another organization."
        )
      ).toBeTruthy();
      expect(screen.queryByText('Unexpected error')).toBeNull();
      expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    }
  );

  it('still offers a retry for a genuinely unexpected failure', async () => {
    vi.spyOn(paymentService, 'getPayment').mockRejectedValue(
      createApiError('server', { status: 500 })
    );
    vi.spyOn(paymentService, 'getPaymentMethods').mockResolvedValue([]);
    renderPayment();

    expect(
      await screen.findByRole('button', { name: 'Try again' })
    ).toBeTruthy();
    expect(screen.queryByText('Payment not found')).toBeNull();
  });
});
