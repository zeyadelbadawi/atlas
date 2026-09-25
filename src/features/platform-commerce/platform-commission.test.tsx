/**
 * Commission settings — percent in the UI, integer basis points on the wire.
 *
 * Pinned here: the global default renders its current rate or "Not set",
 * saves only after confirmation and sends `12.5` as `1250` bp; out-of-range
 * input never reaches the API; plan rows render the catalog with their
 * override or "Uses global default"; the organization card sends a custom
 * rate only in `custom` mode (the backend requires it exactly then).
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
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import type { OrganizationCommission, Plan } from '@types';

const useGlobalCommission = vi.fn();
const usePlanCommission = vi.fn();
const useOrganizationCommission = vi.fn();
const globalMutate = vi.fn();
const planMutate = vi.fn();
const orgMutate = vi.fn();
const usePlanCatalog = vi.fn();
const confirm = vi.fn<(request: unknown) => Promise<boolean>>();
const refetch = vi.fn();
const idle = { isPending: false, error: null, reset: vi.fn() };

// jsdom has no ResizeObserver; Radix RadioGroup measures its items with one.
globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

vi.mock('./hooks', () => ({
  useGlobalCommission: () => useGlobalCommission() as unknown,
  useUpdateGlobalCommission: () => ({ ...idle, mutate: globalMutate }),
  usePlanCommission: (key: string) => usePlanCommission(key) as unknown,
  useUpdatePlanCommission: () => ({ ...idle, mutate: planMutate }),
  useOrganizationCommission: (id: string) =>
    useOrganizationCommission(id) as unknown,
  useUpdateOrganizationCommission: () => ({ ...idle, mutate: orgMutate }),
}));

vi.mock('@features/tenant', () => ({
  usePlanCatalog: () => usePlanCatalog() as unknown,
  resolvePlanName: (plan: Plan) => plan.name,
}));

vi.mock('@app/providers', () => ({
  useConfirmDialog: () => ({ confirm }),
  useToast: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}));

const { default: CommissionPage } =
  await import('./pages/PlatformCommissionPage');
const { OrganizationCommissionCard } =
  await import('./components/OrganizationCommissionCard');

function renderWithProviders(ui: JSX.Element, language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter>{ui}</MemoryRouter>
    </I18nextProvider>
  );
}

const plans = [
  { id: 'p1', key: 'starter', name: 'Starter' },
  { id: 'p2', key: 'growth', name: 'Growth' },
] as unknown as Plan[];

beforeEach(() => {
  confirm.mockResolvedValue(true);
  useGlobalCommission.mockReturnValue({
    data: {
      defaultCommissionBasisPoints: 1000,
      updatedAt: '2026-09-01T00:00:00Z',
    },
    isLoading: false,
    error: null,
    refetch,
  });
  usePlanCatalog.mockReturnValue({
    data: plans,
    isLoading: false,
    error: null,
    refetch,
  });
  usePlanCommission.mockImplementation((key: string) => ({
    data: {
      planKey: key,
      commissionBasisPoints: key === 'growth' ? 750 : null,
      updatedAt: null,
    },
    isLoading: false,
    error: null,
    refetch,
  }));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PlatformCommissionPage', () => {
  it('renders the global default and each plan with its override', () => {
    const { container } = renderWithProviders(<CommissionPage />);
    expect(screen.getByText('10%')).toBeTruthy();
    expect(screen.getByText('Starter')).toBeTruthy();
    expect(screen.getByText('Uses global default')).toBeTruthy();
    expect(screen.getByText('7.5%')).toBeTruthy();
    expect(container.textContent).not.toMatch(/platformCommerce:/);
  });

  it('shows "Not set" when no global default exists yet', () => {
    useGlobalCommission.mockReturnValue({
      data: {
        defaultCommissionBasisPoints: null,
        updatedAt: '2026-09-01T00:00:00Z',
      },
      isLoading: false,
      error: null,
      refetch,
    });
    renderWithProviders(<CommissionPage />);
    expect(screen.getByText('Not set')).toBeTruthy();
  });

  it('saves the global default as basis points only after confirmation', async () => {
    renderWithProviders(<CommissionPage />);
    const input = screen.getAllByLabelText(
      'Commission rate (%)'
    )[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: '12.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save default' }));

    await waitFor(() => expect(globalMutate).toHaveBeenCalledTimes(1));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(globalMutate.mock.calls[0]?.[0]).toEqual({
      defaultCommissionBasisPoints: 1250,
    });
  });

  it('sends nothing when the confirmation is dismissed', async () => {
    confirm.mockResolvedValue(false);
    renderWithProviders(<CommissionPage />);
    fireEvent.change(
      screen.getAllByLabelText('Commission rate (%)')[0] as HTMLInputElement,
      {
        target: { value: '12' },
      }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save default' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(globalMutate).not.toHaveBeenCalled();
  });

  it('rejects an out-of-range rate before anything is sent', async () => {
    renderWithProviders(<CommissionPage />);
    fireEvent.change(
      screen.getAllByLabelText('Commission rate (%)')[0] as HTMLInputElement,
      {
        target: { value: '150' },
      }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save default' }));
    expect(
      await screen.findByText('Enter a rate between 0 and 100.')
    ).toBeTruthy();
    expect(confirm).not.toHaveBeenCalled();
    expect(globalMutate).not.toHaveBeenCalled();
  });

  it('edits a plan rate through its dialog', async () => {
    renderWithProviders(<CommissionPage />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Edit the commission for Starter' })
    );
    const dialog = screen.getByRole('dialog');
    const input = dialog.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save rate' }));
    await waitFor(() => expect(planMutate).toHaveBeenCalledTimes(1));
    expect(planMutate.mock.calls[0]?.[0]).toEqual({
      planKey: 'starter',
      payload: { commissionBasisPoints: 500 },
    });
  });

  it('shows a retryable error when the global default fails to load', () => {
    useGlobalCommission.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
      refetch,
    });
    renderWithProviders(<CommissionPage />);
    fireEvent.click(screen.getByRole('button', { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('renders in Arabic with no missing keys', () => {
    const { container } = renderWithProviders(<CommissionPage />, 'ar');
    expect(container.textContent).toMatch(/العمولة/);
    expect(container.textContent).not.toMatch(/platformCommerce:/);
  });
});

describe('OrganizationCommissionCard', () => {
  const commission: OrganizationCommission = {
    organizationId: 'org-1',
    commissionMode: 'default',
    customPercentageBasisPoints: null,
    planCommissionBasisPoints: 750,
    effective: { resolved: true, basisPoints: 750, source: 'plan' },
  };

  beforeEach(() => {
    useOrganizationCommission.mockReturnValue({
      data: commission,
      isLoading: false,
      error: null,
      refetch,
    });
  });

  it('shows the rate in force and where it comes from', () => {
    renderWithProviders(<OrganizationCommissionCard organizationId="org-1" />);
    expect(screen.getByText('7.5% — plan rate')).toBeTruthy();
  });

  it('sends a custom rate in basis points after confirmation', async () => {
    renderWithProviders(<OrganizationCommissionCard organizationId="org-1" />);
    fireEvent.click(screen.getByRole('radio', { name: 'Custom rate' }));
    fireEvent.change(await screen.findByLabelText('Commission rate (%)'), {
      target: { value: '3.25' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save commission' }));
    await waitFor(() => expect(orgMutate).toHaveBeenCalledTimes(1));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(orgMutate.mock.calls[0]?.[0]).toEqual({
      organizationId: 'org-1',
      payload: { commissionMode: 'custom', customPercentageBasisPoints: 325 },
    });
  });

  it('requires a rate in custom mode', async () => {
    renderWithProviders(<OrganizationCommissionCard organizationId="org-1" />);
    fireEvent.click(screen.getByRole('radio', { name: 'Custom rate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save commission' }));
    expect(await screen.findByText('Enter a rate.')).toBeTruthy();
    expect(orgMutate).not.toHaveBeenCalled();
  });

  it('sends no rate when exempting the organization', async () => {
    renderWithProviders(<OrganizationCommissionCard organizationId="org-1" />);
    fireEvent.click(screen.getByRole('radio', { name: 'Exempt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save commission' }));
    await waitFor(() => expect(orgMutate).toHaveBeenCalledTimes(1));
    expect(orgMutate.mock.calls[0]?.[0]).toEqual({
      organizationId: 'org-1',
      payload: { commissionMode: 'exempt' },
    });
  });
});
