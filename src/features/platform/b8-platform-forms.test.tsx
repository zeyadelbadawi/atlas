/**
 * B8 (UX audit) — the Platform Owner's forms check what the server checks
 * and say what is wrong, on the field, in the page's language.
 *
 * Pinned here:
 *   - V04/V09/V10/V23/V28 plan editor: price 1–1,000,000 (0, -500, 2.5,
 *     "abc" refused, never sent as null), Arabic digits read as digits,
 *     yearly not below monthly, trial 1–365, limits whole and ≥ 0 or the
 *     Unlimited switch (no English word to type, in Arabic too);
 *   - V07 the server's violations (atlas-backend#108 paths) land on their
 *     fields, named by their label in the page's language;
 *   - V08 a save says what it did;
 *   - V05 change plan needs a plan, and a 409 "archived" lands on it;
 *   - V06 `errors:conflict` (a group) never prints "returned an object";
 *   (V23 trial policy and V29 commission: their own features' b8 tests.)
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
import { createApiError } from '@api';
import type { ApiError } from '@api';
import type { Plan } from '@types';

globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

const updateMutateAsync = vi.fn();
const adjustMutate = vi.fn();
const notifySuccess = vi.fn();
const errors: { update: ApiError | null; adjust: ApiError | null } = {
  update: null,
  adjust: null,
};

vi.mock('./hooks/usePlatformPlans', () => ({
  useUpdatePlan: () => ({
    mutateAsync: updateMutateAsync,
    isPending: false,
    error: errors.update,
    reset: vi.fn(),
  }),
  usePreviewLimitImpact: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
}));
vi.mock('./hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useSubscriptionAdjustment: () => ({
    mutate: adjustMutate,
    isPending: false,
    error: errors.adjust,
  }),
}));
vi.mock('@features/tenant', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePlanCatalog: () => ({ data: [{ key: 'academy' }] }),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useToast: () => ({ notifySuccess, notifyError: vi.fn() }),
  useConfirmDialog: () => ({ confirm: vi.fn(() => Promise.resolve(true)) }),
}));

const { PlanEditorDialog } = await import('./components/PlanEditorDialog');
const { SubscriptionAdjustmentsCard } =
  await import('./components/SubscriptionAdjustmentsCard');

const LIMITS = {
  academies: 1,
  instructors: 2,
  staff: 2,
  students: 20,
  courses: 5,
  generalStorage: 2,
  videoStorage: 2,
  recordedSessions: 3,
};

const PLAN = {
  id: 'p-growth',
  key: 'growth',
  name: 'Growth',
  version: 3,
  limits: LIMITS,
  features: {},
  pricing: { amount: 100, currency: 'EGP', billingCycle: 'monthly' },
  trialEligible: true,
  trialDurationDays: 14,
} as unknown as Plan;

function renderEditor(language: 'en' | 'ar' = 'en', plan: Plan = PLAN) {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <PlanEditorDialog plan={plan} onOpenChange={vi.fn()} />
    </I18nextProvider>
  );
}

const input = (testId: string) =>
  screen.getByTestId(testId) as HTMLInputElement;
const type = (testId: string, value: string) =>
  fireEvent.change(input(testId), { target: { value } });
const save = () => fireEvent.click(screen.getByTestId('plan-save'));

beforeEach(() => {
  updateMutateAsync.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  errors.update = null;
  errors.adjust = null;
});

describe('V04 — the price is checked as the server checks it', () => {
  it.each(['-500', '0', '1190.50', '99999999999', 'abc'])(
    '%s is refused with the range named, and nothing is sent',
    async (value) => {
      renderEditor();
      type('plan-amount', value);
      save();
      const error = await screen.findByTestId('plan-amount-error');
      expect(error.textContent).toBe(
        'Price must be a whole number from 1 to 1,000,000.'
      );
      expect(input('plan-amount').getAttribute('aria-invalid')).toBe('true');
      expect(updateMutateAsync).not.toHaveBeenCalled();
    }
  );

  it('reads Arabic digits as the number they are', async () => {
    renderEditor();
    type('plan-amount', '١٢٠');
    save();
    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    expect(updateMutateAsync.mock.calls[0][0].payload.pricing.amount).toBe(120);
  });

  it('refuses a three-letter code that is not one', async () => {
    renderEditor();
    type('plan-currency', 'E1');
    save();
    expect(
      (await screen.findByTestId('plan-currency-error')).textContent
    ).toContain('three-letter currency code');
  });
});

describe('V09 — yearly price and trial length', () => {
  it('a yearly price below one month is refused, naming the floor', async () => {
    renderEditor();
    type('plan-yearly-amount', '50');
    save();
    expect(
      (await screen.findByTestId('plan-yearly-amount-error')).textContent
    ).toMatch(/can't be lower than one month's price \(.*100.*\)/);
    expect(updateMutateAsync).not.toHaveBeenCalled();
  });

  it.each(['0', '-3', '1000', 'abc'])(
    'a trial of %s days is refused with 1–365',
    async (value) => {
      renderEditor();
      type('plan-trial-days', value);
      save();
      expect(
        (await screen.findByTestId('plan-trial-days-error')).textContent
      ).toBe('Trial length (days) must be a whole number from 1 to 365.');
    }
  );
});

describe('V10 — limits are whole numbers or Unlimited', () => {
  it.each(['-1', '2.5', 'lots'])(
    '%s says what a limit can be (not "fill in the empty fields")',
    async (value) => {
      renderEditor();
      type('plan-limit-students', value);
      save();
      expect(
        (await screen.findByTestId('plan-limit-students-error')).textContent
      ).toBe('Enter a whole number of 0 or more, or choose Unlimited.');
      expect(updateMutateAsync).not.toHaveBeenCalled();
    }
  );

  it('an empty limit is required, by its name', async () => {
    renderEditor();
    type('plan-limit-courses', '');
    save();
    expect(
      (await screen.findByTestId('plan-limit-courses-error')).textContent
    ).toBe('Courses is required');
  });

  it('the Unlimited switch sends "unlimited" — no word to type, in Arabic too', async () => {
    renderEditor('ar');
    expect(screen.getAllByText('غير محدود').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByTestId('plan-limit-students-unlimited'));
    expect(input('plan-limit-students').disabled).toBe(true);
    save();
    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    expect(updateMutateAsync.mock.calls[0][0].payload.limits.students).toBe(
      'unlimited'
    );
  });

  it('storage limits name their unit', () => {
    renderEditor();
    expect(screen.getByLabelText('General storage (GB)')).toBeTruthy();
  });

  it('monthly emails "abc" gets a message (not just a red help text)', async () => {
    renderEditor();
    type('plan-limit-monthlyEmails', 'abc');
    save();
    expect(
      (await screen.findByTestId('plan-limit-monthlyEmails-error')).textContent
    ).toBe('Enter a whole number of 0 or more, or choose Unlimited.');
  });

  it('Arabic messages name the Arabic field', async () => {
    renderEditor('ar');
    type('plan-amount', '0');
    save();
    expect(
      (await screen.findByTestId('plan-amount-error')).textContent
    ).toContain('السعر');
  });
});

describe('V07 — server violations land on their fields, by their label', () => {
  it.each([
    [
      'pricing.amount',
      'validation:integerRange',
      { min: 1, max: 1000000 },
      'plan-amount-error',
      'Price must be a whole number from 1 to 1,000,000.',
    ],
    [
      'pricing.yearlyAmount',
      'errors.plan.yearlyBelowMonthly',
      { min: 100 },
      'plan-yearly-amount-error',
      "The yearly price can't be lower than one month's price (100).",
    ],
    [
      'trialDurationDays',
      'validation:integerRange',
      { min: 1, max: 365 },
      'plan-trial-days-error',
      'Trial length (days) must be a whole number from 1 to 365.',
    ],
    [
      'limits.students',
      'errors.plan.limitValue',
      { min: 0 },
      'plan-limit-students-error',
      'Enter a whole number of 0 or more, or choose Unlimited.',
    ],
  ])('%s → its field', async (field, messageKey, values, testId, text) => {
    errors.update = createApiError('validation', {
      messageKey: 'errors.validation.failed',
      violations: [{ field, messageKey, values }],
    });
    renderEditor();
    expect((await screen.findByTestId(testId)).textContent).toBe(text);
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('in Arabic, the label is Arabic (never "Max courses")', async () => {
    errors.update = createApiError('validation', {
      messageKey: 'errors.validation.failed',
      violations: [
        {
          field: 'pricing.amount',
          messageKey: 'validation:integerRange',
          values: { min: 1, max: 1000000 },
        },
      ],
    });
    renderEditor('ar');
    const text = (await screen.findByTestId('plan-amount-error')).textContent;
    expect(text).toContain('السعر');
    expect(text).not.toMatch(/[A-Za-z]/);
  });
});

describe('V08 — a save says what it did', () => {
  it('a price change says paying organizations are being emailed', async () => {
    renderEditor();
    type('plan-amount', '150');
    save();
    await waitFor(() => expect(notifySuccess).toHaveBeenCalled());
    expect(notifySuccess).toHaveBeenCalledWith(
      'platform:planAdmin.editor.savedTitle',
      'platform:planAdmin.editor.savedNotified',
      { plan: 'Growth' }
    );
  });

  it('a trial-only change says nobody was emailed', async () => {
    renderEditor();
    type('plan-trial-days', '30');
    save();
    await waitFor(() => expect(notifySuccess).toHaveBeenCalled());
    expect(notifySuccess.mock.calls[0][1]).toBe(
      'platform:planAdmin.editor.savedCatalogOnly'
    );
  });
});

describe('V05 — change plan', () => {
  function renderCard() {
    return render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <SubscriptionAdjustmentsCard
          organizationId="org-1"
          subscription={
            {
              status: 'active',
              billingCycle: 'monthly',
              plan: PLAN,
            } as never
          }
        />
      </I18nextProvider>
    );
  }

  it('needs a plan, says so on the field, and shows the current plan and price', async () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Change plan' }));
    expect(screen.getByTestId('adjust-current-plan').textContent).toMatch(
      /Growth.*100.*per month/
    );
    expect(screen.getByTestId('adjust-plan-effect').textContent).toContain(
      'No payment is taken'
    );
    fireEvent.change(screen.getByLabelText(/^Reason/), {
      target: { value: 'Founding academy pilot agreed' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(
      await screen.findByText('Choose the plan to move this organization to.')
    ).toBeTruthy();
    expect(adjustMutate).not.toHaveBeenCalled();
  });

  it('a 409 "archived plan" lands on the plan field, not in an alert', async () => {
    // The refusal arrives after the dialog is open, as it does for real.
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Change plan' }));
    errors.adjust = createApiError('conflict', {
      messageKey: 'errors.platform.subscriptionAdjustment.planArchived',
      violations: [
        {
          field: 'planKey',
          messageKey: 'errors.platform.subscriptionAdjustment.planArchived',
        },
      ],
    });
    fireEvent.click(screen.getByLabelText('At the end of the paid period'));
    expect(await screen.findByText(/That plan is archived/)).toBeTruthy();
    expect(
      screen.getByLabelText(/^Plan key/).getAttribute('aria-invalid')
    ).toBe('true');
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('a 400 unknown plan lands on the plan field', async () => {
    // The refusal arrives after the dialog is open, as it does for real.
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Change plan' }));
    errors.adjust = createApiError('validation', {
      messageKey: 'errors.validation.failed',
      violations: [
        {
          field: 'planKey',
          messageKey: 'errors.platform.subscriptionAdjustment.planNotFound',
        },
      ],
    });
    fireEvent.click(screen.getByLabelText('At the end of the paid period'));
    expect(await screen.findByText(/No plan has this key/)).toBeTruthy();
  });
});

describe('V06 — a group key never prints "returned an object"', () => {
  it('errors:conflict reads its sentence, in both languages', () => {
    for (const language of ['en', 'ar'] as const) {
      const i18n = createI18nInstance(language);
      const text = i18n.t('errors:conflict');
      expect(typeof text).toBe('string');
      expect(text).not.toMatch(/returned an object/);
      expect(text).toBe(i18n.t('errors:conflict.description'));
    }
  });

  it('a group without a description falls back to its title', () => {
    const i18n = createI18nInstance('en');
    i18n.addResourceBundle(
      'en',
      'errors',
      { b8OnlyTitle: { title: 'Only a title' } },
      true,
      false
    );
    expect(i18n.t('errors:b8OnlyTitle')).toBe('Only a title');
  });
});
