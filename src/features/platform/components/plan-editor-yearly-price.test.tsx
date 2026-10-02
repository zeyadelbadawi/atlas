/**
 * Plan editor — optional yearly price (2 Oct 2026).
 *
 * Pinned here: a monthly plan offers a "Yearly price" field; a value is
 * sent as `pricing.yearlyAmount`, an empty field omits it (no yearly
 * option); an invalid value blocks saving; a plan priced per year has no
 * such field.
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
import { createI18nInstance } from '@/localization/i18n';
import type { Plan, PlanPricingMetadata } from '@types';

const updateMutateAsync = vi.fn();

vi.mock('../hooks/usePlatformPlans', () => ({
  useUpdatePlan: () => ({
    mutateAsync: updateMutateAsync,
    isPending: false,
    error: null,
  }),
  usePreviewLimitImpact: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  }),
}));

const { PlanEditorDialog } = await import('./PlanEditorDialog');

const planWith = (pricing: PlanPricingMetadata): Plan =>
  ({
    id: 'p-growth',
    key: 'growth',
    name: 'Growth',
    version: 3,
    limits: {},
    features: {},
    pricing,
    trialEligible: false,
    trialDurationDays: null,
  }) as unknown as Plan;

function renderEditor(plan: Plan) {
  return render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <PlanEditorDialog plan={plan} onOpenChange={vi.fn()} />
    </I18nextProvider>
  );
}

beforeEach(() => {
  updateMutateAsync.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PlanEditorDialog — yearly price', () => {
  it('sends the yearly price beside the monthly one', async () => {
    renderEditor(
      planWith({ amount: 100, currency: 'USD', billingCycle: 'monthly' })
    );
    const field = (await screen.findByTestId(
      'plan-yearly-amount'
    )) as HTMLInputElement;
    expect(field.value).toBe('');
    fireEvent.change(field, { target: { value: '1000' } });
    fireEvent.click(screen.getByTestId('plan-save'));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    expect(updateMutateAsync.mock.calls[0][0].payload.pricing).toEqual({
      amount: 100,
      currency: 'USD',
      billingCycle: 'monthly',
      yearlyAmount: 1000,
    });
  });

  it('omits the yearly price when the field is cleared', async () => {
    renderEditor(
      planWith({
        amount: 100,
        currency: 'USD',
        billingCycle: 'monthly',
        yearlyAmount: 1000,
      })
    );
    const field = (await screen.findByTestId(
      'plan-yearly-amount'
    )) as HTMLInputElement;
    expect(field.value).toBe('1000');
    fireEvent.change(field, { target: { value: '' } });
    fireEvent.click(screen.getByTestId('plan-save'));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    expect(updateMutateAsync.mock.calls[0][0].payload.pricing).toEqual({
      amount: 100,
      currency: 'USD',
      billingCycle: 'monthly',
    });
  });

  it('blocks saving an invalid yearly price', async () => {
    renderEditor(
      planWith({ amount: 100, currency: 'USD', billingCycle: 'monthly' })
    );
    fireEvent.change(await screen.findByTestId('plan-yearly-amount'), {
      target: { value: '12.5' },
    });
    expect(screen.getByTestId('plan-yearly-amount-error')).toBeTruthy();
    expect(screen.getByTestId('plan-save')).toHaveProperty('disabled', true);
  });

  it('has no yearly price field for a plan priced per year', async () => {
    renderEditor(
      planWith({ amount: 900, currency: 'USD', billingCycle: 'yearly' })
    );
    await screen.findByTestId('plan-amount');
    expect(screen.queryByTestId('plan-yearly-amount')).toBeNull();
  });
});
