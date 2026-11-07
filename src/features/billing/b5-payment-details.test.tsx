/**
 * B5 (UX audit) — the payment page tells the customer what to do with
 * their money, and every failure is one clear message.
 *
 *  V01  "Cancel payment" asks first and says what to do if money was sent.
 *  V04  a failed proof upload: ONE inline message with the real reason.
 *  V05  the note has the server's 500 limit with a counter; a 400 on
 *       `note` marks the note.
 *  V06  the checkout id the transfer instructions ask for is shown,
 *       labelled and copyable.
 *  V07/V24  an expired/failed/cancelled payment hides the bank details and
 *       the upload, and offers "Start a new checkout" as a real link.
 *  V18  types and the 10 MB limit are stated before choosing; "too large"
 *       names the limit; Submit is never greyed without a reason.
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
import { createApiError } from '@api';
import { paymentService } from './services/PaymentService';
import { checkoutService } from './services/CheckoutService';
import PaymentDetailsPage, {
  newCheckoutPath,
} from './pages/PaymentDetailsPage';
import { proofFailureTarget } from './components/PaymentProofForm';
import type { Checkout, LanguageCode, Payment } from '@types';

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
  // `useFilePicker` appends its hidden input to <body>.
  document
    .querySelectorAll('input[type="file"]')
    .forEach((input) => input.remove());
});

function renderPayment(language: LanguageCode = 'en') {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <I18nextProvider i18n={createI18nInstance(language)}>
        <AtlasDialogProvider>
          <ToastContext.Provider value={toastValue}>
            <IdentityContext.Provider value={identity}>
              <MemoryRouter
                initialEntries={['/dashboard/tenant/billing/payments/pay-1']}
              >
                <Routes>
                  <Route
                    path="/dashboard/tenant/billing/payments/:paymentId"
                    element={<PaymentDetailsPage />}
                  />
                </Routes>
              </MemoryRouter>
            </IdentityContext.Provider>
          </ToastContext.Provider>
        </AtlasDialogProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

const PAYMENT: Payment = {
  id: 'pay-1',
  organizationId: 'org-1',
  checkoutId: 'chk-7f3a',
  methodKey: 'atlas_bank_transfer',
  methodType: 'manual_bank_transfer',
  provider: 'atlas_manual',
  money: { amountMinorUnits: 699000, currency: 'EGP' },
  status: 'pending',
  reviewStatus: 'not_required',
  attempts: [],
  instructions: {
    type: 'manual_bank_transfer',
    bankName: 'Test Bank',
    accountNumber: '000111',
    accountName: 'Test Holder',
    instructions: 'Send the exact amount.',
    referenceInstructions: 'Use your Checkout id as the transfer reference.',
  },
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
};

function mockPayment(payment: Payment = PAYMENT) {
  vi.spyOn(paymentService, 'getPayment').mockResolvedValue(payment);
  vi.spyOn(paymentService, 'getPaymentMethods').mockResolvedValue([]);
}

function chooseFile(file: File) {
  fireEvent.click(screen.getByRole('button', { name: 'Choose file' }));
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  fireEvent.change(input!, { target: { files: [file] } });
}

describe('V06 — the transfer reference', () => {
  it('shows the checkout id, labelled and copyable, beside the instructions', async () => {
    mockPayment();
    renderPayment();
    expect((await screen.findByTestId('payment-checkout-id')).textContent).toBe(
      'chk-7f3a'
    );
    expect(
      screen.getByTestId('payment-transfer-reference').textContent
    ).toContain('Checkout ID');
    expect(
      screen.getByRole('button', { name: 'Copy Checkout ID' })
    ).toBeTruthy();
    // The header row is the payment's own id, named as such.
    expect(screen.getByText('Payment ID')).toBeTruthy();
  });

  it('labels it in Arabic as the Arabic instructions name it', async () => {
    mockPayment();
    renderPayment('ar');
    expect(
      (await screen.findByTestId('payment-transfer-reference')).textContent
    ).toContain('رقم عملية الدفع');
  });
});

describe('V18 / V05 — the proof form', () => {
  it('states the types and the 10 MB limit before choosing, and the note limit', async () => {
    mockPayment();
    renderPayment();
    expect(
      await screen.findByText(
        'Upload a screenshot or receipt of your transfer: PNG, JPG or PDF, up to 10 MB.'
      )
    ).toBeTruthy();
    expect(screen.getByTestId('payment-proof-note-count').textContent).toBe(
      '0 / 500 characters'
    );
  });

  it('says it in Arabic too', async () => {
    mockPayment();
    renderPayment('ar');
    expect(
      (await screen.findByTestId('payment-proof-note-count')).textContent
    ).toContain('500');
    expect(screen.getByText(/PNG أو JPG أو PDF، بحجم لا يتجاوز/)).toBeTruthy();
  });

  it('never greys Submit: without a file it says to choose one', async () => {
    mockPayment();
    const submit = vi.spyOn(paymentService, 'submitProof');
    renderPayment();
    const button = await screen.findByTestId('payment-proof-submit');
    expect(button.hasAttribute('disabled')).toBe(false);
    fireEvent.click(button);
    expect(
      (await screen.findByTestId('payment-proof-file-error')).textContent
    ).toBe('Choose the receipt file first (PNG, JPG or PDF, up to 10 MB).');
    expect(submit).not.toHaveBeenCalled();
  });

  it('names the limit when the file is too large', async () => {
    mockPayment();
    renderPayment();
    await screen.findByTestId('payment-proof-submit');
    const big = new File(['x'], 'scan.pdf', { type: 'application/pdf' });
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });
    chooseFile(big);
    expect(
      (await screen.findByTestId('payment-proof-file-error')).textContent
    ).toBe(
      'That file is larger than 10 MB. Choose a smaller file or compress it.'
    );
  });

  it('refuses a note over 500 characters before sending, without cutting it', async () => {
    mockPayment();
    const submit = vi.spyOn(paymentService, 'submitProof');
    renderPayment();
    await screen.findByTestId('payment-proof-submit');
    chooseFile(new File(['png'], 'receipt.png', { type: 'image/png' }));
    const note = screen.getByTestId('payment-proof-note');
    expect(note.hasAttribute('maxlength')).toBe(false);
    fireEvent.change(note, { target: { value: 'n'.repeat(501) } });
    expect(screen.getByTestId('payment-proof-note-count').textContent).toBe(
      '501 / 500 characters'
    );
    fireEvent.click(screen.getByTestId('payment-proof-submit'));
    expect(
      (await screen.findByTestId('payment-proof-note-error')).textContent
    ).toBe('Note for the reviewer must be 500 characters or fewer');
    expect(submit).not.toHaveBeenCalled();
  });

  it('puts a server refusal of the note on the note — no alert, no toast', async () => {
    mockPayment();
    vi.spyOn(paymentService, 'submitProof').mockRejectedValue(
      createApiError('validation', {
        status: 400,
        messageKey: 'errors.validation.failed',
        violations: [
          {
            field: 'note',
            messageKey: 'validation:maxLength',
            values: { count: 500 },
          },
        ],
      })
    );
    renderPayment();
    await screen.findByTestId('payment-proof-submit');
    chooseFile(new File(['png'], 'receipt.png', { type: 'image/png' }));
    fireEvent.click(screen.getByTestId('payment-proof-submit'));
    expect(
      (await screen.findByTestId('payment-proof-note-error')).textContent
    ).toContain('500');
    expect(screen.queryByTestId('save-failed')).toBeNull();
    expect(toastValue.notifyError).not.toHaveBeenCalled();
  });

  it('shows ONE inline message with the real reason for a server failure (V04)', async () => {
    mockPayment();
    vi.spyOn(paymentService, 'submitProof').mockRejectedValue(
      createApiError('conflict', {
        status: 409,
        messageKey: 'errors.payment.notEditable',
      })
    );
    renderPayment();
    await screen.findByTestId('payment-proof-submit');
    chooseFile(new File(['png'], 'receipt.png', { type: 'image/png' }));
    fireEvent.click(screen.getByTestId('payment-proof-submit'));
    const alerts = await screen.findAllByTestId('save-failed');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].textContent).toContain("Your proof wasn't submitted");
    expect(alerts[0].textContent).toContain(
      'This payment is already closed, so it can’t be changed.'.replace(
        '’',
        "'"
      )
    );
    expect(alerts[0].textContent).not.toContain('Unexpected');
    expect(toastValue.notifyError).not.toHaveBeenCalled();
  });

  it('sorts a failure onto the note, the file, or the one alert', () => {
    expect(
      proofFailureTarget({
        messageKey: 'errors.validation.failed',
        violations: [{ field: 'note', messageKey: 'validation:maxLength' }],
      })
    ).toBe('note');
    expect(
      proofFailureTarget({
        messageKey: 'errors.validation.failed',
        violations: [{ field: 'fileData', messageKey: 'validation:invalid' }],
      })
    ).toBe('file');
    expect(
      proofFailureTarget({
        messageKey: 'errors.payment.unsupportedProofFileType',
      })
    ).toBe('file');
    expect(proofFailureTarget({ messageKey: 'errors.internal' })).toBe('alert');
  });
});

describe('B8 — the transfer reference on a subscription proof', () => {
  it('is an optional field with the server limit, sent trimmed with the proof', async () => {
    mockPayment();
    const submit = vi
      .spyOn(paymentService, 'submitProof')
      .mockResolvedValue({ ...PAYMENT, reviewStatus: 'pending' });
    renderPayment();
    const reference = await screen.findByTestId('payment-proof-reference');
    expect(
      screen.getByTestId('payment-proof-reference-count').textContent
    ).toBe('0 / 120 characters');
    fireEvent.change(reference, { target: { value: '  CIB-778812  ' } });
    chooseFile(new File(['png'], 'receipt.png', { type: 'image/png' }));
    fireEvent.click(screen.getByTestId('payment-proof-submit'));
    await waitFor(() => expect(submit).toHaveBeenCalled());
    expect(submit.mock.calls[0][2]).toMatchObject({
      fileName: 'receipt.png',
      payerReference: 'CIB-778812',
    });
  });

  it('leaves it out when empty', async () => {
    mockPayment();
    const submit = vi
      .spyOn(paymentService, 'submitProof')
      .mockResolvedValue({ ...PAYMENT, reviewStatus: 'pending' });
    renderPayment();
    await screen.findByTestId('payment-proof-submit');
    chooseFile(new File(['png'], 'receipt.png', { type: 'image/png' }));
    fireEvent.click(screen.getByTestId('payment-proof-submit'));
    await waitFor(() => expect(submit).toHaveBeenCalled());
    expect(submit.mock.calls[0][2]).not.toHaveProperty('payerReference');
  });

  it('refuses more than 120 characters before sending, without cutting it', async () => {
    mockPayment();
    const submit = vi.spyOn(paymentService, 'submitProof');
    renderPayment();
    const reference = await screen.findByTestId('payment-proof-reference');
    expect(reference.hasAttribute('maxlength')).toBe(false);
    fireEvent.change(reference, { target: { value: 'r'.repeat(121) } });
    chooseFile(new File(['png'], 'receipt.png', { type: 'image/png' }));
    fireEvent.click(screen.getByTestId('payment-proof-submit'));
    expect(
      (await screen.findByTestId('payment-proof-reference-error')).textContent
    ).toBe('Transfer reference must be 120 characters or fewer');
    expect(submit).not.toHaveBeenCalled();
  });

  it('puts a server refusal of the reference on the reference', async () => {
    mockPayment();
    vi.spyOn(paymentService, 'submitProof').mockRejectedValue(
      createApiError('validation', {
        status: 400,
        messageKey: 'errors.validation.failed',
        violations: [
          {
            field: 'payerReference',
            messageKey: 'validation:maxLength',
            values: { count: 120 },
          },
        ],
      })
    );
    renderPayment();
    await screen.findByTestId('payment-proof-submit');
    chooseFile(new File(['png'], 'receipt.png', { type: 'image/png' }));
    fireEvent.click(screen.getByTestId('payment-proof-submit'));
    expect(
      (await screen.findByTestId('payment-proof-reference-error')).textContent
    ).toContain('120');
    expect(screen.queryByTestId('save-failed')).toBeNull();
    expect(
      proofFailureTarget({
        messageKey: 'errors.validation.failed',
        violations: [{ field: 'payerReference', messageKey: 'x' }],
      })
    ).toBe('reference');
  });

  it('is labelled in Arabic', async () => {
    mockPayment();
    renderPayment('ar');
    await screen.findByTestId('payment-proof-reference');
    expect(screen.getByLabelText(/مرجع التحويل/)).toBe(
      screen.getByTestId('payment-proof-reference')
    );
  });
});

describe('V01 — cancelling a payment', () => {
  it('asks first, says what to do with money already sent, and cancels only on confirm', async () => {
    mockPayment();
    const cancel = vi
      .spyOn(paymentService, 'cancelPayment')
      .mockResolvedValue({ ...PAYMENT, status: 'cancelled' });
    renderPayment();
    fireEvent.click(await screen.findByTestId('payment-cancel'));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toContain('Cancel this payment?');
    expect(dialog.textContent).toContain(
      "If you've already sent the money, don't cancel: upload your receipt instead."
    );
    expect(cancel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep payment' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(cancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('payment-cancel'));
    await screen.findByRole('alertdialog');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel payment' }));
    await waitFor(() => expect(cancel).toHaveBeenCalledTimes(1));
  });

  it('shows a failed cancel once, inline, with the reason', async () => {
    mockPayment();
    vi.spyOn(paymentService, 'cancelPayment').mockRejectedValue(
      createApiError('conflict', {
        status: 409,
        messageKey: 'errors.payment.cancellationNotSupported',
      })
    );
    renderPayment();
    fireEvent.click(await screen.findByTestId('payment-cancel'));
    await screen.findByRole('alertdialog');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel payment' }));
    const alert = await screen.findByTestId('save-failed');
    expect(alert.textContent).toContain("The payment wasn't cancelled");
    expect(alert.textContent).toContain(
      "This payment method doesn't support cancelling a payment."
    );
  });
});

describe('V07 / V24 — a payment that can no longer be paid', () => {
  const CHECKOUT: Checkout = {
    id: 'chk-7f3a',
    organizationId: 'org-1',
    target: { type: 'plan_subscription', planKey: 'growth' },
    billingCycle: 'yearly',
    snapshot: {
      target: { type: 'plan_subscription', planKey: 'growth' },
      billingCycle: 'yearly',
      displayName: 'Growth',
      price: { amountMinorUnits: 699000, currency: 'EGP' },
      capturedAt: '2026-11-01T00:00:00Z',
    },
    status: 'expired',
    expiresAt: '2026-11-01T00:30:00Z',
    idempotencyKey: 'k',
    createdAt: '2026-11-01T00:00:00Z',
  };

  it.each(['expired', 'cancelled', 'failed'] as const)(
    'hides the bank details and the upload for a %s payment, and links to a new checkout',
    async (status) => {
      mockPayment({ ...PAYMENT, status });
      vi.spyOn(checkoutService, 'getCheckout').mockResolvedValue(CHECKOUT);
      renderPayment();
      expect(await screen.findByTestId('payment-closed')).toBeTruthy();
      expect(screen.queryByTestId('payment-instructions')).toBeNull();
      expect(screen.queryByTestId('payment-proof-submit')).toBeNull();
      expect(screen.queryByTestId('payment-cancel')).toBeNull();
      await waitFor(() =>
        expect(
          screen.getByTestId('payment-start-again').getAttribute('href')
        ).toBe('/dashboard/tenant/billing/checkout/plan_subscription/growth')
      );
      expect(screen.getByText('Start a new checkout')).toBeTruthy();
    }
  );

  it('falls back to the plans page when the checkout cannot be read', () => {
    expect(newCheckoutPath(undefined)).toBe('/dashboard/plans');
    expect(
      newCheckoutPath({
        ...CHECKOUT,
        target: { type: 'add_on', addOnKey: 'extra-academy' },
      })
    ).toBe('/dashboard/tenant/billing/checkout/add_on/extra-academy');
  });
});
