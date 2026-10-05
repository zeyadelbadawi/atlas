/**
 * Academy Manual Payments — the learner side: "My payments", the checkout
 * with an academy's own methods, and the refund rule for money paid to the
 * academy. Server-side rules are tested in the backend; these pin what the
 * learner sees and sends:
 *
 *   - My payments: every state in words (never colour alone), the academy's
 *     rejection reason, "Submit a new payment" only where the server allows
 *     it, and the list asked for THIS academy only;
 *   - checkout: the academy's methods by name, the account details and the
 *     exact amount after choosing, the reference sent with the proof, a file
 *     of the wrong type refused before upload, and "under review" instead of
 *     a second payment;
 *   - a direct-to-academy order never offers the self-service refund.
 *
 * Native DOM assertions only — this repo does not ship jest-dom.
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
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import { createApiError } from '@api';
import type {
  CheckoutPaymentMethod,
  CourseOrder,
  CourseOrderPayment,
  LearnerCoursePayment,
} from '@types';
import { refundEligibility } from './utils/course-refund.utils';
import { learnerPaymentState } from './utils/learner-payment.utils';

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useParams: () => ({ courseId: 'course-1' }),
}));

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ user: { id: 'u-1' } }),
}));

vi.mock('./context/LearnerSurface.context', () => ({
  useLearnerSurface: () => ({
    academyId: 'aca-1',
    locale: 'en',
    buildHref: (path: string) => path,
  }),
}));

vi.mock('./components/LearnerPageHeader', () => ({
  LearnerPageHeader: () => <h1>Header</h1>,
}));

const useLearnerPayments = vi.fn();
const createOrder = vi.fn();
const createPayment = vi.fn();
const submitProof = vi.fn();
const useCourseOrderPaymentMethods = vi.fn();
vi.mock('./hooks/useCourseCheckout', () => ({
  useLearnerPayments: (studentId: string, academyId: string) =>
    useLearnerPayments(studentId, academyId) as unknown,
  useCreateCourseOrder: () => ({ mutateAsync: createOrder, isPending: false }),
  useCreateCoursePayment: () => ({
    mutateAsync: createPayment,
    isPending: false,
  }),
  useSubmitCourseOrderProof: () => ({
    mutateAsync: submitProof,
    isPending: false,
  }),
  useCourseOrderPaymentMethods: (orderId: string | undefined) =>
    useCourseOrderPaymentMethods(orderId) as unknown,
}));

const { default: LearnerPaymentsPage } =
  await import('./pages/LearnerPaymentsPage');
const { default: CourseCheckoutPage } =
  await import('./pages/CourseCheckoutPage');

function renderWith(node: JSX.Element, language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter>{node}</MemoryRouter>
    </I18nextProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function payment(
  over: Partial<LearnerCoursePayment> = {}
): LearnerCoursePayment {
  return {
    id: 'p-1',
    courseOrderId: 'o-1',
    academyId: 'aca-1',
    course: { id: 'course-1', title: 'Arabic Calligraphy' },
    methodType: 'manual_instapay',
    provider: 'academy_manual',
    money: { amountMinorUnits: 150000, currency: 'EGP' },
    status: 'pending',
    reviewStatus: 'pending',
    orderStatus: 'pending_payment',
    proof: {
      fileName: 'r.png',
      mimeType: 'image/png',
      payerReference: 'TRX-1',
      uploadedAt: '2026-10-02T10:00:00.000Z',
      fileUrl: '/course-orders/o-1/payments/p-1/proof/file',
    },
    awaitingProof: false,
    canSubmitNewPayment: false,
    createdAt: '2026-10-02T09:55:00.000Z',
    updatedAt: '2026-10-02T10:00:00.000Z',
    ...over,
  };
}

function list(items: LearnerCoursePayment[]) {
  return {
    data: {
      items,
      pagination: {
        page: 1,
        pageSize: 100,
        totalItems: items.length,
        totalPages: 1,
      },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  };
}

describe('learnerPaymentState', () => {
  it('derives the learner-facing state from the server state', () => {
    expect(learnerPaymentState(payment())).toBe('underReview');
    expect(
      learnerPaymentState(
        payment({ status: 'succeeded', reviewStatus: 'approved' })
      )
    ).toBe('approved');
    expect(
      learnerPaymentState(
        payment({ status: 'failed', reviewStatus: 'rejected' })
      )
    ).toBe('rejected');
    expect(
      learnerPaymentState(
        payment({ reviewStatus: 'not_required', awaitingProof: true })
      )
    ).toBe('awaitingProof');
    expect(
      learnerPaymentState(
        payment({ status: 'cancelled', reviewStatus: 'not_required' })
      )
    ).toBe('closed');
  });
});

describe('LearnerPaymentsPage', () => {
  it('asks for THIS academy’s payments and shows each state in words', () => {
    useLearnerPayments.mockReturnValue(
      list([
        payment(),
        payment({ id: 'p-2', status: 'succeeded', reviewStatus: 'approved' }),
      ])
    );
    renderWith(<LearnerPaymentsPage />);
    expect(useLearnerPayments).toHaveBeenCalledWith('u-1', 'aca-1');
    const statuses = screen
      .getAllByTestId('learner-payment-status')
      .map((node) => node.textContent);
    expect(statuses).toEqual(['Under review', 'Approved']);
    expect(screen.getAllByText('TRX-1')).toHaveLength(2);
  });

  it('shows the academy’s reason and offers a new payment only where allowed', () => {
    useLearnerPayments.mockReturnValue(
      list([
        payment({
          status: 'failed',
          reviewStatus: 'rejected',
          rejectionReason: 'The amount did not match.',
          canSubmitNewPayment: true,
        }),
        payment({
          id: 'p-old',
          status: 'failed',
          reviewStatus: 'rejected',
          canSubmitNewPayment: false,
        }),
      ])
    );
    renderWith(<LearnerPaymentsPage />);
    expect(screen.getByText('The amount did not match.')).toBeTruthy();
    expect(
      screen.getByText(
        'No reason was given. Contact the academy if you have questions.'
      )
    ).toBeTruthy();
    const retry = screen.getAllByTestId('learner-payment-retry');
    expect(retry).toHaveLength(1);
    expect(retry[0].getAttribute('href')).toBe('/my/courses/course-1/checkout');
    expect(retry[0].textContent).toBe('Submit a new payment');
  });

  it('empty and Arabic states render without raw keys', () => {
    useLearnerPayments.mockReturnValue(list([]));
    const { container } = renderWith(<LearnerPaymentsPage />, 'ar');
    expect(container.textContent).toContain('لا توجد مدفوعات بعد');
    expect(container.textContent).not.toMatch(/learnerDashboard\./);
  });
});

const ORDER: CourseOrder = {
  id: 'o-1',
  studentId: 'u-1',
  courseId: 'course-1',
  academyId: 'aca-1',
  organizationId: 'org-1',
  snapshot: {
    course: { id: 'course-1', title: 'Arabic Calligraphy' },
    price: { amountMinorUnits: 150000, currency: 'EGP' },
    capturedAt: '2026-10-02T09:00:00.000Z',
  },
  status: 'draft',
  expiresAt: '2026-10-02T09:30:00.000Z',
  idempotencyKey: 'k',
  createdAt: '2026-10-02T09:00:00.000Z',
};

const INSTAPAY_METHOD: CheckoutPaymentMethod = {
  id: 'm-1',
  key: 'academy_manual_instapay',
  type: 'manual_instapay',
  displayName: 'InstaPay',
  enabled: true,
  provider: 'academy_manual',
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
    type: 'manual_instapay',
    instapayAddress: 'falcon@instapay',
    accountName: 'Falcon Academy',
    instructions: 'Send the amount by InstaPay.',
    referenceInstructions: 'Use your name.',
  },
};

const CREATED: CourseOrderPayment = {
  id: 'p-1',
  courseOrderId: 'o-1',
  payerUserId: 'u-1',
  payeeAcademyId: 'aca-1',
  methodKey: 'academy_manual_instapay',
  methodType: 'manual_instapay',
  provider: 'academy_manual',
  money: { amountMinorUnits: 150000, currency: 'EGP' },
  status: 'pending',
  reviewStatus: 'not_required',
  attempts: [],
  instructions: INSTAPAY_METHOD.manualInstructions,
  createdAt: '2026-10-02T09:01:00.000Z',
  updatedAt: '2026-10-02T09:01:00.000Z',
};

describe('CourseCheckoutPage with an academy’s own methods', () => {
  function arrange() {
    createOrder.mockResolvedValue(ORDER);
    useCourseOrderPaymentMethods.mockReturnValue({
      data: [INSTAPAY_METHOD],
      isLoading: false,
    });
  }

  it('shows the method by name, then the details and the exact amount, and sends the reference', async () => {
    arrange();
    createPayment.mockResolvedValue(CREATED);
    submitProof.mockResolvedValue({ ...CREATED, reviewStatus: 'pending' });
    renderWith(<CourseCheckoutPage />);
    const method = await screen.findByTestId('checkout-method-manual_instapay');
    expect(method.textContent).toContain('InstaPay');
    fireEvent.click(screen.getByRole('radio'));
    fireEvent.click(screen.getByText('Continue'));
    await waitFor(() =>
      expect(createPayment).toHaveBeenCalledWith({
        methodKey: 'academy_manual_instapay',
      })
    );
    const instructions = await screen.findByTestId('checkout-instructions');
    expect(instructions.textContent).toContain('falcon@instapay');
    expect(screen.getByTestId('checkout-amount-to-send').textContent).toMatch(
      /1,500/
    );

    fireEvent.change(screen.getByTestId('checkout-reference'), {
      target: { value: ' TRX-9 ' },
    });
    const file = new File(['x'], 'receipt.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('checkout-proof-file'), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByTestId('checkout-submit-proof'));
    await waitFor(() =>
      expect(submitProof).toHaveBeenCalledWith({
        paymentId: 'p-1',
        file,
        note: undefined,
        payerReference: 'TRX-9',
      })
    );
    expect(await screen.findByText('View my payments')).toBeTruthy();
  });

  it('refuses a proof of the wrong type before uploading it', async () => {
    arrange();
    createPayment.mockResolvedValue(CREATED);
    renderWith(<CourseCheckoutPage />);
    await screen.findByTestId('checkout-method-manual_instapay');
    fireEvent.click(screen.getByRole('radio'));
    fireEvent.click(screen.getByText('Continue'));
    const input = await screen.findByTestId('checkout-proof-file');
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'a.gif', { type: 'image/gif' })] },
    });
    expect(
      screen
        .getAllByRole('alert')
        .some((node) => node.textContent?.includes('PNG, JPG or PDF'))
    ).toBe(true);
    expect(
      (screen.getByTestId('checkout-submit-proof') as HTMLButtonElement)
        .disabled
    ).toBe(true);
  });

  it('says "under review" instead of opening a second payment', async () => {
    arrange();
    createPayment.mockRejectedValue(
      createApiError('conflict', {
        status: 409,
        messageKey: 'errors.courseOrder.paymentUnderReview',
      })
    );
    renderWith(<CourseCheckoutPage />);
    await screen.findByTestId('checkout-method-manual_instapay');
    fireEvent.click(screen.getByRole('radio'));
    fireEvent.click(screen.getByText('Continue'));
    expect(
      await screen.findByText('Your payment is under review')
    ).toBeTruthy();
    expect(
      screen.getByText('View my payments').closest('a')?.getAttribute('href')
    ).toBe('/my/payments');
  });
});

describe('refund for a direct-to-academy order', () => {
  it('is never offered: refunds are arranged with the academy', () => {
    const paid = {
      status: 'paid' as const,
      paidAt: new Date().toISOString(),
    };
    expect(refundEligibility({ ...paid, paidToAcademy: true }).kind).toBe(
      'contactAcademy'
    );
    expect(refundEligibility({ ...paid, paidToAcademy: false }).kind).toBe(
      'eligible'
    );
  });
});
