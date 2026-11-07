/**
 * B8 (UX audit) V01/V02/V03/V22/V31 — the Platform Owner's payment review.
 *
 * Pinned here:
 *   - Approve asks first (amount, organization, what happens) and confirms
 *     the result; Cancel sends nothing;
 *   - a decided payment says which decision and when, with the way back;
 *   - a 409 says someone else decided it and never offers Try again; a 400
 *     on `notes` marks that field only; a 5xx is ONE inline alert;
 *   - the detail shows the Checkout ID, the payer's reference and the
 *     upload time; the list's search says what it matches;
 *   - "From" after "To" is refused with a message and a Swap;
 *   - a missing proof file (404) is not blamed on the connection.
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
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import { AtlasDialogProvider } from '@app/providers/dialog/DialogProvider';
import { createApiError } from '@api';
import type { ApiError } from '@api';
import type { Payment } from '@types';
import { PaymentProofDialog } from '@/components/payments/PaymentProofDialog';
import { PlatformPaymentListToolbar } from './components/PlatformPaymentListToolbar';
import { DEFAULT_PLATFORM_PAYMENT_LIST_STATE } from './utils/platform-payment-list.utils';

const approveMutate = vi.fn();
const rejectMutate = vi.fn();
const refetch = vi.fn();
const notifySuccess = vi.fn();
const state: {
  payment: Payment | null;
  approveError: ApiError | null;
  rejectError: ApiError | null;
} = { payment: null, approveError: null, rejectError: null };

vi.mock('./hooks', () => ({
  usePlatformPaymentDetail: () => ({
    data: state.payment,
    isLoading: false,
    error: null,
    refetch,
  }),
  useApprovePayment: () => ({
    mutate: approveMutate,
    isPending: false,
    error: state.approveError,
  }),
  useRejectPayment: () => ({
    mutate: rejectMutate,
    isPending: false,
    error: state.rejectError,
  }),
}));

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ organization: { id: 'reviewer-org' } }),
  usePermissions: () => ({ hasPermission: () => true }),
}));

vi.mock('@app/providers/toast/useToast', () => ({
  useToast: () => ({ notifyError: vi.fn(), notifySuccess }),
}));

const { default: DetailPage } =
  await import('./pages/PlatformPaymentReviewDetailPage');

function payment(over: Partial<Payment> = {}): Payment {
  return {
    id: 'pay-1',
    organizationId: 'org-uuid-1',
    checkoutId: 'chk-7f3a9c21-0000',
    methodKey: 'bank',
    methodType: 'manual_bank_transfer',
    provider: 'atlas_manual',
    money: { amountMinorUnits: 300000, currency: 'EGP' },
    status: 'pending',
    reviewStatus: 'pending',
    attempts: [],
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-21T12:30:00Z',
    organization: { id: 'org-uuid-1', name: 'Nile Learning Co' },
    checkoutSummary: {
      targetType: 'plan_subscription',
      targetKey: 'pro',
      displayName: 'Pro',
      billingCycle: 'yearly',
    },
    proof: {
      id: 'proof-1',
      paymentId: 'pay-1',
      fileName: 'receipt.png',
      fileUrl: '/x',
      mimeType: 'image/png',
      payerReference: 'NBE-55120',
      uploadedAt: '2026-09-20T11:00:00Z',
    },
    ...over,
  };
}

function renderDetail(language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <AtlasDialogProvider>
        <MemoryRouter initialEntries={['/p/pay-1']}>
          <Routes>
            <Route path="/p/:paymentId" element={<DetailPage />} />
          </Routes>
        </MemoryRouter>
      </AtlasDialogProvider>
    </I18nextProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.payment = null;
  state.approveError = null;
  state.rejectError = null;
});

describe('V01 — approving asks first and confirms the result', () => {
  it('names the amount, organization and plan, and sends only on confirm', async () => {
    state.payment = payment();
    renderDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Approve payment' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toContain('Approve this payment?');
    expect(dialog.textContent).toContain('Nile Learning Co');
    expect(dialog.textContent).toContain('Pro · Yearly');
    expect(dialog.textContent).toMatch(/3,000/);
    expect(approveMutate).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(approveMutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Approve payment' }));
    fireEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Yes, approve',
      })
    );
    await waitFor(() => expect(approveMutate).toHaveBeenCalledTimes(1));
    const [variables, callbacks] = approveMutate.mock.calls[0] as [
      unknown,
      { onSuccess: () => void },
    ];
    expect(variables).toEqual({ paymentId: 'pay-1', payload: {} });
    callbacks.onSuccess();
    expect(notifySuccess).toHaveBeenCalledWith(
      'payments:platformReview.approvedToast.title',
      'payments:platformReview.approvedToast.description',
      expect.objectContaining({ organization: 'Nile Learning Co' })
    );
  });

  it('says which decision was taken and when, with the way back to the list', () => {
    state.payment = payment({
      reviewStatus: 'approved',
      status: 'succeeded',
      reviewNotes: 'Receipt matches.',
    });
    renderDetail();
    const notice = screen.getByTestId('payment-reviewed-notice');
    expect(notice.textContent).toMatch(
      /This payment was approved on .+\. It can no longer be approved or rejected\./
    );
    expect(notice.textContent).toContain('Receipt matches.');
    expect(
      within(notice)
        .getByRole('link', { name: /Back to payment review/ })
        .getAttribute('href')
    ).toBe('/dashboard/platform/payments');
  });
});

describe('V01 — who reviewed it', () => {
  it('says "Rejected by <name> on <date>" from the review record', () => {
    state.payment = payment({
      reviewStatus: 'rejected',
      status: 'failed',
      updatedAt: '2026-09-25T08:00:00Z',
      review: {
        status: 'rejected',
        reviewedAt: '2026-09-22T09:15:00Z',
        reviewerName: 'Rania Platform',
      },
    });
    renderDetail();
    const line = screen.getByTestId('payment-reviewed-by').textContent ?? '';
    expect(line).toMatch(
      /^Rejected by \u2068?Rania Platform\u2069? on .+\. It can no longer be approved or rejected\.$/
    );
    // The review's own date, not the payment's last update.
    expect(line).toContain('22');
    expect(line).not.toContain('25');
  });

  it('says it in Arabic', () => {
    state.payment = payment({
      reviewStatus: 'approved',
      status: 'succeeded',
      review: {
        status: 'approved',
        reviewedAt: '2026-09-22T09:15:00Z',
        reviewerName: 'Rania Platform',
      },
    });
    renderDetail('ar');
    expect(screen.getByTestId('payment-reviewed-by').textContent).toMatch(
      /^وافق \u2068?Rania Platform\u2069? على هذه الدفعة في /
    );
  });

  it('without a reviewer name, keeps the date alone', () => {
    state.payment = payment({
      reviewStatus: 'approved',
      status: 'succeeded',
      review: { status: 'approved', reviewedAt: '2026-09-22T09:15:00Z' },
    });
    renderDetail();
    expect(screen.getByTestId('payment-reviewed-by').textContent).toMatch(
      /^This payment was approved on /
    );
  });
});

describe('V02 — the reviewer can match the transfer', () => {
  it('shows the Checkout ID, the payer reference and the upload time', () => {
    state.payment = payment();
    renderDetail();
    expect(screen.getByTestId('payment-review-checkout-id').textContent).toBe(
      'chk-7f3a9c21-0000'
    );
    expect(
      screen.getByTestId('payment-review-payer-reference').textContent
    ).toBe('NBE-55120');
    expect(screen.getByText('Proof uploaded')).toBeTruthy();
  });

  it('the list search says what it matches', () => {
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <PlatformPaymentListToolbar
          idPrefix="p"
          value={DEFAULT_PLATFORM_PAYMENT_LIST_STATE}
          onChange={vi.fn()}
          searchLabelKey="payments:platformReview.searchLabel"
        />
      </I18nextProvider>
    );
    expect(
      screen.getByRole('searchbox', {
        name: 'Search by checkout ID, payer reference, payment ID or organization',
      })
    ).toBeTruthy();
  });
});

describe('V03 — one message with the real reason', () => {
  it('a 409 says someone else decided it, reloads, and offers no Try again', () => {
    state.payment = payment();
    state.approveError = createApiError('conflict', {
      messageKey: 'errors.payment.notPendingReview',
      status: 409,
    });
    const { container } = renderDetail();
    expect(
      screen
        .getByText(/Someone else reviewed this payment/)
        .getAttribute('role')
    ).toBe('status');
    expect(screen.queryByRole('button', { name: /Try again/i })).toBeNull();
    expect(container.textContent).not.toContain('Unexpected error');
  });

  it('the 409 callback reloads the payment', async () => {
    state.payment = payment();
    renderDetail();
    fireEvent.click(screen.getByRole('button', { name: 'Approve payment' }));
    fireEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'Yes, approve',
      })
    );
    await waitFor(() => expect(approveMutate).toHaveBeenCalled());
    const callbacks = approveMutate.mock.calls[0][1] as {
      onError: (error: ApiError) => void;
    };
    callbacks.onError(createApiError('conflict', { status: 409 }));
    expect(refetch).toHaveBeenCalled();
  });

  it('a 400 on notes marks the field and adds no alert', async () => {
    state.payment = payment();
    state.rejectError = createApiError('validation', {
      messageKey: 'errors.validation.failed',
      violations: [
        {
          field: 'notes',
          messageKey: 'validation:minLength',
          values: { count: 10 },
        },
      ],
    });
    renderDetail();
    const reason = screen.getByRole('textbox', {
      name: /Reason for rejection/,
    });
    await waitFor(() =>
      expect(reason.getAttribute('aria-invalid')).toBe('true')
    );
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('a server error is one inline alert with the reason and Try again', () => {
    state.payment = payment();
    state.approveError = createApiError('server', { status: 500 });
    renderDetail();
    const alert = screen.getByTestId('save-failed');
    expect(alert.textContent).toContain("The payment wasn't approved");
    expect(
      within(alert).getByRole('button', { name: /Try again/i })
    ).toBeTruthy();
    expect(screen.getAllByTestId('save-failed')).toHaveLength(1);
  });
});

describe('V22 — a reversed date range is refused with a message', () => {
  it('says From is after To and swaps them in one change', () => {
    const onChange = vi.fn();
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <PlatformPaymentListToolbar
          idPrefix="p"
          value={{
            ...DEFAULT_PLATFORM_PAYMENT_LIST_STATE,
            from: '2026-11-20',
            to: '2026-11-01',
          }}
          onChange={onChange}
          searchLabelKey="payments:platformReview.searchLabel"
        />
      </I18nextProvider>
    );
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toMatch(/after/i);
    expect(screen.getByLabelText('From').getAttribute('aria-invalid')).toBe(
      'true'
    );
    fireEvent.click(within(alert).getByRole('button', { name: 'Swap dates' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ from: '2026-11-01', to: '2026-11-20' })
    );
  });
});

describe('V31 — a missing proof is not blamed on the connection', () => {
  it('a 404 says the file is gone and offers no retry', async () => {
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <PaymentProofDialog
          open
          onOpenChange={vi.fn()}
          load={() => Promise.reject(createApiError('notFound'))}
        />
      </I18nextProvider>
    );
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('no longer available');
    expect(alert.textContent).not.toMatch(/connection/i);
    expect(screen.queryByRole('button', { name: /Try again/i })).toBeNull();
  });
});
