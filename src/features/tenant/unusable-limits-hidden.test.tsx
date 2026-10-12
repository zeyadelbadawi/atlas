/**
 * B0-MED-04 — no customer screen shows an allowance an academy cannot use
 * yet: video storage (no hosted video authoring) and recorded sessions
 * (Live Sessions unlaunched). The catalog keeps the stored values.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { isCustomerVisibleLimitKey } from '@utils';
import type { AddOn, TenantSubscription } from '@types';
import {
  CUSTOMER_PLAN_LIMIT_KEYS,
  CUSTOMER_USAGE_METRIC_KEYS,
  PLAN_LIMIT_KEYS,
} from './constants/tenant.constants';

const VIDEO_ADD_ON: AddOn = {
  id: 'a-video',
  key: 'video-storage-50',
  name: 'Extra video storage',
  effect: { type: 'limit', limitKey: 'videoStorage', amount: 50 },
  compatiblePlanKeys: ['growth'],
};
const STORAGE_ADD_ON: AddOn = {
  id: 'a-storage',
  key: 'storage-50',
  name: 'Extra storage',
  effect: { type: 'limit', limitKey: 'generalStorage', amount: 50 },
  compatiblePlanKeys: ['growth'],
};

const ok = <T,>(data: T) => ({
  data,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
});

vi.mock('./hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTenantAddOns: () => ok([]),
  useAddOnCatalog: () => ok([VIDEO_ADD_ON, STORAGE_ADD_ON]),
  useTenantSubscription: () => ok({ plan: { key: 'growth' } }),
  useDismissPriceChangeNotice: () => ({ mutate: vi.fn(), isPending: false }),
}));

const { default: TenantAddOnsPage } = await import('./pages/TenantAddOnsPage');
const { PriceChangeNotice } = await import('./components/PriceChangeNotice');

afterEach(() => cleanup());

describe('customer-visible plan limits', () => {
  it('leaves video storage and recorded sessions out while they cannot be used', () => {
    expect(isCustomerVisibleLimitKey('videoStorage')).toBe(false);
    expect(isCustomerVisibleLimitKey('recordedSessions')).toBe(false);
    expect(CUSTOMER_PLAN_LIMIT_KEYS).toEqual(
      PLAN_LIMIT_KEYS.filter(
        (key) => key !== 'videoStorage' && key !== 'recordedSessions'
      )
    );
    expect(CUSTOMER_USAGE_METRIC_KEYS).not.toContain('videoStorage');
    expect(CUSTOMER_PLAN_LIMIT_KEYS).toContain('generalStorage');
  });

  it('does not offer a video storage add-on', () => {
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <MemoryRouter>
          <TenantAddOnsPage />
        </MemoryRouter>
      </I18nextProvider>
    );
    expect(screen.getByText('Extra storage')).toBeTruthy();
    expect(screen.queryByText('Extra video storage')).toBeNull();
  });

  it('leaves a video storage change out of a price-change notice', () => {
    const subscription = {
      organizationId: 'org-1',
      status: 'active',
      planId: 'academy',
      cancelAtPeriodEnd: false,
      priceChangeNotice: {
        planId: 'academy',
        planName: 'Academy',
        billingCycle: 'monthly',
        fromPrice: { amount: 2790, currency: 'EGP' },
        toPrice: { amount: 2990, currency: 'EGP' },
        limitChanges: {
          students: { from: 400, to: 500 },
          videoStorage: { from: 10, to: 20 },
        },
        noticedAt: '2026-11-01T10:00:00.000Z',
        effectiveAt: '2026-12-01T00:00:00.000Z',
      },
    } as unknown as TenantSubscription;
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <PriceChangeNotice subscription={subscription} />
      </I18nextProvider>
    );
    const text = screen.getByTestId('subscription-price-change').textContent;
    expect(text).toContain('Students');
    expect(text).not.toContain('Video storage');
  });
});
