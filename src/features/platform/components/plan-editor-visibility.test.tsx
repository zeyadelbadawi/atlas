/**
 * Plan editor — Visibility (plan management, atlas-backend#112).
 *
 * Pinned here: "Show to customers" and the position map onto
 * `displayOrder` (hidden = 0); it is sent ONLY when it changed, so an
 * unrelated edit can never be refused for hiding the last listed plan;
 * switching a hidden plan on offers the next free position; a 409
 * `errors.plan.lastListedPlan` is the save-failed alert with its reason,
 * not "someone else changed it"; an archived plan says so and has no
 * visibility switch.
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
import { AtlasDialogProvider } from '@app/providers/dialog/DialogProvider';
import { createApiError } from '@api';
import type { ApiError } from '@api';
import type { Plan } from '@types';

globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

const state = vi.hoisted(() => ({
  update: vi.fn(),
  error: null as ApiError | null,
}));

vi.mock('../hooks/usePlatformPlans', () => ({
  useUpdatePlan: () => ({
    mutateAsync: state.update,
    isPending: false,
    error: state.error,
    reset: vi.fn(),
  }),
  usePreviewLimitImpact: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
  usePreviewPlanNotice: () => ({
    mutateAsync: vi.fn(() =>
      Promise.resolve({ subscribers: 0, recipients: 0 })
    ),
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useToast: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
}));

const { PlanEditorDialog } = await import('./PlanEditorDialog');

const planWith = (over: Partial<Plan>): Plan =>
  ({
    id: 'p-growth',
    key: 'growth',
    name: 'Growth',
    status: 'active',
    displayOrder: 2,
    version: 3,
    limits: {},
    features: {},
    pricing: { amount: 100, currency: 'EGP', billingCycle: 'monthly' },
    trialEligible: false,
    ...over,
  }) as unknown as Plan;

function renderEditor(plan: Plan, nextListedPosition?: number) {
  return render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <AtlasDialogProvider>
        <PlanEditorDialog
          plan={plan}
          nextListedPosition={nextListedPosition}
          onOpenChange={vi.fn()}
        />
      </AtlasDialogProvider>
    </I18nextProvider>
  );
}

const payload = () =>
  state.update.mock.calls[0][0].payload as Record<string, unknown>;

beforeEach(() => {
  state.update.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.error = null;
});

describe('PlanEditorDialog — visibility', () => {
  it('leaves displayOrder out when visibility did not change', async () => {
    renderEditor(planWith({}));
    expect(
      (await screen.findByTestId('plan-position')) as HTMLInputElement
    ).toHaveProperty('value', '2');
    fireEvent.click(screen.getByTestId('plan-save'));
    await waitFor(() => expect(state.update).toHaveBeenCalledTimes(1));
    expect(payload()).not.toHaveProperty('displayOrder');
  });

  it('sends the new position when it moves', async () => {
    renderEditor(planWith({}));
    fireEvent.change(await screen.findByTestId('plan-position'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByTestId('plan-save'));
    await waitFor(() => expect(state.update).toHaveBeenCalledTimes(1));
    expect(payload().displayOrder).toBe(5);
    expect(payload().expectedVersion).toBe(3);
  });

  it('hiding the plan sends displayOrder 0', async () => {
    renderEditor(planWith({}));
    fireEvent.click(await screen.findByTestId('plan-listed'));
    expect(screen.queryByTestId('plan-position')).toBeNull();
    fireEvent.click(screen.getByTestId('plan-save'));
    await waitFor(() => expect(state.update).toHaveBeenCalledTimes(1));
    expect(payload().displayOrder).toBe(0);
  });

  it('showing a hidden plan offers the next free position', async () => {
    renderEditor(planWith({ displayOrder: 0 }), 4);
    expect(screen.queryByTestId('plan-position')).toBeNull();
    fireEvent.click(await screen.findByTestId('plan-listed'));
    expect(
      (screen.getByTestId('plan-position') as HTMLInputElement).value
    ).toBe('4');
    fireEvent.click(screen.getByTestId('plan-save'));
    await waitFor(() => expect(state.update).toHaveBeenCalledTimes(1));
    expect(payload().displayOrder).toBe(4);
  });

  it('refuses a position outside 1–1,000 before sending', async () => {
    renderEditor(planWith({}));
    fireEvent.change(await screen.findByTestId('plan-position'), {
      target: { value: '1001' },
    });
    expect((await screen.findByTestId('plan-position-error')).textContent).toBe(
      'Position in the plan list must be a whole number from 1 to 1,000.'
    );
    fireEvent.click(screen.getByTestId('plan-save'));
    await screen.findByTestId('plan-position-error');
    expect(state.update).not.toHaveBeenCalled();
  });

  it('explains the last-listed-plan refusal instead of calling it stale', async () => {
    state.error = createApiError('conflict', {
      status: 409,
      messageKey: 'errors.plan.lastListedPlan',
    });
    renderEditor(planWith({}));
    expect((await screen.findByTestId('save-failed')).textContent).toContain(
      'This is the last plan customers can see'
    );
    expect(
      screen.queryByText('This plan changed while you were editing')
    ).toBeNull();
  });

  it('a stale version is still the reload message', async () => {
    state.error = createApiError('conflict', {
      status: 409,
      messageKey: 'errors.concurrency.staleVersion',
    });
    renderEditor(planWith({}));
    expect(
      await screen.findByText('This plan changed while you were editing')
    ).toBeTruthy();
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('an archived plan says so and has no visibility switch', async () => {
    renderEditor(planWith({ status: 'archived', displayOrder: 0 }));
    expect(
      (await screen.findByTestId('plan-archived-banner')).textContent
    ).toContain('This plan is archived');
    expect(screen.queryByTestId('plan-listed')).toBeNull();
    fireEvent.click(screen.getByTestId('plan-save'));
    await waitFor(() => expect(state.update).toHaveBeenCalledTimes(1));
    expect(payload()).not.toHaveProperty('displayOrder');
  });
});
