/**
 * Plan management — the New plan dialog (`POST platform-plans`).
 *
 * Pinned here: the key is checked live as a slug (lowercase words joined by
 * single hyphens, ≤ 60); an Arabic name or description is capped at 200 and
 * an Arabic description caps the English one at 200 too (500 without it);
 * the payload is created HIDDEN (`displayOrder: 0`), copies the chosen
 * plan's limits, features, trial and gifts, prices in EGP and only offers
 * non-archived plans to start from; a server violation lands on its field
 * (`nameLocalized.ar` → the Arabic name) and a taken key (409) on the key
 * field; a success says so and hands the new plan to the page (which opens
 * the editor).
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
import { createI18nInstance } from '@/localization/i18n';
import { AtlasDialogProvider } from '@app/providers/dialog/DialogProvider';
import { createApiError } from '@api';
import type { ApiError } from '@api';
import type { PlatformPlanRow } from '@types';

globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

const state = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  error: null as ApiError | null,
  notifySuccess: vi.fn(),
}));

const source = (over: Partial<PlatformPlanRow> = {}): PlatformPlanRow =>
  ({
    id: 'p-growth',
    key: 'growth',
    name: 'Growth',
    status: 'active',
    displayOrder: 2,
    version: 3,
    limits: {
      academies: 3,
      instructors: 10,
      staff: 5,
      students: 'unlimited',
      courses: 50,
      generalStorage: 20,
      videoStorage: 200,
      recordedSessions: 30,
      monthlyEmails: 500,
    },
    // A legacy key is never copied.
    features: { liveSessions: true, cms: true },
    trialEligible: true,
    trialDurationDays: 14,
    giftedDaysMonthly: 7,
    giftedDaysYearly: 10,
    subscribers: { paying: 0, trialing: 0, scheduledIn: 0, foundingLocks: 0 },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over,
  }) as unknown as PlatformPlanRow;

vi.mock('../hooks/usePlatformPlans', () => ({
  useCreatePlan: () => ({
    mutateAsync: state.mutateAsync,
    isPending: false,
    error: state.error,
    reset: vi.fn(),
  }),
  usePlatformPlanList: () => ({
    data: {
      items: [
        source(),
        source({
          id: 'p-old',
          key: 'old-plan',
          name: 'Old',
          status: 'archived',
        }),
      ],
      pagination: { page: 1, pageSize: 100, totalItems: 2, totalPages: 1 },
    },
    isLoading: false,
  }),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useToast: () => ({
    notifySuccess: state.notifySuccess,
    notifyError: vi.fn(),
  }),
}));
vi.mock('@/components/ui/select', () => import('../__tests__/select-mock'));

const { CreatePlanDialog } = await import('./CreatePlanDialog');

function renderDialog(
  props: { onCreated?: () => void; onOpenChange?: () => void } = {},
  language: 'en' | 'ar' = 'en'
) {
  const onCreated = props.onCreated ?? vi.fn();
  const onOpenChange = props.onOpenChange ?? vi.fn();
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <AtlasDialogProvider>
        <CreatePlanDialog
          open
          onOpenChange={onOpenChange}
          onCreated={onCreated}
        />
      </AtlasDialogProvider>
    </I18nextProvider>
  );
  return { onCreated, onOpenChange };
}

const type = (testId: string, value: string) =>
  fireEvent.change(screen.getByTestId(testId), { target: { value } });

function fillValid() {
  type('create-plan-key', 'growth-2027');
  type('create-plan-name-en', 'Growth 2027');
  type('create-plan-name-ar', 'النمو 2027');
  type('create-plan-description-en', 'For growing academies');
  type('create-plan-description-ar', 'للأكاديميات النامية');
  fireEvent.change(screen.getByTestId('create-plan-family'), {
    target: { value: 'premium' },
  });
  fireEvent.change(screen.getByTestId('create-plan-tier'), {
    target: { value: 'growth' },
  });
  fireEvent.change(screen.getByTestId('create-plan-source'), {
    target: { value: 'growth' },
  });
  type('create-plan-amount', '١٥٠٠');
  type('create-plan-yearly-amount', '15000');
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.error = null;
});

describe('CreatePlanDialog', () => {
  it('checks the key as a slug while it is typed', async () => {
    renderDialog();
    type('create-plan-key', 'Growth 2027');
    expect(
      (await screen.findByTestId('create-plan-key-error')).textContent
    ).toBe(
      'Use lowercase letters and numbers, with single hyphens between words (like growth-2027).'
    );
    type('create-plan-key', 'growth--2027');
    await screen.findByTestId('create-plan-key-error');
    type('create-plan-key', 'a'.repeat(61));
    await waitFor(() =>
      expect(screen.getByTestId('create-plan-key-error').textContent).toBe(
        'Key must be 60 characters or fewer'
      )
    );
    type('create-plan-key', 'growth-2027');
    await waitFor(() =>
      expect(screen.queryByTestId('create-plan-key-error')).toBeNull()
    );
    expect(screen.getByTestId('create-plan-key').getAttribute('dir')).toBe(
      'ltr'
    );
  });

  it('caps Arabic text at 200, and the English description at 200 beside an Arabic one', async () => {
    renderDialog();
    type('create-plan-name-ar', 'ا'.repeat(201));
    expect(
      (await screen.findByTestId('create-plan-name-ar-error')).textContent
    ).toBe('Name (Arabic, optional) must be 200 characters or fewer');

    type('create-plan-description-en', 'a'.repeat(250));
    // No Arabic description: 500 is the English limit.
    await waitFor(() =>
      expect(
        screen.queryByTestId('create-plan-description-en-error')
      ).toBeNull()
    );
    type('create-plan-description-ar', 'وصف');
    expect(
      (await screen.findByTestId('create-plan-description-en-error'))
        .textContent
    ).toBe('Description (English) must be 200 characters or fewer');
    expect(
      screen.getByTestId('create-plan-description-en-count').textContent
    ).toBe('250 / 200 characters');
  });

  it('only offers non-archived plans to start from, and shows EGP read-only', () => {
    renderDialog();
    const select = screen.getByTestId('create-plan-source');
    const options = within(select).getAllByRole('option');
    expect(options.map((option) => option.getAttribute('value'))).toEqual([
      'growth',
    ]);
    const currency = screen.getByTestId(
      'create-plan-currency'
    ) as HTMLInputElement;
    expect(currency.readOnly).toBe(true);
    expect(currency.value).toBe('Egyptian pound (EGP)');
    expect(screen.getByTestId('create-plan-addons-note').textContent).toContain(
      'compatible plans'
    );
  });

  it('creates the plan hidden, copying the starting plan, then hands it to the page', async () => {
    const created = source({
      id: 'p-new',
      key: 'growth-2027',
      name: 'Growth 2027',
      displayOrder: 0,
    });
    state.mutateAsync.mockResolvedValue(created);
    const { onCreated, onOpenChange } = renderDialog();
    fillValid();
    fireEvent.click(screen.getByTestId('create-plan-submit'));

    await waitFor(() => expect(state.mutateAsync).toHaveBeenCalledTimes(1));
    expect(state.mutateAsync.mock.calls[0][0]).toEqual({
      key: 'growth-2027',
      name: 'Growth 2027',
      description: 'For growing academies',
      nameLocalized: { en: 'Growth 2027', ar: 'النمو 2027' },
      descriptionLocalized: {
        en: 'For growing academies',
        ar: 'للأكاديميات النامية',
      },
      displayOrder: 0,
      limits: {
        academies: 3,
        instructors: 10,
        staff: 5,
        students: 'unlimited',
        courses: 50,
        generalStorage: 20,
        videoStorage: 200,
        recordedSessions: 30,
        monthlyEmails: 500,
      },
      features: { liveSessions: true },
      trialEligible: true,
      trialDurationDays: 14,
      giftedDaysMonthly: 7,
      giftedDaysYearly: 10,
      pricing: {
        amount: 1500,
        currency: 'EGP',
        billingCycle: 'monthly',
        yearlyAmount: 15000,
      },
      family: 'premium',
      tier: 'growth',
    });
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(state.notifySuccess).toHaveBeenCalledWith(
      'platform:planAdmin.create.createdTitle',
      'platform:planAdmin.create.createdDescription',
      { plan: 'Growth 2027' }
    );
  });

  it('leaves out the Arabic text, tier and yearly price when they are empty', async () => {
    state.mutateAsync.mockResolvedValue(source({ key: 'solo' }));
    renderDialog();
    type('create-plan-key', 'solo');
    type('create-plan-name-en', 'Solo');
    type('create-plan-description-en', 'One teacher');
    fireEvent.change(screen.getByTestId('create-plan-source'), {
      target: { value: 'growth' },
    });
    type('create-plan-amount', '300');
    fireEvent.click(screen.getByTestId('create-plan-submit'));
    await waitFor(() => expect(state.mutateAsync).toHaveBeenCalledTimes(1));
    const payload = state.mutateAsync.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(payload.displayOrder).toBe(0);
    expect(payload.family).toBe('normal');
    expect(payload).not.toHaveProperty('tier');
    expect(payload).not.toHaveProperty('nameLocalized');
    expect(payload).not.toHaveProperty('descriptionLocalized');
    expect(payload.pricing).toEqual({
      amount: 300,
      currency: 'EGP',
      billingCycle: 'monthly',
    });
  });

  it('refuses to send without a plan to start from or a price', async () => {
    renderDialog();
    type('create-plan-key', 'solo');
    type('create-plan-name-en', 'Solo');
    type('create-plan-description-en', 'One teacher');
    type('create-plan-yearly-amount', '10');
    type('create-plan-amount', '300');
    fireEvent.click(screen.getByTestId('create-plan-submit'));
    expect(
      (await screen.findByTestId('create-plan-source-error')).textContent
    ).toBe('Choose the plan to start from.');
    expect(
      screen.getByTestId('create-plan-yearly-amount-error').textContent
    ).toContain('lower than one month');
    expect(state.mutateAsync).not.toHaveBeenCalled();
  });

  it('puts a taken key (409) on the key field, not in a generic alert', async () => {
    state.error = createApiError('conflict', {
      status: 409,
      messageKey: 'errors.plan.keyTaken',
    });
    renderDialog();
    expect(
      (await screen.findByTestId('create-plan-key-error')).textContent
    ).toBe('Another plan already uses this key. Choose a different one.');
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('puts a server violation on its field (nameLocalized.ar → Arabic name)', async () => {
    state.error = createApiError('validation', {
      status: 400,
      messageKey: 'errors.validation.failed',
      violations: [
        {
          field: 'nameLocalized.ar',
          messageKey: 'validation:maxLength',
          values: { count: 200 },
        },
      ],
    });
    renderDialog();
    expect(
      (await screen.findByTestId('create-plan-name-ar-error')).textContent
    ).toBe('Name (Arabic, optional) must be 200 characters or fewer');
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('shows any other refusal once, inline', () => {
    state.error = createApiError('server', { status: 500 });
    renderDialog();
    expect(screen.getByTestId('save-failed').textContent).toContain(
      'The plan wasn’t created'
    );
  });

  it('renders in Arabic with no raw keys', () => {
    renderDialog({}, 'ar');
    const dialog = screen.getByTestId('create-plan-dialog');
    expect(dialog.textContent).not.toMatch(/platform:|planAdmin\./);
    expect(dialog.textContent).toMatch(/[؀-ۿ]/);
  });
});
