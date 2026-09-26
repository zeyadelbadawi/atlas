/**
 * Academy Revenue & Payouts page (backend P13) — the presentation contract.
 * Who may read these endpoints is enforced server-side (Organization Owner
 * only); nothing here is a security test. What THESE pin:
 *
 *   - one balance card per currency, never summed across currencies, and a
 *     negative net balance is explained rather than hidden;
 *   - payout rows render period, amount and a TEXT status;
 *   - the empty state explains when payouts appear;
 *   - a 403 from either read is ONE permission state, never a blank page;
 *   - other failures offer a retry that re-runs the failing read;
 *   - the service addresses the right academy-scoped paths.
 *
 * Native DOM assertions only — this repo does not ship jest-dom.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { createApiError } from '@api';
import type { ApiClient } from '@services';
import type { AcademyPayout, AcademyRevenueSummary } from '@types';
import { AcademyPayoutsService } from './services/AcademyPayoutsService';

let academyId = 'academy-1';
vi.mock('react-router-dom', () => ({
  useParams: () => ({ academyId }),
}));

const useAcademyPayouts = vi.fn();
const useAcademyRevenueSummary = vi.fn();
vi.mock('./hooks', () => ({
  useAcademyPayouts: (id: string, query: unknown) =>
    useAcademyPayouts(id, query) as unknown,
  useAcademyRevenueSummary: (id: string) =>
    useAcademyRevenueSummary(id) as unknown,
}));

const { default: AcademyRevenuePage } =
  await import('./pages/AcademyRevenuePage');

function ready<T>(data: T) {
  return { data, isLoading: false, error: null, refetch: vi.fn() };
}
function loading() {
  return { data: undefined, isLoading: true, error: null, refetch: vi.fn() };
}
function failed(kind: 'forbidden' | 'server') {
  return {
    data: undefined,
    isLoading: false,
    error: createApiError(kind, {
      status: kind === 'forbidden' ? 403 : 500,
      messageKey:
        kind === 'forbidden' ? 'errors.tenancy.notAMember' : undefined,
    }),
    refetch: vi.fn(),
  };
}

function payout(overrides: Partial<AcademyPayout> = {}): AcademyPayout {
  return {
    id: 'p-1',
    academyId: 'academy-1',
    status: 'paid',
    money: { amountMinorUnits: 123450, currency: 'USD' },
    periodStart: '2026-08-01T00:00:00.000Z',
    periodEnd: '2026-08-31T00:00:00.000Z',
    paidAt: '2026-09-05T00:00:00.000Z',
    providerReference: 'TRX-778',
    itemCount: 4,
    createdAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function page(items: AcademyPayout[]) {
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

const SUMMARY: AcademyRevenueSummary = {
  academyId: 'academy-1',
  unsettled: [
    { currency: 'USD', amountMinorUnits: 50000 },
    { currency: 'EGP', amountMinorUnits: -2500 },
  ],
};

function arrange({
  summary = ready(SUMMARY) as unknown,
  payouts = ready(page([payout()])) as unknown,
} = {}) {
  useAcademyRevenueSummary.mockReturnValue(summary);
  useAcademyPayouts.mockReturnValue(payouts);
}

function renderPage(locale: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(locale)}>
      <AcademyRevenuePage />
    </I18nextProvider>
  );
}

beforeEach(() => {
  academyId = 'academy-1';
  vi.clearAllMocks();
});
afterEach(cleanup);

describe('AcademyRevenuePage', () => {
  it('renders one balance card per currency and explains a negative one', () => {
    arrange();
    renderPage();

    const list = screen.getByRole('list', { name: 'Awaiting payout' });
    const cards = within(list).getAllByRole('listitem');
    expect(cards).toHaveLength(2);
    expect(cards[0]?.textContent).toContain('Unsettled balance · USD');
    expect(cards[0]?.textContent).toContain('$500.00');
    expect(cards[1]?.textContent).toContain('Unsettled balance · EGP');
    expect(cards[1]?.textContent).toContain(
      'Refunds currently exceed sales in this currency'
    );
    expect(cards[0]?.textContent).not.toContain('Refunds currently exceed');
  });

  it('asks both reads for the academy in the route', () => {
    arrange();
    renderPage();
    expect(useAcademyRevenueSummary).toHaveBeenLastCalledWith('academy-1');
    expect(useAcademyPayouts).toHaveBeenLastCalledWith('academy-1', {
      pagination: { page: 1, pageSize: 20 },
    });
  });

  it('renders payout rows with period, amount and text status', () => {
    arrange({
      payouts: ready(
        page([
          payout(),
          payout({
            id: 'p-2',
            status: 'pending',
            paidAt: undefined,
            providerReference: undefined,
          }),
        ])
      ),
    });
    renderPage();

    const rows = screen.getAllByRole('row');
    // header + 2 rows
    expect(rows).toHaveLength(3);
    expect(rows[1]?.textContent).toContain('$1,234.50');
    expect(rows[1]?.textContent).toContain('Paid');
    expect(rows[1]?.textContent).toContain('TRX-778');
    expect(rows[2]?.textContent).toContain('Pending');
    expect(rows[2]?.textContent).toContain('Not paid yet');
  });

  it('explains when payouts appear when there are none', () => {
    arrange({
      summary: ready({ academyId: 'academy-1', unsettled: [] }),
      payouts: ready(page([])),
    });
    renderPage();

    expect(screen.getByText('No payouts yet')).toBeTruthy();
    expect(
      screen.getByText(
        /online payment gateways aren't available yet/
      )
    ).toBeTruthy();
    expect(
      screen.getByText('Nothing is awaiting payout right now.')
    ).toBeTruthy();
  });

  it('renders a single permission state on 403, in English and Arabic', () => {
    arrange({ summary: failed('forbidden'), payouts: failed('forbidden') });
    renderPage();
    expect(
      screen.getAllByText('Only the organization owner can view this')
    ).toHaveLength(1);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
    cleanup();

    arrange({ summary: ready(SUMMARY), payouts: failed('forbidden') });
    renderPage('ar');
    expect(screen.getByText('هذه الصفحة متاحة لمالك المؤسسة فقط')).toBeTruthy();
    // Money is not shown beside a refusal of the other read.
    expect(screen.queryByText(/USD/)).toBeNull();
  });

  it('offers a retry that re-runs only the failing read', () => {
    const payouts = failed('server');
    const summary = ready(SUMMARY);
    arrange({ summary, payouts });
    renderPage();

    const retry = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retry);
    expect(payouts.refetch).toHaveBeenCalledTimes(1);
    expect(summary.refetch).not.toHaveBeenCalled();
    // The healthy read still renders.
    expect(screen.getByText('Unsettled balance · USD')).toBeTruthy();
  });

  it('shows loading placeholders while the reads are in flight', () => {
    arrange({ summary: loading(), payouts: loading() });
    renderPage();
    expect(
      screen.getByText('Loading the balance awaiting payout')
    ).toBeTruthy();
    expect(screen.queryByText('No payouts yet')).toBeNull();
  });

  it('shows a no-academy state, and no money, when the route has none', () => {
    academyId = '';
    arrange();
    renderPage();
    expect(screen.getByText('No academy selected')).toBeTruthy();
    expect(screen.queryByText(/Unsettled balance/)).toBeNull();
  });
});

describe('AcademyPayoutsService', () => {
  it('addresses the academy-scoped payout paths with page params', async () => {
    const get = vi.fn().mockResolvedValue({});
    const service = new AcademyPayoutsService({ get } as unknown as ApiClient);

    await service.getPayouts('aca/1', {
      pagination: { page: 2, pageSize: 50 },
    });
    await service.getRevenueSummary('aca/1');

    expect(get.mock.calls[0]?.[0]).toBe('academies/aca%2F1/payouts');
    expect(get.mock.calls[0]?.[1]).toMatchObject({
      params: { page: 2, pageSize: 50 },
    });
    expect(get.mock.calls[1]?.[0]).toBe(
      'academies/aca%2F1/payouts/revenue-summary'
    );
  });
});
