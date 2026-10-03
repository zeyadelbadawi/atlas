/**
 * Academy Orders (list + detail) — the presentation contract. Who may read
 * these endpoints is enforced server-side (Organization Owner only);
 * nothing here is a security test. What THESE pin:
 *
 *   - rows show student name + masked email, course, amount and TEXT
 *     badges for order, payment and refund status (EN and AR, no raw keys);
 *   - search and sort are sent to the server (the hook receives them), and
 *     a returned page is rendered as-is;
 *   - the filters, sort and page come from and go to the URL (Back from an
 *     order restores them), and a placeholder page shows as busy;
 *   - empty (with and without filters), loading, a retryable error, and a
 *     403 rendered as ONE permission state;
 *   - the detail lists every payment attempt, shows the refund, and turns a
 *     404 into "not found" rather than a retryable error;
 *   - the service addresses the academy-scoped paths with flat params.
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
import { MemoryRouter, useLocation } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import { createApiError } from '@api';
import type { ApiClient } from '@services';
import type { AcademyCourseOrder, AcademyCourseOrderDetail } from '@types';
import { AcademyCourseOrdersService } from './services/AcademyCourseOrdersService';

const params: { academyId?: string; orderId?: string } = {
  academyId: 'academy-1',
  orderId: 'order-1',
};
const navigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useParams: () => params,
  useNavigate: () => navigate,
}));

const useAcademyCourseOrders = vi.fn();
const useAcademyCourseOrder = vi.fn();
vi.mock('./hooks', () => ({
  useAcademyCourseOrders: (id: string, query: unknown) =>
    useAcademyCourseOrders(id, query) as unknown,
  useAcademyCourseOrder: (id: string, orderId: string) =>
    useAcademyCourseOrder(id, orderId) as unknown,
}));

const { default: AcademyOrdersPage } =
  await import('./pages/AcademyOrdersPage');
const { default: AcademyOrdersDetailPage } =
  await import('./pages/AcademyOrdersDetailPage');

function ready<T>(data: T) {
  return { data, isLoading: false, error: null, refetch: vi.fn() };
}
function failed(kind: 'forbidden' | 'server' | 'notFound') {
  return {
    data: undefined,
    isLoading: false,
    error: createApiError(kind, {
      status: kind === 'forbidden' ? 403 : kind === 'notFound' ? 404 : 500,
    }),
    refetch: vi.fn(),
  };
}

function order(over: Partial<AcademyCourseOrder> = {}): AcademyCourseOrder {
  return {
    id: 'order-1-aaaa-bbbb',
    status: 'paid',
    money: { amountMinorUnits: 150000, currency: 'EGP' },
    course: { id: 'course-1', title: 'Intro to Algebra' },
    student: { name: 'Sara Ahmed', maskedEmail: 's•••@example.com' },
    latestPayment: {
      id: 'pay-1',
      status: 'succeeded',
      reviewStatus: 'approved',
      methodType: 'manual_instapay',
      money: { amountMinorUnits: 150000, currency: 'EGP' },
      createdAt: '2026-09-01T10:05:00.000Z',
    },
    paymentCount: 1,
    createdAt: '2026-09-01T10:00:00.000Z',
    paidAt: '2026-09-01T11:00:00.000Z',
    expiresAt: '2026-09-02T10:00:00.000Z',
    ...over,
  };
}

function page(items: AcademyCourseOrder[]) {
  return {
    items,
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
  url = '/orders'
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  params.academyId = 'academy-1';
  params.orderId = 'order-1';
});

describe('AcademyOrdersPage', () => {
  it('renders the order summary with text badges and no raw keys', () => {
    useAcademyCourseOrders.mockReturnValue(
      ready(
        page([
          order(),
          order({
            id: 'order-2-cccc',
            status: 'refunded',
            refund: {
              status: 'succeeded',
              money: { amountMinorUnits: 150000, currency: 'EGP' },
              requestedAt: '2026-09-03T10:00:00.000Z',
            },
          }),
          order({
            id: 'order-3-dddd',
            status: 'pending_payment',
            latestPayment: undefined,
            paymentCount: 0,
            paidAt: undefined,
          }),
        ])
      )
    );
    const { container } = renderWith(<AcademyOrdersPage />);

    expect(screen.getAllByText('Sara Ahmed')).toHaveLength(3);
    expect(screen.getAllByText('s•••@example.com')).toHaveLength(3);
    expect(screen.getAllByText('Intro to Algebra')).toHaveLength(3);
    expect(screen.getByText('Paid')).toBeTruthy();
    expect(screen.getByText('Refunded')).toBeTruthy();
    expect(screen.getByText('Refund completed')).toBeTruthy();
    expect(screen.getByText('Awaiting payment')).toBeTruthy();
    expect(screen.getByText('No payment yet')).toBeTruthy();
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0);
    expect(container.textContent).toMatch(/1,500\.00/);
    expect(container.textContent).not.toMatch(/payments:|navigation:/);
  });

  it('asks the server for the academy’s orders, newest first, and pages server-side', () => {
    useAcademyCourseOrders.mockReturnValue(ready(page([order()])));
    renderWith(<AcademyOrdersPage />);
    expect(useAcademyCourseOrders).toHaveBeenCalledWith(
      'academy-1',
      expect.objectContaining({
        pagination: { page: 1, pageSize: 20 },
        sort: { field: 'createdAt', direction: 'desc' },
      })
    );
    const [, query] = useAcademyCourseOrders.mock.calls[0] as [
      string,
      { filters?: unknown },
    ];
    expect(query.filters).toBeUndefined();
  });

  it('sends the search to the server and shows the filtered empty state', async () => {
    useAcademyCourseOrders.mockReturnValue(ready(page([])));
    renderWith(<AcademyOrdersPage />);
    expect(screen.getByText('No orders yet')).toBeTruthy();

    fireEvent.change(
      screen.getByRole('searchbox', {
        name: 'Search by student, course or order ID',
      }),
      { target: { value: 'sara' } }
    );
    await waitFor(() =>
      expect(useAcademyCourseOrders).toHaveBeenLastCalledWith(
        'academy-1',
        expect.objectContaining({ search: 'sara' })
      )
    );
    expect(await screen.findByText('No orders match')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Clear filters/ })).toBeTruthy();
  });

  it('reads the filters, sort and page from the URL and writes changes back to it', async () => {
    useAcademyCourseOrders.mockReturnValue(ready(page([order()])));
    renderWith(
      <AcademyOrdersPage />,
      'en',
      '/orders?status=paid&sort=amount_asc&page=3&methodType=bogus&from=2026-02-31'
    );
    // Valid values are applied; unknown ones fall back to their defaults.
    const [, query] = useAcademyCourseOrders.mock.calls[0] as [
      string,
      { pagination: unknown; sort: unknown; filters?: unknown },
    ];
    expect(query.pagination).toEqual({ page: 3, pageSize: 20 });
    expect(query.sort).toEqual({ field: 'amount', direction: 'asc' });
    expect(query.filters).toEqual({ status: 'paid' });

    // A change is written to the URL (replace) and returns to page 1.
    fireEvent.change(
      screen.getByRole('searchbox', {
        name: 'Search by student, course or order ID',
      }),
      { target: { value: 'sara' } }
    );
    await waitFor(() => expect(currentSearch).toContain('search=sara'));
    expect(currentSearch).toContain('status=paid');
    expect(currentSearch).not.toContain('page=');
    expect(useAcademyCourseOrders).toHaveBeenLastCalledWith(
      'academy-1',
      expect.objectContaining({
        search: 'sara',
        pagination: { page: 1, pageSize: 20 },
      })
    );
  });

  it('dims the previous rows and marks the table busy while a new filter loads', () => {
    useAcademyCourseOrders.mockReturnValue({
      ...ready(page([order()])),
      isFetching: true,
      isPlaceholderData: true,
    });
    const { container } = renderWith(<AcademyOrdersPage />);
    const busy = container.querySelector('[aria-busy="true"]');
    expect(busy?.querySelector('table')).toBeTruthy();
  });

  it('opens the order detail on row select', () => {
    useAcademyCourseOrders.mockReturnValue(ready(page([order()])));
    renderWith(<AcademyOrdersPage />);
    fireEvent.click(screen.getByText('Intro to Algebra'));
    expect(navigate).toHaveBeenCalledWith(
      '/dashboard/academy/academy-1/orders/order-1-aaaa-bbbb'
    );
  });

  it('renders a 403 as one permission state', () => {
    useAcademyCourseOrders.mockReturnValue(failed('forbidden'));
    renderWith(<AcademyOrdersPage />);
    expect(
      screen.getByText('Only the organization owner can see orders')
    ).toBeTruthy();
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('offers a retry on other failures', () => {
    const state = failed('server');
    useAcademyCourseOrders.mockReturnValue(state);
    renderWith(<AcademyOrdersPage />);
    expect(screen.getByText("Couldn't load orders")).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /try again|retry/i }));
    expect(state.refetch).toHaveBeenCalled();
  });

  it('shows a loading skeleton, not an empty state, while loading', () => {
    useAcademyCourseOrders.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });
    renderWith(<AcademyOrdersPage />);
    expect(screen.queryByText('No orders yet')).toBeNull();
  });

  it('renders in Arabic with no missing keys', () => {
    useAcademyCourseOrders.mockReturnValue(ready(page([order()])));
    const { container } = renderWith(<AcademyOrdersPage />, 'ar');
    expect(container.textContent).toMatch(/الطلبات/);
    expect(container.textContent).toMatch(/مدفوع/);
    expect(container.textContent).not.toMatch(/payments:/);
  });
});

describe('AcademyOrdersDetailPage', () => {
  function detail(
    over: Partial<AcademyCourseOrderDetail> = {}
  ): AcademyCourseOrderDetail {
    const base = order({ status: 'pending_payment', paidAt: undefined });
    return {
      ...base,
      payments: [
        {
          id: 'pay-2',
          status: 'pending',
          reviewStatus: 'pending',
          methodType: 'manual_instapay',
          money: { amountMinorUnits: 150000, currency: 'EGP' },
          createdAt: '2026-09-02T10:00:00.000Z',
        },
        {
          id: 'pay-1',
          status: 'failed',
          reviewStatus: 'rejected',
          methodType: 'manual_bank_transfer',
          providerReference: 'REF-123',
          money: { amountMinorUnits: 150000, currency: 'EGP' },
          createdAt: '2026-09-01T10:00:00.000Z',
        },
      ],
      ...over,
    };
  }

  it('lists every payment attempt and the order summary', () => {
    useAcademyCourseOrder.mockReturnValue(ready(detail()));
    const { container } = renderWith(<AcademyOrdersDetailPage />);
    expect(useAcademyCourseOrder).toHaveBeenCalledWith('academy-1', 'order-1');
    expect(screen.getByText('Awaiting review')).toBeTruthy();
    expect(screen.getByText('Rejected')).toBeTruthy();
    expect(screen.getByText('REF-123')).toBeTruthy();
    expect(screen.getByText('Not paid')).toBeTruthy();
    expect(screen.getByText('s•••@example.com')).toBeTruthy();
    expect(container.textContent).not.toMatch(/payments:/);
  });

  it('shows the refund when there is one', () => {
    useAcademyCourseOrder.mockReturnValue(
      ready(
        detail({
          status: 'refunded',
          refund: {
            status: 'succeeded',
            money: { amountMinorUnits: 150000, currency: 'EGP' },
            requestedAt: '2026-09-03T10:00:00.000Z',
            processedAt: '2026-09-03T10:01:00.000Z',
          },
        })
      )
    );
    renderWith(<AcademyOrdersDetailPage />);
    expect(screen.getAllByText('Refund completed').length).toBeGreaterThan(0);
    expect(screen.getByText('Processed')).toBeTruthy();
  });

  it('renders a 404 as "not found", without a retry', () => {
    useAcademyCourseOrder.mockReturnValue(failed('notFound'));
    renderWith(<AcademyOrdersDetailPage />);
    expect(screen.getByText('Order not found')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: /try again|retry/i })
    ).toBeNull();
  });

  it('renders a 403 as the permission state', () => {
    useAcademyCourseOrder.mockReturnValue(failed('forbidden'));
    renderWith(<AcademyOrdersDetailPage />);
    expect(
      screen.getByText('Only the organization owner can see orders')
    ).toBeTruthy();
  });
});

describe('AcademyCourseOrdersService', () => {
  it('addresses the academy-scoped paths with flat filter, sort and search params', async () => {
    const get = vi.fn().mockResolvedValue({});
    const service = new AcademyCourseOrdersService({
      get,
    } as unknown as ApiClient);

    await service.getOrders('aca/1', {
      pagination: { page: 2, pageSize: 50 },
      sort: { field: 'amount', direction: 'asc' },
      search: ' sara ',
      filters: { status: 'paid', refundStatus: 'none', from: '2026-09-01' },
    });
    await service.getOrder('aca/1', 'ord/9');

    expect(get.mock.calls[0]?.[0]).toBe('academies/aca%2F1/course-orders');
    expect(get.mock.calls[0]?.[1]).toMatchObject({
      params: {
        page: 2,
        pageSize: 50,
        sortBy: 'amount',
        sortDirection: 'asc',
        search: 'sara',
        status: 'paid',
        refundStatus: 'none',
        from: '2026-09-01',
      },
    });
    expect(get.mock.calls[1]?.[0]).toBe(
      'academies/aca%2F1/course-orders/ord%2F9'
    );
  });
});
