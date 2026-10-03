/**
 * The Platform Owner's plan catalog on a phone: each plan row stacks (name
 * and gift summary above; price, status and actions below, wrapping). Side
 * by side, the ~290 px action group pushed the page 30–66 px sideways at
 * 390 px. jsdom has no layout, so this pins the responsive classes.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';

const plan = {
  id: 'p-growth',
  key: 'growth',
  name: 'Growth',
  description: 'For growing academies',
  status: 'active',
  version: 1,
  limits: {},
  features: {},
  pricing: { amount: 79, currency: 'USD', billingCycle: 'monthly' },
  giftedDaysMonthly: 7,
  giftedDaysYearly: null,
};

vi.mock('@features/tenant', () => ({
  usePlanCatalog: () => ({ data: [plan], isLoading: false, error: null }),
  useAddOnCatalog: () => ({ data: [], isLoading: false, error: null }),
}));
vi.mock('../components/PlanEditorDialog', () => ({
  PlanEditorDialog: () => null,
}));
vi.mock('../components/PlanHistoryPanel', () => ({
  PlanHistoryPanel: () => null,
}));

const { default: PlatformPlanCatalogPage } =
  await import('./PlatformPlanCatalogPage');

afterEach(cleanup);

describe('PlatformPlanCatalogPage on a phone', () => {
  it('stacks each plan row below sm and lets its actions wrap', () => {
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <MemoryRouter>
          <PlatformPlanCatalogPage />
        </MemoryRouter>
      </I18nextProvider>
    );
    const row = screen.getByTestId('plan-row-growth');
    expect(row.className).toContain('flex-col');
    expect(row.className).toContain('sm:flex-row');
    const actions = screen.getByTestId('plan-edit-growth').parentElement!;
    expect(actions.className).toContain('flex-wrap');
    expect(screen.getByTestId('plan-gift-summary-growth').textContent).toBe(
      'Gifted setup days: 7 monthly · none yearly'
    );
  });
});
