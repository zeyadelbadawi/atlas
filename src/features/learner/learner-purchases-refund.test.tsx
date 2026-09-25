/**
 * `/my/purchases` self-service refund (backend P13) — the presentation
 * contract. Server-side eligibility and authorization are tested in the
 * backend; nothing here is a security test. What THESE pin:
 *
 *   - the action is offered only for a paid order inside the window, and a
 *     paid order outside it says the window ended instead;
 *   - the confirmation states that access ends BEFORE anything is sent;
 *   - one idempotency key per attempt: a retry inside the same dialog reuses
 *     it, a new dialog gets a new one;
 *   - a backend refusal is shown in the dialog with its specific copy (EN and
 *     AR), and a stale-order refusal re-reads the list;
 *   - a refunded order shows its refund's amount and status.
 *
 * Hooks are mocked at the feature's hooks barrel; everything else is real.
 * Native DOM assertions only — this repo does not ship jest-dom.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { createApiError } from '@api';
import type { CourseOrder, CourseOrderRefund } from '@types';
import type { ApiClient } from '@services';
import { refundEligibility } from './utils/course-refund.utils';
import { CourseOrderService } from './services/CourseOrderService';

const useLearnerPurchases = vi.fn();
const useRequestCourseOrderRefund = vi.fn();
const useCourseOrderRefund = vi.fn();

vi.mock('./hooks', () => ({
  useLearnerPurchases: () => useLearnerPurchases() as unknown,
  useRequestCourseOrderRefund: () => useRequestCourseOrderRefund() as unknown,
  useCourseOrderRefund: (orderId: string) =>
    useCourseOrderRefund(orderId) as unknown,
}));

// The header reads the learner surface context; its own tests cover it.
vi.mock('./components/LearnerPageHeader', () => ({
  LearnerPageHeader: () => <h1>Purchases</h1>,
}));

const { default: LearnerPurchasesPage } =
  await import('./pages/LearnerPurchasesPage');

const DAY = 24 * 60 * 60 * 1000;

function order(overrides: Partial<CourseOrder> = {}): CourseOrder {
  return {
    id: 'order-1',
    studentId: 'u-1',
    courseId: 'course-1',
    academyId: 'aca-1',
    organizationId: 'org-1',
    snapshot: {
      course: { id: 'course-1', title: 'Network Security 101' },
      price: { amountMinorUnits: 4900, currency: 'USD' },
      capturedAt: new Date(Date.now() - 3 * DAY).toISOString(),
    },
    status: 'paid',
    expiresAt: new Date(Date.now() + DAY).toISOString(),
    idempotencyKey: 'k',
    paidAt: new Date(Date.now() - 3 * DAY).toISOString(),
    createdAt: new Date(Date.now() - 3 * DAY).toISOString(),
    ...overrides,
  };
}

const refetch = vi.fn();
const mutate = vi.fn();
const reset = vi.fn();

function arrange({
  orders = [order()],
  mutation = {},
  refund = { data: null, isLoading: false, error: null, refetch: vi.fn() },
}: {
  orders?: CourseOrder[];
  mutation?: Record<string, unknown>;
  refund?: unknown;
} = {}) {
  useLearnerPurchases.mockReturnValue({
    orders,
    isLoading: false,
    error: null,
    refetch,
  });
  useRequestCourseOrderRefund.mockReturnValue({
    mutate,
    reset,
    isPending: false,
    error: null,
    ...mutation,
  });
  useCourseOrderRefund.mockReturnValue(refund);
}

function renderPage(locale: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(locale)}>
      <LearnerPurchasesPage />
    </I18nextProvider>
  );
}

function openDialog(): HTMLElement {
  fireEvent.click(
    screen.getByRole('button', {
      name: 'Request a refund for “Network Security 101”',
    })
  );
  return screen.getByRole('alertdialog');
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('refundEligibility', () => {
  const now = Date.parse('2026-09-25T12:00:00.000Z');

  it('is eligible up to exactly 30 days after payment, closed after', () => {
    const paidAt = new Date(now - 30 * DAY).toISOString();
    expect(refundEligibility({ status: 'paid', paidAt }, now).kind).toBe(
      'eligible'
    );
    expect(refundEligibility({ status: 'paid', paidAt }, now + 1).kind).toBe(
      'windowClosed'
    );
  });

  it('never applies to unpaid, refunded, or paid-without-paidAt orders', () => {
    const paidAt = new Date(now).toISOString();
    expect(refundEligibility({ status: 'refunded', paidAt }, now).kind).toBe(
      'notApplicable'
    );
    expect(
      refundEligibility({ status: 'pending_payment', paidAt }, now).kind
    ).toBe('notApplicable');
    expect(refundEligibility({ status: 'paid' }, now).kind).toBe(
      'notApplicable'
    );
  });
});

describe('LearnerPurchasesPage refunds', () => {
  it('offers the action only for a paid order inside the window', () => {
    arrange({
      orders: [
        order(),
        order({
          id: 'order-old',
          snapshot: {
            ...order().snapshot,
            course: { id: 'c2', title: 'Old Course' },
          },
          paidAt: new Date(Date.now() - 45 * DAY).toISOString(),
        }),
        order({
          id: 'order-pending',
          status: 'pending_payment',
          paidAt: undefined,
          snapshot: {
            ...order().snapshot,
            course: { id: 'c3', title: 'Pending Course' },
          },
        }),
      ],
    });
    renderPage();

    const buttons = screen.getAllByRole('button', { name: /refund/i });
    expect(buttons).toHaveLength(1);
    expect(screen.getByText(/^Refundable until/)).toBeTruthy();
    expect(screen.getByText(/^Refund period ended/)).toBeTruthy();
  });

  it('states that access ends before anything is sent', () => {
    arrange();
    renderPage();

    const dialog = openDialog();
    expect(
      within(dialog).getByText('Refund “Network Security 101”?')
    ).toBeTruthy();
    expect(
      within(dialog).getByText("You'll get a full refund of $49.00.")
    ).toBeTruthy();
    expect(
      within(dialog).getByText(/Your access to this course ends immediately/)
    ).toBeTruthy();
    expect(mutate).not.toHaveBeenCalled();
  });

  it('sends a UUID key and trimmed reason, and reuses the key on retry', () => {
    arrange();
    renderPage();

    const dialog = openDialog();
    fireEvent.change(within(dialog).getByLabelText('Reason (optional)'), {
      target: { value: '  Not what I expected  ' },
    });
    const confirm = within(dialog).getByRole('button', {
      name: 'Refund and end access',
    });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(mutate).toHaveBeenCalledTimes(2);
    const first = mutate.mock.calls[0]?.[0] as Record<string, string>;
    const second = mutate.mock.calls[1]?.[0] as Record<string, string>;
    expect(first.orderId).toBe('order-1');
    expect(first.reason).toBe('Not what I expected');
    expect(first.idempotencyKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
  });

  it('uses a new key for a new attempt', () => {
    arrange();
    renderPage();

    let dialog = openDialog();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Refund and end access' })
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    dialog = openDialog();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Refund and end access' })
    );

    const first = mutate.mock.calls[0]?.[0] as Record<string, string>;
    const second = mutate.mock.calls[1]?.[0] as Record<string, string>;
    expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
    // No reason typed → the optional field is not sent at all.
    expect('reason' in first).toBe(false);
  });

  it('disables both buttons while the refund is in flight', () => {
    arrange({ mutation: { isPending: true } });
    renderPage();

    const dialog = openDialog();
    const confirm = within(dialog).getByRole('button', {
      name: 'Processing refund…',
    }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(
      (
        within(dialog).getByRole('button', {
          name: 'Cancel',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
  });

  it('shows the specific copy for an elapsed window, in English and Arabic', () => {
    const error = createApiError('forbidden', {
      status: 403,
      messageKey: 'errors.courseOrder.refundWindowElapsed',
    });
    arrange({ mutation: { error } });
    renderPage();
    expect(within(openDialog()).getByRole('alert').textContent).toBe(
      'The refund period for this order has ended. Refunds are available within 30 days of purchase.'
    );
    cleanup();

    arrange({ mutation: { error } });
    renderPage('ar');
    fireEvent.click(
      screen.getByRole('button', {
        name: 'طلب استرداد مبلغ «Network Security 101»',
      })
    );
    expect(screen.getByRole('alert').textContent).toBe(
      'انتهت مدة الاسترداد لهذا الطلب. يتاح الاسترداد خلال 30 يومًا من تاريخ الشراء.'
    );
  });

  it('re-reads the orders when the server says the order is no longer refundable', () => {
    const error = createApiError('conflict', {
      status: 409,
      messageKey: 'errors.courseOrder.refundNotEligible',
    });
    mutate.mockImplementation(
      (_vars: unknown, options: { onError: (e: unknown) => void }) =>
        options.onError(error)
    );
    arrange();
    renderPage();

    fireEvent.click(
      within(openDialog()).getByRole('button', {
        name: 'Refund and end access',
      })
    );
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('closes and announces the outcome on success', () => {
    mutate.mockImplementation(
      (_vars: unknown, options: { onSuccess: () => void }) =>
        options.onSuccess()
    );
    arrange();
    renderPage();

    const dialog = openDialog();
    act(() => {
      fireEvent.click(
        within(dialog).getByRole('button', { name: 'Refund and end access' })
      );
    });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(
      screen.getByText(
        'Refund complete. Your access to “Network Security 101” has ended.'
      )
    ).toBeTruthy();
  });

  it('shows the refund of a refunded order, read only for that order', () => {
    const refund: CourseOrderRefund = {
      id: 'r-1',
      courseOrderId: 'order-1',
      paymentId: 'p-1',
      refundType: 'full',
      status: 'succeeded',
      money: { amountMinorUnits: 4900, currency: 'USD' },
      requestedBy: 'u-1',
      requestedAt: '2026-09-20T10:00:00.000Z',
      processedAt: '2026-09-20T10:00:00.000Z',
    };
    arrange({
      orders: [order({ status: 'refunded' })],
      refund: { data: refund, isLoading: false, error: null, refetch: vi.fn() },
    });
    renderPage();

    expect(useCourseOrderRefund).toHaveBeenCalledWith('order-1');
    expect(screen.getByText(/^Refunded \$49\.00 on/)).toBeTruthy();
    expect(screen.getByText('Refund complete')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: /request a refund/i })
    ).toBeNull();
  });

  it('offers a retry when the refund details fail to load', () => {
    const retry = vi.fn();
    arrange({
      orders: [order({ status: 'refunded' })],
      refund: {
        data: undefined,
        isLoading: false,
        error: createApiError('server', { status: 500 }),
        refetch: retry,
      },
    });
    renderPage();

    expect(screen.getByText("Couldn't load the refund details.")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe('CourseOrderService refunds', () => {
  it('posts the refund body to, and reads it from, the order refund path', async () => {
    const post = vi.fn().mockResolvedValue({});
    const get = vi.fn().mockResolvedValue(null);
    const service = new CourseOrderService({
      post,
      get,
    } as unknown as ApiClient);

    await service.requestRefund('order-1', { idempotencyKey: 'key-1' });
    const refund = await service.getRefund('order-1');

    expect(post.mock.calls[0]?.[0]).toBe('course-orders/order-1/refund');
    expect(post.mock.calls[0]?.[1]).toEqual({ idempotencyKey: 'key-1' });
    expect(get.mock.calls[0]?.[0]).toBe('course-orders/order-1/refund');
    // `null` is the backend's "no refund yet", passed through untouched.
    expect(refund).toBeNull();
  });
});
