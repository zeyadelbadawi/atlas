/**
 * B7 (UX audit) — the paid-course checkout says what is true.
 *
 * - V02: opening the order used to end in "Not available for purchase yet —
 *   payments aren't set up" for a 500, an abort, an enrolled learner and a
 *   free course alike. Each now says its own thing, and a failure offers Try
 *   again with the same idempotency key (no second order).
 * - V12: the order and payment references are shown; a reload lands back on
 *   the proof step of the SAME payment; nothing creates a second order.
 * - V19: Continue is never greyed: pressed without a method, it says so.
 * - V23: the checkout sits under My courses (Courses › course › Checkout).
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
} from '@types';

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useParams: () => ({ courseId: 'course-1' }),
}));
vi.mock('./context/LearnerSurface.context', () => ({
  useLearnerSurface: () => ({
    academyId: 'aca-1',
    locale: 'en',
    buildHref: (path: string) => path,
  }),
}));

const headerProps = vi.fn();
vi.mock('./components/LearnerPageHeader', () => ({
  LearnerPageHeader: (props: Record<string, unknown>) => {
    headerProps(props);
    return <h1>Header</h1>;
  },
}));

const createOrder = vi.fn();
const createPayment = vi.fn();
const submitProof = vi.fn();
const useCourseOrderPaymentMethods = vi.fn();
vi.mock('./hooks/useCourseCheckout', () => ({
  useCreateCourseOrder: () => ({ mutateAsync: createOrder, isPending: false }),
  useCreateCoursePayment: () => ({
    mutateAsync: createPayment,
    isPending: false,
  }),
  useSubmitCourseOrderProof: () => ({
    mutateAsync: submitProof,
    isPending: false,
    error: null,
  }),
  useCourseOrderPaymentMethods: (orderId: string | undefined) =>
    useCourseOrderPaymentMethods(orderId) as unknown,
}));

const { default: CourseCheckoutPage, classifyOrderFailure } =
  await import('./pages/CourseCheckoutPage');
const { courseOrderService } = await import('./services/CourseOrderService');

const ORDER: CourseOrder = {
  id: '3f2a9c1b-0000-4000-8000-000000000001',
  studentId: 'u-1',
  courseId: 'course-1',
  academyId: 'aca-1',
  organizationId: 'org-1',
  snapshot: {
    course: { id: 'course-1', title: 'Arabic Calligraphy' },
    price: { amountMinorUnits: 150000, currency: 'EGP' },
    capturedAt: '2026-10-02T09:00:00.000Z',
  },
  status: 'pending_payment',
  expiresAt: '2099-10-02T09:30:00.000Z',
  idempotencyKey: 'k',
  createdAt: '2026-10-02T09:00:00.000Z',
};

const METHOD = {
  id: 'm-1',
  key: 'academy_manual_instapay',
  type: 'manual_instapay',
  displayName: 'InstaPay',
  enabled: true,
  provider: 'academy_manual',
  manualInstructions: {
    type: 'manual_instapay',
    instapayAddress: 'falcon@instapay',
    accountName: 'Falcon Academy',
  },
} as unknown as CheckoutPaymentMethod;

const PAYMENT: CourseOrderPayment = {
  id: '9d8e7f6a-0000-4000-8000-000000000002',
  courseOrderId: ORDER.id,
  payerUserId: 'u-1',
  payeeAcademyId: 'aca-1',
  methodKey: 'academy_manual_instapay',
  methodType: 'manual_instapay',
  provider: 'academy_manual',
  money: { amountMinorUnits: 150000, currency: 'EGP' },
  status: 'pending',
  reviewStatus: 'not_required',
  attempts: [],
  instructions: METHOD.manualInstructions,
  createdAt: '2026-10-02T09:01:00.000Z',
  updatedAt: '2026-10-02T09:01:00.000Z',
} as unknown as CourseOrderPayment;

function renderPage() {
  return render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <MemoryRouter>
        <CourseCheckoutPage />
      </MemoryRouter>
    </I18nextProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

function withMethods() {
  useCourseOrderPaymentMethods.mockReturnValue({
    data: [METHOD],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
}

describe('V02 — opening the order', () => {
  it.each([
    ['errors.courseOrder.alreadyEnrolled', 409, 'alreadyEnrolled'],
    ['errors.courseOrder.courseNotPaid', 409, 'free'],
    ['errors.courseOrder.paymentSetupIncomplete', 409, 'notPurchasable'],
    ['errors.academy.registrationRejected', 403, 'notAdmitted'],
  ])('%s is classified as %s', (messageKey, status, kind) => {
    expect(
      classifyOrderFailure(
        createApiError(status === 403 ? 'forbidden' : 'conflict', {
          status,
          messageKey,
        })
      ).kind
    ).toBe(kind);
  });

  it.each([
    createApiError('server', { status: 500 }),
    createApiError('network'),
    createApiError('timeout'),
  ])(
    'a server fault or lost connection is a failure, never "not set up"',
    (error) => {
      expect(classifyOrderFailure(error).kind).toBe('failed');
    }
  );

  it('already enrolled: says so and links to the course', async () => {
    withMethods();
    createOrder.mockRejectedValue(
      createApiError('conflict', {
        status: 409,
        messageKey: 'errors.courseOrder.alreadyEnrolled',
      })
    );
    renderPage();
    const card = await screen.findByTestId('checkout-already-enrolled');
    expect(card.textContent).toContain("You're already enrolled");
    expect(card.textContent).not.toContain('Not available for purchase');
    expect(
      screen.getByText('Go to course').closest('a')?.getAttribute('href')
    ).toBe('/my/courses/course-1');
  });

  it('a free course: says it is free and leads to its page to enroll', async () => {
    withMethods();
    createOrder.mockRejectedValue(
      createApiError('conflict', {
        status: 409,
        messageKey: 'errors.courseOrder.courseNotPaid',
      })
    );
    renderPage();
    const card = await screen.findByTestId('checkout-free');
    expect(card.textContent).toContain('This course is free');
    expect(card.textContent).toContain('Open the course page to enroll');
    expect(
      screen
        .getByText('Open the course page')
        .closest('a')
        ?.getAttribute('href')
    ).toBe('/courses/course-1');
  });

  it('a 500: "couldn’t start your order" with the reason and Try again, same key', async () => {
    withMethods();
    createOrder
      .mockRejectedValueOnce(createApiError('server', { status: 500 }))
      .mockResolvedValueOnce(ORDER);
    renderPage();
    const failed = await screen.findByTestId('checkout-order-failed');
    expect(failed.textContent).toContain("We couldn't start your order");
    expect(failed.textContent).toContain('Something failed on our side');
    expect(failed.textContent).not.toContain('payments');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByTestId('checkout-method-manual_instapay');
    const [first, second] = createOrder.mock.calls.map(
      (call) => (call[0] as { idempotencyKey: string }).idempotencyKey
    );
    expect(second).toBe(first);
  });

  it('a lost connection says so, not "not set up"', async () => {
    withMethods();
    createOrder.mockRejectedValue(createApiError('network'));
    renderPage();
    const failed = await screen.findByTestId('checkout-order-failed');
    expect(failed.textContent).toContain('Check your connection');
    expect(failed.textContent).not.toContain('Not available for purchase');
  });

  it('"Not available for purchase yet" only for the real not-configured case', async () => {
    useCourseOrderPaymentMethods.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    createOrder.mockResolvedValue(ORDER);
    renderPage();
    const card = await screen.findByTestId('checkout-unavailable');
    expect(card.textContent).toContain('Not available for purchase yet');
  });
});

describe('V12/V19/V23 — references, resume, Continue', () => {
  it('shows the order reference, and the payment reference once it exists', async () => {
    withMethods();
    createOrder.mockResolvedValue(ORDER);
    createPayment.mockResolvedValue(PAYMENT);
    renderPage();
    expect(
      (await screen.findByTestId('checkout-order-reference')).textContent
    ).toBe('3f2a9c1b');
    fireEvent.click(screen.getByRole('radio'));
    fireEvent.click(screen.getByTestId('checkout-continue'));
    expect(
      (await screen.findByTestId('checkout-payment-reference')).textContent
    ).toBe('9d8e7f6a');
  });

  it('Continue without a method says what is missing (never greyed)', async () => {
    withMethods();
    createOrder.mockResolvedValue(ORDER);
    renderPage();
    const continueButton = (await screen.findByTestId(
      'checkout-continue'
    )) as HTMLButtonElement;
    expect(continueButton.disabled).toBe(false);
    fireEvent.click(continueButton);
    expect(screen.getByTestId('checkout-method-error').textContent).toBe(
      'Choose a payment method first.'
    );
    expect(createPayment).not.toHaveBeenCalled();
  });

  it('a reload lands back on the proof step of the same payment', async () => {
    withMethods();
    createOrder.mockResolvedValue(ORDER);
    createPayment.mockResolvedValue(PAYMENT);
    const first = renderPage();
    fireEvent.click(await screen.findByRole('radio'));
    fireEvent.click(screen.getByTestId('checkout-continue'));
    await screen.findByTestId('checkout-proof-form');
    first.unmount();

    // The server answers "open an order" with the same open order.
    const getPayment = vi
      .spyOn(courseOrderService, 'getPayment')
      .mockResolvedValue(PAYMENT);
    renderPage();
    await screen.findByTestId('checkout-proof-form');
    expect(getPayment).toHaveBeenCalledWith(ORDER.id, PAYMENT.id);
    expect(createPayment).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('checkout-payment-reference').textContent).toBe(
      '9d8e7f6a'
    );
  });

  it('a payment already under review is said, not restarted', async () => {
    withMethods();
    createOrder.mockResolvedValue(ORDER);
    window.sessionStorage.setItem(
      'atlas.learner.checkout.course-1',
      JSON.stringify({
        orderId: ORDER.id,
        paymentId: PAYMENT.id,
        methodKey: METHOD.key,
      })
    );
    vi.spyOn(courseOrderService, 'getPayment').mockResolvedValue({
      ...PAYMENT,
      reviewStatus: 'pending',
    });
    renderPage();
    expect(await screen.findByTestId('checkout-under-review')).toBeTruthy();
  });

  it('a failed payment start is one alert with the real reason', async () => {
    withMethods();
    createOrder.mockResolvedValue(ORDER);
    createPayment.mockRejectedValue(createApiError('server', { status: 500 }));
    renderPage();
    fireEvent.click(await screen.findByRole('radio'));
    fireEvent.click(screen.getByTestId('checkout-continue'));
    const alert = await screen.findByTestId('save-failed');
    expect(alert.textContent).toContain("We couldn't start your payment");
    expect(alert.textContent).toContain('Something failed on our side');
  });

  it('sits under My courses: Courses › course › Checkout', async () => {
    withMethods();
    createOrder.mockResolvedValue(ORDER);
    renderPage();
    await screen.findByTestId('checkout-method-manual_instapay');
    await waitFor(() =>
      expect(headerProps).toHaveBeenLastCalledWith(
        expect.objectContaining({
          section: 'courses',
          ancestors: [
            expect.objectContaining({
              label: 'Arabic Calligraphy',
              path: '/courses/course-1',
            }),
          ],
          trailing: { labelKey: 'course:checkout.title' },
        })
      )
    );
  });
});
