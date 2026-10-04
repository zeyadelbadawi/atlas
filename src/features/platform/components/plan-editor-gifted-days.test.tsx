/**
 * W8 — plan editor: gifted setup days per billing cycle.
 *
 * Pinned here: the fields prefill from the plan; 5..15 are sent as numbers;
 * blank and 0 are sent as null (no gift); anything else shows an inline,
 * announced error and blocks saving. The server re-validates the same range.
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
import type { Plan } from '@types';
import {
  giftedDaysInputToPayload,
  isValidGiftedDaysInput,
} from '../utils/gifted-days.utils';
import { withUneditedLimits } from '../utils/plan-limit-changes.utils';

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

const planWith = (gift: {
  giftedDaysMonthly: number | null;
  giftedDaysYearly: number | null;
}): Plan =>
  ({
    id: 'p-growth',
    key: 'growth',
    name: 'Growth',
    version: 3,
    limits: {},
    features: {},
    pricing: { amount: 79, currency: 'USD', billingCycle: 'monthly' },
    trialEligible: false,
    trialDurationDays: null,
    ...gift,
  }) as unknown as Plan;

function renderEditor(plan: Plan, language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <PlanEditorDialog plan={plan} onOpenChange={vi.fn()} />
    </I18nextProvider>
  );
}

const field = async (id: string) =>
  (await screen.findByTestId(id)) as HTMLInputElement;
const saveButton = () => screen.getByTestId('plan-save') as HTMLButtonElement;

beforeEach(() => {
  updateMutateAsync.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('gifted-days input rules', () => {
  it.each(['', '0', '5', '10', '15', ' 7 '])('accepts %j', (value) => {
    expect(isValidGiftedDaysInput(value)).toBe(true);
  });

  it.each(['4', '16', '7.5', '-5', 'abc', '1e1'])('rejects %j', (value) => {
    expect(isValidGiftedDaysInput(value)).toBe(false);
  });

  it('maps blank and 0 to null (no gift)', () => {
    expect(giftedDaysInputToPayload('')).toBeNull();
    expect(giftedDaysInputToPayload('0')).toBeNull();
    expect(giftedDaysInputToPayload('14')).toBe(14);
  });
});

describe('PlanEditorDialog — gifted setup days', () => {
  it('prefills both cycles and sends edited values', async () => {
    renderEditor(planWith({ giftedDaysMonthly: 7, giftedDaysYearly: 14 }));
    const monthly = await field('plan-gifted-monthly');
    const yearly = await field('plan-gifted-yearly');
    expect(monthly.value).toBe('7');
    expect(yearly.value).toBe('14');
    // Labelled inputs, not placeholder-only.
    expect(screen.getByLabelText('Monthly billing')).toBe(monthly);
    expect(screen.getByLabelText('Yearly billing')).toBe(yearly);

    fireEvent.change(monthly, { target: { value: '10' } });
    fireEvent.click(saveButton());

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    expect(updateMutateAsync.mock.calls[0][0].payload).toMatchObject({
      expectedVersion: 3,
      giftedDaysMonthly: 10,
      giftedDaysYearly: 14,
    });
  });

  it('sends null when a field is cleared or set to 0', async () => {
    renderEditor(planWith({ giftedDaysMonthly: 7, giftedDaysYearly: 14 }));
    fireEvent.change(await field('plan-gifted-monthly'), {
      target: { value: '' },
    });
    fireEvent.change(await field('plan-gifted-yearly'), {
      target: { value: '0' },
    });
    fireEvent.click(saveButton());

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    expect(updateMutateAsync.mock.calls[0][0].payload).toMatchObject({
      giftedDaysMonthly: null,
      giftedDaysYearly: null,
    });
  });

  it.each(['4', '16'])(
    'shows an inline error for %s and blocks saving',
    async (value) => {
      renderEditor(
        planWith({ giftedDaysMonthly: null, giftedDaysYearly: null })
      );
      const monthly = await field('plan-gifted-monthly');
      expect(monthly.value).toBe('');
      fireEvent.change(monthly, { target: { value } });

      const error = screen.getByTestId('plan-gifted-monthly-error');
      expect(error.textContent).toContain('5');
      expect(error.textContent).toContain('15');
      expect(error.getAttribute('role')).toBe('alert');
      expect(monthly.getAttribute('aria-invalid')).toBe('true');
      expect(monthly.getAttribute('aria-describedby')).toContain(
        'plan-gifted-monthly-error'
      );
      expect(saveButton().disabled).toBe(true);
      fireEvent.click(saveButton());
      expect(updateMutateAsync).not.toHaveBeenCalled();
    }
  );

  it('renders Arabic copy', async () => {
    renderEditor(
      planWith({ giftedDaysMonthly: 7, giftedDaysYearly: 14 }),
      'ar'
    );
    await field('plan-gifted-monthly');
    expect(screen.getByText('أيام الإعداد المُهداة')).toBeTruthy();
    expect(screen.getByLabelText('الفوترة الشهرية')).toBeTruthy();
  });
});

describe('PlanEditorDialog — limits the editor has no field for', () => {
  const fullLimits = {
    academies: 1,
    students: 20,
    instructors: 2,
    staff: 2,
    courses: 5,
    generalStorage: 2,
    videoStorage: 2,
    videoStorageMinutes: 500,
    recordedSessions: 3,
  };

  it('carries unedited keys, lets edited keys win, and never resurrects excluded ones', () => {
    expect(
      withUneditedLimits(
        { academies: 3 } as never,
        { academies: 1, videoStorageMinutes: 500, monthlyEmails: 80 } as never,
        ['academies'],
        ['monthlyEmails']
      )
    ).toEqual({ academies: 3, videoStorageMinutes: 500 });
    expect(
      withUneditedLimits({ academies: 3 } as never, undefined, [])
    ).toEqual({ academies: 3 });
  });

  it('saves videoStorageMinutes unchanged (the API requires every limit)', async () => {
    renderEditor({
      ...planWith({ giftedDaysMonthly: null, giftedDaysYearly: null }),
      limits: fullLimits,
    } as unknown as Plan);
    fireEvent.change(await field('plan-gifted-monthly'), {
      target: { value: '7' },
    });
    fireEvent.click(saveButton());

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    const sent = updateMutateAsync.mock.calls[0][0].payload.limits;
    expect(sent.videoStorageMinutes).toBe(500);
    expect(sent.academies).toBe(1);
    expect(sent).not.toHaveProperty('monthlyEmails');
  });
});
