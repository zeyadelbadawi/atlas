/**
 * Plan editor — feature switches.
 *
 * Pinned here: only the current feature keys are editable, and only they
 * are sent on save. A plan (or a cached response) still carrying the
 * legacy, never-enforced keys neither shows a switch for them nor sends
 * them back.
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

const LEGACY_PLAN = {
  id: 'p-growth',
  key: 'growth',
  name: 'Growth',
  version: 3,
  limits: {},
  features: {
    liveSessions: true,
    cms: true,
    seoAdvanced: true,
    customDomain: true,
    backup: false,
  },
  pricing: { amount: 100, currency: 'USD', billingCycle: 'monthly' },
  trialEligible: false,
  trialDurationDays: null,
} as unknown as Plan;

beforeEach(() => {
  updateMutateAsync.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PlanEditorDialog — features', () => {
  it('shows a switch for the current keys only', async () => {
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <PlanEditorDialog plan={LEGACY_PLAN} onOpenChange={vi.fn()} />
      </I18nextProvider>
    );
    const live = await screen.findByTestId('plan-feature-liveSessions');
    expect(live.getAttribute('aria-checked')).toBe('true');
    for (const key of ['cms', 'seoAdvanced', 'customDomain', 'backup']) {
      expect(screen.queryByTestId(`plan-feature-${key}`)).toBeNull();
    }
  });

  it('never sends a legacy key back on save', async () => {
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <PlanEditorDialog plan={LEGACY_PLAN} onOpenChange={vi.fn()} />
      </I18nextProvider>
    );
    fireEvent.click(await screen.findByTestId('plan-feature-liveSessions'));
    fireEvent.click(screen.getByTestId('plan-save'));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    expect(updateMutateAsync.mock.calls[0][0].payload.features).toEqual({
      liveSessions: false,
    });
  });
});
