/**
 * Academy payouts — list states, the create-payout form and the mark-paid
 * confirmation.
 *
 * Pinned here: "Mark paid" exists only for statuses the backend will move
 * (never `paid`/`failed`); it opens a confirmation and sends nothing until
 * confirmed; the create form refuses a period that does not end after it
 * starts, sends whole-day UTC instants, and reports an empty result as
 * "nothing owed" rather than success.
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
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import type { AcademyPayout } from '@types';

const useAcademyPayouts = vi.fn();
const createMutate = vi.fn();
const markPaidMutate = vi.fn();
const notifySuccess = vi.fn();
const refetch = vi.fn();
// Stable, like TanStack's own `reset` — the dialogs reset on open.
const resetCreate = vi.fn();
const resetMarkPaid = vi.fn();
const academiesRefetch = vi.fn();
const academies = {
  data: {
    items: [
      { id: 'academy-1', name: 'Cairo Academy', organizationName: 'Nile Org' },
    ],
    pagination: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
  },
  isLoading: false,
  error: null,
  refetch: academiesRefetch,
};

vi.mock('./hooks', () => ({
  useAcademyPayouts: (query: unknown) => useAcademyPayouts(query) as unknown,
  useCreateAcademyPayout: () => ({
    mutate: createMutate,
    reset: resetCreate,
    isPending: false,
    error: null,
  }),
  useMarkAcademyPayoutPaid: () => ({
    mutate: markPaidMutate,
    reset: resetMarkPaid,
    isPending: false,
    error: null,
  }),
}));

vi.mock('@features/platform', () => ({
  usePlatformAcademies: () => academies,
}));

vi.mock('@app/providers', () => ({
  useConfirmDialog: () => ({ confirm: vi.fn(async () => true) }),
  useToast: () => ({ notifySuccess, notifyError: vi.fn() }),
}));

const { default: PayoutsPage } = await import('./pages/PlatformPayoutsPage');

function payout(over: Partial<AcademyPayout> = {}): AcademyPayout {
  return {
    id: 'po-1',
    academyId: 'academy-1',
    status: 'pending',
    money: { amountMinorUnits: 250000, currency: 'EGP' },
    periodStart: '2026-09-01T00:00:00.000Z',
    periodEnd: '2026-09-30T23:59:59.999Z',
    itemCount: 3,
    createdAt: '2026-09-30T12:00:00Z',
    ...over,
  };
}

function withRows(rows: readonly AcademyPayout[]) {
  useAcademyPayouts.mockReturnValue({
    data: {
      items: rows,
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: rows.length,
        totalPages: 1,
      },
    },
    isLoading: false,
    error: null,
    refetch,
  });
}

function renderPage(language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter>
        <PayoutsPage />
      </MemoryRouter>
    </I18nextProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PlatformPayoutsPage — list', () => {
  it('renders payouts, offering Mark paid only where the backend allows it', () => {
    withRows([
      payout(),
      payout({
        id: 'po-2',
        academyId: 'academy-paid',
        status: 'paid',
        paidAt: '2026-10-01T00:00:00Z',
      }),
      payout({ id: 'po-3', academyId: 'academy-failed', status: 'failed' }),
    ]);
    const { container } = renderPage();

    const table = within(screen.getByRole('table'));
    expect(table.getByText('academy-1')).toBeTruthy();
    expect(table.getAllByText('Paid').length).toBeGreaterThan(0);
    expect(table.getByText('Failed')).toBeTruthy();
    expect(table.getAllByRole('button', { name: /as paid/i })).toHaveLength(1);
    expect(container.textContent).not.toMatch(/platformCommerce:/);
  });

  it('shows the empty state', () => {
    withRows([]);
    renderPage();
    expect(screen.getByText('No payouts yet')).toBeTruthy();
  });

  it('shows a retryable error state', () => {
    useAcademyPayouts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
      refetch,
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('renders in Arabic with no missing keys', () => {
    withRows([payout()]);
    const { container } = renderPage('ar');
    expect(container.textContent).toMatch(/مستحقات الأكاديميات/);
    expect(container.textContent).not.toMatch(/platformCommerce:/);
  });
});

describe('PlatformPayoutsPage — mark paid', () => {
  it('asks for confirmation and sends nothing when cancelled', () => {
    withRows([payout()]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /as paid/i }));

    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByText(/has been sent to the academy/)
    ).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(markPaidMutate).not.toHaveBeenCalled();
  });

  it('marks the payout paid with the transfer reference once confirmed', async () => {
    withRows([payout()]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /as paid/i }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Transfer reference/), {
      target: { value: ' TRX-42 ' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Mark as paid' })
    );
    await waitFor(() => expect(markPaidMutate).toHaveBeenCalledTimes(1));
    expect(markPaidMutate.mock.calls[0]?.[0]).toEqual({
      payoutId: 'po-1',
      payload: { providerReference: 'TRX-42' },
    });
  });
});

describe('PlatformPayoutsPage — create payout', () => {
  function openCreate() {
    withRows([]);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Create payout' }));
    return screen.getByRole('dialog');
  }

  function chooseAcademy(dialog: HTMLElement) {
    // Radix Select mirrors its value into a native <select> inside a form.
    const native = dialog.querySelector('select');
    expect(native).not.toBeNull();
    fireEvent.change(native as HTMLSelectElement, {
      target: { value: 'academy-1' },
    });
  }

  it('refuses a period that does not end after it starts', async () => {
    const dialog = openCreate();
    chooseAcademy(dialog);
    fireEvent.change(within(dialog).getByLabelText('From'), {
      target: { value: '2026-09-30' },
    });
    fireEvent.change(within(dialog).getByLabelText('To'), {
      target: { value: '2026-09-01' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create payout' })
    );
    expect(
      await within(dialog).findByText(
        'The end date must be after the start date.'
      )
    ).toBeTruthy();
    expect(createMutate).not.toHaveBeenCalled();
  });

  it('requires an academy', async () => {
    const dialog = openCreate();
    fireEvent.change(within(dialog).getByLabelText('From'), {
      target: { value: '2026-09-01' },
    });
    fireEvent.change(within(dialog).getByLabelText('To'), {
      target: { value: '2026-09-30' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create payout' })
    );
    expect(await within(dialog).findByText('Choose an academy.')).toBeTruthy();
    expect(createMutate).not.toHaveBeenCalled();
  });

  it('sends whole-day UTC bounds and reports "nothing owed" for an empty result', async () => {
    createMutate.mockImplementation(
      (_payload: unknown, options?: { onSuccess?: (data: unknown) => void }) =>
        options?.onSuccess?.([])
    );
    const dialog = openCreate();
    chooseAcademy(dialog);
    fireEvent.change(within(dialog).getByLabelText('From'), {
      target: { value: '2026-09-01' },
    });
    fireEvent.change(within(dialog).getByLabelText('To'), {
      target: { value: '2026-09-30' },
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Create payout' })
    );

    await waitFor(() => expect(createMutate).toHaveBeenCalledTimes(1));
    expect(createMutate.mock.calls[0]?.[0]).toEqual({
      academyId: 'academy-1',
      periodStart: '2026-09-01T00:00:00.000Z',
      periodEnd: '2026-09-30T23:59:59.999Z',
    });
    expect(await within(dialog).findByText(/Nothing to pay out/)).toBeTruthy();
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
