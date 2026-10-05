/**
 * Academy Manual Payments — the Client Owner's two pages: Payment methods
 * (configure the academy's bank transfer / InstaPay / wallet) and Payments
 * (review what learners paid). The server enforces who may do what; these
 * pin the presentation contract:
 *
 *   - methods: three cards with TEXT status; switching on a method with no
 *     details opens its form instead of saving; saving sends the typed
 *     details to the method's own route; a 403 is one permission state;
 *   - review: tabs with counts, search/filter go to the server, rows carry
 *     learner/course/amount/method and a text badge; a row opens the sheet
 *     with reference, proof and the details the learner saw; Approve asks
 *     for confirmation; Reject sends the optional reason; a payment someone
 *     else already reviewed (409) is reported, not retried;
 *   - Arabic renders without raw keys.
 *
 * Native DOM assertions only — this repo does not ship jest-dom.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import { createApiError } from '@api';
import type { ApiClient } from '@services';
import type {
  AcademyCoursePayment,
  AcademyCoursePaymentDetail,
  AcademyPaymentMethod,
} from '@types';
import { AcademyPaymentsService } from './services/AcademyPaymentsService';

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}

const params: { academyId?: string } = { academyId: 'academy-1' };
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useParams: () => params,
}));

const confirm = vi.fn();
const notifySuccess = vi.fn();
const notifyError = vi.fn();
vi.mock('@app/providers', () => ({
  useConfirmDialog: () => ({ confirm }),
  useToast: () => ({ notifySuccess, notifyError }),
}));

const useAcademyPaymentMethods = vi.fn();
const saveMutateAsync = vi.fn();
const useAcademyCoursePayments = vi.fn();
const useAcademyCoursePayment = vi.fn();
const approveMutate = vi.fn();
const rejectMutate = vi.fn();
vi.mock('./hooks', () => ({
  useAcademyPaymentMethods: (id: string) =>
    useAcademyPaymentMethods(id) as unknown,
  useSaveAcademyPaymentMethod: () => ({
    mutateAsync: saveMutateAsync,
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
  useAcademyCoursePayments: (id: string, query: unknown) =>
    useAcademyCoursePayments(id, query) as unknown,
  useAcademyCoursePayment: (id: string, paymentId: string | undefined) =>
    useAcademyCoursePayment(id, paymentId) as unknown,
  useApproveAcademyCoursePayment: () => ({
    mutate: approveMutate,
    isPending: false,
  }),
  useRejectAcademyCoursePayment: () => ({
    mutate: rejectMutate,
    isPending: false,
  }),
}));
vi.mock('./hooks/useAcademyPaymentProof', () => ({
  useAcademyPaymentProof: () => ({
    url: 'blob:proof',
    isLoading: false,
    error: false,
    reload: vi.fn(),
  }),
}));

const { default: AcademyPaymentMethodsPage } =
  await import('./pages/AcademyPaymentMethodsPage');
const { default: AcademyPaymentsPage } =
  await import('./pages/AcademyPaymentsPage');

function ready<T>(data: T) {
  return {
    data,
    isLoading: false,
    isFetching: false,
    isPlaceholderData: false,
    error: null,
    refetch: vi.fn(),
  };
}

const BANK: AcademyPaymentMethod = {
  id: 'm-bank',
  academyId: 'academy-1',
  key: 'academy_manual_bank_transfer',
  type: 'manual_bank_transfer',
  enabled: true,
  instructions: {
    type: 'manual_bank_transfer',
    bankName: 'National Bank of Egypt',
    branchName: 'Zamalek',
    accountName: 'Falcon Academy',
    accountNumber: '1234567890',
    instructions: 'Transfer the exact amount.',
    referenceInstructions: 'Write your email in the note.',
  },
  displayOrder: 0,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
};

function payment(
  over: Partial<AcademyCoursePaymentDetail> = {}
): AcademyCoursePaymentDetail {
  return {
    id: 'pay-1',
    academyId: 'academy-1',
    courseOrderId: 'order-1',
    course: { id: 'course-1', title: 'Arabic Calligraphy' },
    learner: { name: 'Sara Ahmed', maskedEmail: 's•••@example.com' },
    methodType: 'manual_bank_transfer',
    money: { amountMinorUnits: 150000, currency: 'EGP' },
    status: 'pending',
    reviewStatus: 'pending',
    orderStatus: 'pending_payment',
    proof: {
      id: 'proof-1',
      fileName: 'receipt.png',
      mimeType: 'image/png',
      payerReference: 'NBE-777',
      uploadedAt: '2026-10-02T10:00:00.000Z',
      fileUrl: '/academies/academy-1/course-payments/pay-1/proof/file',
    },
    instructions: BANK.instructions,
    reviews: [],
    createdAt: '2026-10-02T09:55:00.000Z',
    updatedAt: '2026-10-02T10:00:00.000Z',
    ...over,
  };
}

function listPage(items: AcademyCoursePayment[]) {
  return {
    items,
    counts: { pending: 2, approved: 5, rejected: 1 },
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: items.length,
      totalPages: 1,
    },
  };
}

let currentSearch = '';
function LocationProbe(): null {
  currentSearch = useLocation().search;
  return null;
}

function renderWith(
  node: JSX.Element,
  language: 'en' | 'ar' = 'en',
  url = '/x'
) {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter initialEntries={[url]}>
        {node}
        <LocationProbe />
      </MemoryRouter>
    </I18nextProvider>
  );
}

beforeEach(() => {
  // A closed sheet asks for no payment.
  useAcademyCoursePayment.mockReturnValue(ready(undefined));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  params.academyId = 'academy-1';
});

describe('AcademyPaymentMethodsPage', () => {
  it('shows each method with a text status and the saved details', () => {
    useAcademyPaymentMethods.mockReturnValue(ready([BANK]));
    renderWith(<AcademyPaymentMethodsPage />);
    const bank = screen.getByTestId('academy-method-bank');
    expect(bank.textContent).toContain('Bank transfer');
    expect(bank.textContent).toContain('Accepting');
    expect(bank.textContent).toContain('1234567890');
    expect(bank.textContent).toContain('Zamalek');
    expect(screen.getByTestId('academy-method-instapay').textContent).toContain(
      'Not set up'
    );
    expect(screen.queryByTestId('academy-methods-none-enabled')).toBeNull();
  });

  it('warns when no method is on', () => {
    useAcademyPaymentMethods.mockReturnValue(
      ready([{ ...BANK, enabled: false }])
    );
    renderWith(<AcademyPaymentMethodsPage />);
    expect(screen.getByTestId('academy-methods-none-enabled')).toBeTruthy();
    expect(screen.getByTestId('academy-method-bank').textContent).toContain(
      'Off'
    );
  });

  it('switching on a method without details opens its form instead of saving', async () => {
    useAcademyPaymentMethods.mockReturnValue(ready([BANK]));
    renderWith(<AcademyPaymentMethodsPage />);
    fireEvent.click(screen.getByTestId('academy-method-instapay-toggle'));
    expect(saveMutateAsync).not.toHaveBeenCalled();
    expect(await screen.findByTestId('academy-method-form')).toBeTruthy();
    expect(screen.getByText('Set up InstaPay')).toBeTruthy();
  });

  it('switches an existing method off without resending its details', async () => {
    useAcademyPaymentMethods.mockReturnValue(ready([BANK]));
    saveMutateAsync.mockResolvedValue({ ...BANK, enabled: false });
    renderWith(<AcademyPaymentMethodsPage />);
    fireEvent.click(screen.getByTestId('academy-method-bank-toggle'));
    await waitFor(() =>
      expect(saveMutateAsync).toHaveBeenCalledWith({
        type: 'manual_bank_transfer',
        enabled: false,
      })
    );
  });

  it('validates and saves an InstaPay method, turned on', async () => {
    useAcademyPaymentMethods.mockReturnValue(ready([]));
    saveMutateAsync.mockResolvedValue({});
    renderWith(<AcademyPaymentMethodsPage />);
    fireEvent.click(screen.getByTestId('academy-method-instapay-setup'));
    const form = await screen.findByTestId('academy-method-form');
    fireEvent.click(within(form).getByTestId('academy-method-save'));
    // Required details are refused client-side first.
    await waitFor(() => expect(form.textContent).toContain('required'));
    expect(saveMutateAsync).not.toHaveBeenCalled();

    fireEvent.change(within(form).getByTestId('academy-instapay-address'), {
      target: { value: 'falcon@instapay' },
    });
    fireEvent.change(
      within(form).getByTestId('academy-instapay-account-name'),
      {
        target: { value: 'Falcon Academy' },
      }
    );
    fireEvent.change(
      within(form).getByTestId('academy-instapay-instructions'),
      {
        target: { value: 'Send the amount.' },
      }
    );
    fireEvent.change(
      within(form).getByTestId('academy-instapay-reference-instructions'),
      { target: { value: 'Use your name.' } }
    );
    fireEvent.click(within(form).getByTestId('academy-method-save'));
    await waitFor(() =>
      expect(saveMutateAsync).toHaveBeenCalledWith({
        type: 'manual_instapay',
        enabled: true,
        instructions: {
          instapayAddress: 'falcon@instapay',
          accountName: 'Falcon Academy',
          instructions: 'Send the amount.',
          referenceInstructions: 'Use your name.',
        },
      })
    );
  });

  it('renders a 403 as one permission state', () => {
    useAcademyPaymentMethods.mockReturnValue({
      ...ready(undefined),
      error: createApiError('forbidden', { status: 403 }),
    });
    renderWith(<AcademyPaymentMethodsPage />);
    expect(
      screen.getByText('Only the academy owner can manage payment methods')
    ).toBeTruthy();
  });

  it('Arabic renders without raw keys', () => {
    useAcademyPaymentMethods.mockReturnValue(ready([BANK]));
    const { container } = renderWith(<AcademyPaymentMethodsPage />, 'ar');
    expect(container.textContent).toContain('طرق الدفع');
    expect(container.textContent).not.toMatch(/academyMethods\./);
  });
});

describe('AcademyPaymentsPage', () => {
  it('opens on "waiting for review" with counts, and sends search to the server', async () => {
    useAcademyCoursePayments.mockReturnValue(ready(listPage([payment()])));
    renderWith(<AcademyPaymentsPage />);
    const pendingTab = screen.getByTestId('academy-payments-tab-pending');
    expect(pendingTab.textContent).toContain('Waiting for review');
    expect(pendingTab.textContent).toContain('2');
    expect(useAcademyCoursePayments).toHaveBeenLastCalledWith(
      'academy-1',
      expect.objectContaining({ filters: { reviewStatus: 'pending' } })
    );
    expect(screen.getByText('Sara Ahmed')).toBeTruthy();
    expect(screen.getByText('Arabic Calligraphy')).toBeTruthy();

    fireEvent.click(screen.getByTestId('academy-payments-tab-all'));
    await waitFor(() =>
      expect(useAcademyCoursePayments).toHaveBeenLastCalledWith(
        'academy-1',
        expect.not.objectContaining({ filters: expect.anything() })
      )
    );
  });

  it('opens a payment from the URL with its reference, proof and the details shown to the learner', () => {
    useAcademyCoursePayments.mockReturnValue(ready(listPage([payment()])));
    useAcademyCoursePayment.mockReturnValue(ready(payment()));
    renderWith(<AcademyPaymentsPage />, 'en', '/x?payment=pay-1');
    const sheet = screen.getByTestId('academy-payment-sheet');
    expect(
      within(sheet).getByTestId('academy-payment-reference').textContent
    ).toBe('NBE-777');
    expect(
      within(sheet)
        .getByTestId('academy-payment-proof-image')
        .getAttribute('alt')
    ).toContain('Sara Ahmed');
    expect(sheet.textContent).toContain('Details the learner was shown');
    expect(within(sheet).getByTestId('academy-payment-approve')).toBeTruthy();
  });

  it('approves only after confirmation', async () => {
    useAcademyCoursePayments.mockReturnValue(ready(listPage([payment()])));
    useAcademyCoursePayment.mockReturnValue(ready(payment()));
    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderWith(<AcademyPaymentsPage />, 'en', '/x?payment=pay-1');
    fireEvent.click(screen.getByTestId('academy-payment-approve'));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(approveMutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('academy-payment-approve'));
    await waitFor(() =>
      expect(approveMutate).toHaveBeenCalledWith(
        { paymentId: 'pay-1', payload: {} },
        expect.anything()
      )
    );
  });

  it('rejects with the optional reason, after confirmation', async () => {
    useAcademyCoursePayments.mockReturnValue(ready(listPage([payment()])));
    useAcademyCoursePayment.mockReturnValue(ready(payment()));
    confirm.mockResolvedValue(true);
    renderWith(<AcademyPaymentsPage />, 'en', '/x?payment=pay-1');
    fireEvent.click(screen.getByTestId('academy-payment-reject'));
    fireEvent.change(screen.getByTestId('academy-payment-reject-reason'), {
      target: { value: '  Amount did not match  ' },
    });
    fireEvent.click(screen.getByTestId('academy-payment-reject-confirm'));
    await waitFor(() =>
      expect(rejectMutate).toHaveBeenCalledWith(
        { paymentId: 'pay-1', payload: { reason: 'Amount did not match' } },
        expect.anything()
      )
    );
  });

  it('reports a payment someone else already reviewed', async () => {
    useAcademyCoursePayments.mockReturnValue(ready(listPage([payment()])));
    const detail = ready(payment());
    useAcademyCoursePayment.mockReturnValue(detail);
    confirm.mockResolvedValue(true);
    approveMutate.mockImplementation((_vars, options) =>
      options.onError(
        createApiError('conflict', {
          status: 409,
          messageKey: 'errors.payment.notPendingReview',
        })
      )
    );
    renderWith(<AcademyPaymentsPage />, 'en', '/x?payment=pay-1');
    fireEvent.click(screen.getByTestId('academy-payment-approve'));
    expect(
      await screen.findByText(
        'This payment was already reviewed. Its current status is shown.'
      )
    ).toBeTruthy();
    expect(detail.refetch).toHaveBeenCalled();
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('shows no decision buttons on a reviewed payment, and the reason on a rejected one', () => {
    useAcademyCoursePayments.mockReturnValue(ready(listPage([])));
    useAcademyCoursePayment.mockReturnValue(
      ready(
        payment({
          status: 'failed',
          reviewStatus: 'rejected',
          reviewNotes: 'Wrong amount',
          reviews: [
            {
              id: 'r1',
              status: 'rejected',
              notes: 'Wrong amount',
              reviewedAt: '2026-10-03T10:00:00.000Z',
              reviewerName: 'Owner',
            },
          ],
        })
      )
    );
    renderWith(<AcademyPaymentsPage />, 'en', '/x?payment=pay-1');
    expect(screen.queryByTestId('academy-payment-approve')).toBeNull();
    const sheet = screen.getByTestId('academy-payment-sheet');
    expect(sheet.textContent).toContain('Wrong amount');
    expect(sheet.textContent).toContain('Rejected by Owner');
  });

  it('closing the sheet removes the payment from the URL', async () => {
    useAcademyCoursePayments.mockReturnValue(ready(listPage([payment()])));
    useAcademyCoursePayment.mockReturnValue(ready(payment()));
    renderWith(<AcademyPaymentsPage />, 'en', '/x?payment=pay-1');
    fireEvent.keyDown(screen.getByTestId('academy-payment-sheet'), {
      key: 'Escape',
    });
    await waitFor(() => expect(currentSearch).not.toContain('payment='));
  });

  it('Arabic renders without raw keys', () => {
    useAcademyCoursePayments.mockReturnValue(ready(listPage([payment()])));
    const { container } = renderWith(<AcademyPaymentsPage />, 'ar');
    expect(container.textContent).toContain('بانتظار المراجعة');
    expect(container.textContent).not.toMatch(/academyReview\./);
  });
});

describe('AcademyPaymentsService', () => {
  it('addresses the academy-scoped routes', async () => {
    const client = {
      get: vi.fn().mockResolvedValue({}),
      put: vi.fn().mockResolvedValue({}),
      post: vi.fn().mockResolvedValue({}),
    } as unknown as ApiClient;
    const service = new AcademyPaymentsService(client);
    await service.saveMethod('a1', {
      type: 'manual_wallet_transfer',
      enabled: false,
    });
    expect((client.put as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      'academies/a1/payment-methods/wallet'
    );
    expect((client.put as ReturnType<typeof vi.fn>).mock.calls[0][1]).toEqual({
      enabled: false,
    });
    await service.rejectPayment('a1', 'p1', { reason: 'x' });
    expect((client.post as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      'academies/a1/course-payments/p1/reject'
    );
    await service.getPayments('a1', {
      pagination: { page: 1, pageSize: 20 },
      filters: { reviewStatus: 'pending' },
    });
    const call = (client.get as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('academies/a1/course-payments');
    expect(call[1].params).toMatchObject({ reviewStatus: 'pending' });
  });
});
