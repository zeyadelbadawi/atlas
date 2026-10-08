/**
 * Add-ons page — an add-on whose stored effect names a legacy, never-
 * enforced feature key (e.g. `advanced-analytics` → `analyticsAdvanced`)
 * still renders, but its effect is described as nothing: never as an
 * "Unlocks …" claim and never as a raw translation key.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { AddOn, TenantAddOn } from '@types';

const LEGACY_ADD_ON = {
  id: 'a-analytics',
  key: 'advanced-analytics',
  name: 'Advanced Analytics',
  effect: { type: 'feature', featureKey: 'analyticsAdvanced' },
  compatiblePlanKeys: ['growth'],
} as unknown as AddOn;

const LIVE_ADD_ON: AddOn = {
  id: 'a-live',
  key: 'live-sessions',
  name: 'Live Sessions',
  effect: { type: 'feature', featureKey: 'liveSessions' },
  compatiblePlanKeys: ['growth'],
};

const ACTIVE: TenantAddOn = {
  id: 't-1',
  organizationId: 'org-1',
  addOnId: LEGACY_ADD_ON.id,
  addOn: LEGACY_ADD_ON,
  activatedAt: '2026-01-01T00:00:00.000Z',
};

const ok = <T,>(data: T) => ({
  data,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
});

vi.mock('../hooks', () => ({
  useTenantAddOns: () => ok([ACTIVE]),
  useAddOnCatalog: () => ok([LEGACY_ADD_ON, LIVE_ADD_ON]),
  useTenantSubscription: () => ok({ plan: { key: 'growth' } }),
}));

const { default: TenantAddOnsPage } = await import('./TenantAddOnsPage');

afterEach(() => cleanup());

describe.each(['en', 'ar'] as const)('TenantAddOnsPage (%s)', (language) => {
  it('describes a legacy feature effect as nothing, and a current one normally', () => {
    const { container } = render(
      <I18nextProvider i18n={createI18nInstance(language)}>
        <MemoryRouter>
          <TenantAddOnsPage />
        </MemoryRouter>
      </I18nextProvider>
    );
    const text = container.textContent ?? '';
    expect(screen.getByText('Advanced Analytics')).toBeTruthy();
    expect(text).not.toContain('analyticsAdvanced');
    expect(text).not.toContain('common.features');
    const unlocks = language === 'en' ? 'Unlocks' : 'يتيح';
    // Exactly one effect line — the Live Sessions add-on's.
    expect(text.split(unlocks)).toHaveLength(2);
    expect(text).toContain(
      language === 'en' ? 'Unlocks Live sessions' : 'يتيح الجلسات المباشرة'
    );
  });
});
