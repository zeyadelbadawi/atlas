/**
 * Course payment review — what the Platform Owner sees and what is sent.
 *
 * Pinned here: the list renders real rows / an empty state / a retryable
 * error; the "Pending" filter never shows an already-reviewed row (the
 * backend accepts `reviewStatus` but does not yet apply it); approve and
 * reject are CONFIRMED before any request, send exactly the DTO shape the
 * backend validates, and reject enforces the 10-character reason floor.
 * Authorization is not tested here — `PlatformOwnerGuard` decides it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
import type { CourseOrderPayment } from '@types';

const useCourseOrderPayments = vi.fn();
const useCourseOrderPayment = vi.fn();
const approveMutate = vi.fn();
const rejectMutate = vi.fn();
const confirm = vi.fn<(request: unknown) => Promise<boolean>>();
const notifySuccess = vi.fn();
const refetch = vi.fn();

vi.mock('./hooks', () => ({
  useCourseOrderPayments: (options: unknown) =>
    useCourseOrderPayments(options) as unknown,
  useCourseOrderPayment: (id: string) => useCourseOrderPayment(id) as unknown,
  useApproveCourseOrderPayment: () => ({
    mutate: approveMutate,
    isPending: false,
    error: null,
  }),
  useRejectCourseOrderPayment: () => ({
    mutate: rejectMutate,
    isPending: false,
    error: null,
  }),
}));

vi.mock('@app/providers', () => ({
  useConfirmDialog: () => ({ confirm }),
  useToast: () => ({ notifySuccess, notifyError: vi.fn() }),
}));

const { default: ListPage } =
  await import('./pages/PlatformCoursePaymentListPage');
const { default: DetailPage } =
  await import('./pages/PlatformCoursePaymentDetailPage');

function payment(over: Partial<CourseOrderPayment> = {}): CourseOrderPayment {
  return {
    id: 'pay-1',
    courseOrderId: 'order-1',
    payerUserId: 'user-1',
    payeeAcademyId: 'academy-1',
    methodKey: 'bank',
    methodType: 'manual_bank_transfer',
    provider: 'manual',
    money: { amountMinorUnits: 150000, currency: 'EGP' },
    status: 'pending',
    reviewStatus: 'pending',
    proof: {
      id: 'proof-1',
      paymentId: 'pay-1',
      fileName: 'receipt.png',
      fileUrl: 'platform-course-order-payments/pay-1/proof/file',
      mimeType: 'image/png',
      uploadedAt: '2026-09-20T10:00:00Z',
    },
    attempts: [],
    commission: { rateBasisPoints: 1000, amountMinorUnits: 15000 },
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
    ...over,
  };
}

function page(items: readonly CourseOrderPayment[]) {
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

beforeEach(() => {
  confirm.mockResolvedValue(true);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PlatformCoursePaymentListPage', () => {
  it('renders course payments and asks the server for the pending queue', () => {
    useCourseOrderPayments.mockReturnValue(page([payment()]));
    const { container } = renderList();

    expect(screen.getByText('academy-1')).toBeTruthy();
    expect(screen.getByText(/1,500\.00/)).toBeTruthy();
    expect(useCourseOrderPayments).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          filters: { reviewStatus: 'pending' },
        }),
      })
    );
    expect(container.textContent).not.toMatch(/platformCommerce:/);
  });

  it('never shows an already-reviewed row under the Pending filter', () => {
    useCourseOrderPayments.mockReturnValue(
      page([
        payment(),
        payment({
          id: 'pay-2',
          payeeAcademyId: 'academy-approved',
          reviewStatus: 'approved',
        }),
      ])
    );
    renderList();
    expect(screen.getByText('academy-1')).toBeTruthy();
    expect(screen.queryByText('academy-approved')).toBeNull();
  });

  it('shows the empty state when there is nothing to review', () => {
    useCourseOrderPayments.mockReturnValue(page([]));
    renderList();
    expect(screen.getByText('No course payments here')).toBeTruthy();
  });

  it('shows a retryable error state', () => {
    useCourseOrderPayments.mockReturnValue({
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
    useCourseOrderPayments.mockReturnValue(page([payment()]));
    const { container } = renderList('ar');
    expect(container.textContent).toMatch(/مدفوعات الدورات/);
    expect(container.textContent).not.toMatch(/platformCommerce:/);
  });
});

describe('PlatformCoursePaymentDetailPage', () => {
  it('does not approve until the reviewer confirms', async () => {
    useCourseOrderPayment.mockReturnValue({
      data: payment(),
      isLoading: false,
      error: null,
      refetch,
    });
    confirm.mockResolvedValue(false);
    renderDetail();

    fireEvent.click(screen.getByRole('button', { name: 'Approve payment' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(approveMutate).not.toHaveBeenCalled();
  });

  it('approves the payment once confirmed', async () => {
    useCourseOrderPayment.mockReturnValue({
      data: payment(),
      isLoading: false,
      error: null,
      refetch,
    });
    renderDetail();

    fireEvent.click(screen.getByRole('button', { name: 'Approve payment' }));
    await waitFor(() => expect(approveMutate).toHaveBeenCalledTimes(1));
    expect(approveMutate.mock.calls[0]?.[0]).toEqual({
      paymentId: 'pay-1',
      payload: { notes: undefined },
    });
  });

  it('requires an actionable reason before a rejection is even confirmed', async () => {
    useCourseOrderPayment.mockReturnValue({
      data: payment(),
      isLoading: false,
      error: null,
      refetch,
    });
    renderDetail();

    fireEvent.change(screen.getByLabelText('Reason for rejection'), {
      target: { value: 'too short' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reject payment' }));
    expect(
      await screen.findByText(
        'Give the learner a reason of at least 10 characters.'
      )
    ).toBeTruthy();
    expect(confirm).not.toHaveBeenCalled();
    expect(rejectMutate).not.toHaveBeenCalled();
  });

  it('rejects with the reason once confirmed', async () => {
    useCourseOrderPayment.mockReturnValue({
      data: payment(),
      isLoading: false,
      error: null,
      refetch,
    });
    renderDetail();

    fireEvent.change(screen.getByLabelText('Reason for rejection'), {
      target: { value: '  The transfer amount does not match.  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reject payment' }));
    await waitFor(() => expect(rejectMutate).toHaveBeenCalledTimes(1));
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ intent: 'destructive' })
    );
    expect(rejectMutate.mock.calls[0]?.[0]).toEqual({
      paymentId: 'pay-1',
      payload: { notes: 'The transfer amount does not match.' },
    });
  });

  it('offers no decision once the payment has been reviewed', () => {
    useCourseOrderPayment.mockReturnValue({
      data: payment({ reviewStatus: 'approved', status: 'succeeded' }),
      isLoading: false,
      error: null,
      refetch,
    });
    renderDetail();
    expect(screen.getByText(/has already been reviewed/)).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Approve payment' })
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reject payment' })).toBeNull();
  });

  it('shows a retryable error when the payment cannot be loaded', () => {
    useCourseOrderPayment.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
      refetch,
    });
    renderDetail();
    fireEvent.click(screen.getByRole('button', { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalled();
  });
});
