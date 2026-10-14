/**
 * B0-BIL-07 — the subscription page tells an existing subscriber, before
 * it applies, that their plan's renewal price or limits changed; and only
 * when there is such a notice.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { TenantSubscription } from '@types';

const mutate = vi.fn();

vi.mock('./hooks', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useDismissPriceChangeNotice: () => ({ mutate, isPending: false }),
  };
});

import { PriceChangeNotice } from './components/PriceChangeNotice';

const base = {
  organizationId: 'org-1',
  status: 'active',
  planId: 'academy',
  cancelAtPeriodEnd: false,
} as unknown as TenantSubscription;

const withNotice = {
  ...base,
  priceChangeNotice: {
    planId: 'academy',
    planName: 'Academy',
    billingCycle: 'monthly',
    fromPrice: { amount: 2790, currency: 'EGP' },
    toPrice: { amount: 2990, currency: 'EGP' },
    limitChanges: { students: { from: 400, to: 500 } },
    noticedAt: '2026-11-01T10:00:00.000Z',
    effectiveAt: '2026-12-01T00:00:00.000Z',
  },
} as TenantSubscription;

function renderNotice(
  subscription: TenantSubscription,
  language: 'en' | 'ar' = 'en'
) {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <PriceChangeNotice subscription={subscription} />
    </I18nextProvider>
  );
}

afterEach(() => {
  cleanup();
  mutate.mockReset();
});

describe('PriceChangeNotice', () => {
  it('renders nothing when there is no notice', () => {
    renderNotice(base);
    expect(screen.queryByTestId('subscription-price-change')).toBeNull();
  });

  it('shows the plan, the old and new renewal price, the date and each changed limit', () => {
    renderNotice(withNotice);
    const notice = screen.getByTestId('subscription-price-change');
    expect(notice.textContent).toContain('Academy');
    expect(notice.textContent).toContain(
      'Nothing changes for your current paid period'
    );
    const price =
      screen.getByTestId('subscription-price-change-price').textContent ?? '';
    expect(price).toMatch(/2,790/);
    expect(price).toMatch(/2,990/);
    expect(
      screen.getByTestId('subscription-price-change-limit-students').textContent
    ).toBe('Students: 400 → 500');
  });

  it('says "from your next renewal" without a date in grace', () => {
    renderNotice({
      ...withNotice,
      priceChangeNotice: {
        ...withNotice.priceChangeNotice!,
        effectiveAt: undefined,
      },
    });
    expect(
      screen.getByTestId('subscription-price-change').textContent
    ).toContain('The change applies from your next renewal.');
  });

  it('omits the price line for a limits-only change', () => {
    renderNotice({
      ...withNotice,
      priceChangeNotice: {
        ...withNotice.priceChangeNotice!,
        toPrice: { amount: 2790, currency: 'EGP' },
      },
    });
    expect(screen.queryByTestId('subscription-price-change-price')).toBeNull();
  });

  it('dismisses through the API', () => {
    renderNotice(withNotice);
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it('is translated in Arabic', () => {
    renderNotice(withNotice, 'ar');
    expect(
      screen.getByTestId('subscription-price-change').textContent
    ).toContain('تتغير خطة Academy عند تجديدك القادم');
    expect(screen.getByRole('button', { name: 'فهمت' })).toBeTruthy();
  });
});
