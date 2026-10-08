/**
 * Subscription page — the feature section.
 *
 * Live Sessions is the only feature entitlement Atlas enforces, and it is
 * sold as an ADD-ON. Pinned here: while its customer launch is deferred
 * (`liveSessions` flag off) the page renders no feature section at all;
 * with the flag on it is presented as an add-on (active, or available to
 * add), never as an "Upgrade required" gap in the plan. English and Arabic.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type * as ConfigModule from '@config';
import type { AddOn } from '@types';

const flags = vi.hoisted(() => ({ liveSessions: false }));

vi.mock('@config', async (importOriginal) => ({
  ...(await importOriginal<typeof ConfigModule>()),
  isFeatureEnabled: (flag: string) =>
    flag === 'liveSessions' ? flags.liveSessions : true,
}));

const entitlementState = vi.hoisted(() => ({ liveSessions: false }));

const LIVE_ADD_ON: AddOn = {
  id: 'a-live',
  key: 'live-sessions',
  name: 'Live Sessions',
  effect: { type: 'feature', featureKey: 'liveSessions' },
  compatiblePlanKeys: ['growth'],
};

const ok = <T,>(data: T) => ({
  data,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
});

vi.mock('../hooks', () => ({
  useTenantSubscription: () =>
    ok({
      organizationId: 'org-1',
      status: 'active',
      cancelAtPeriodEnd: false,
      plan: { key: 'growth', name: 'Growth', limits: {}, features: {} },
    }),
  useEffectiveEntitlements: () =>
    ok({
      organizationId: 'org-1',
      limits: {},
      features: { liveSessions: entitlementState.liveSessions },
    }),
  usePlanCatalog: () => ok([]),
  useAddOnCatalog: () => ok([LIVE_ADD_ON]),
}));
vi.mock('../components/SubscriptionLifecycleActions', () => ({
  SubscriptionLifecycleActions: () => null,
}));
vi.mock('../components/SubscriptionGiftDetails', () => ({
  SubscriptionGiftDetails: () => null,
}));
vi.mock('../components/PlanComparisonDialog', () => ({
  PlanComparisonDialog: () => null,
}));

const { default: TenantSubscriptionPage } =
  await import('./TenantSubscriptionPage');

const COPY = {
  en: {
    oldTitle: 'Plan features',
    title: 'Add-ons',
    live: 'Live sessions',
    active: 'Active',
    available: 'Add-on available',
    upgrade: 'Upgrade required',
  },
  ar: {
    oldTitle: 'ميزات الخطة',
    title: 'الإضافات',
    live: 'الجلسات المباشرة',
    active: 'نشط',
    available: 'تتوفر إضافة',
    upgrade: 'يتطلب الترقية',
  },
} as const;

function renderPage(language: 'en' | 'ar') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter>
        <TenantSubscriptionPage />
      </MemoryRouter>
    </I18nextProvider>
  );
}

afterEach(() => {
  cleanup();
  flags.liveSessions = false;
  entitlementState.liveSessions = false;
});

describe.each(['en', 'ar'] as const)(
  'TenantSubscriptionPage (%s)',
  (language) => {
    const copy = COPY[language];

    it('renders no feature section while Live Sessions is not launched', () => {
      const { container } = renderPage(language);
      expect(
        screen.queryByTestId('subscription-add-on-capabilities')
      ).toBeNull();
      const text = container.textContent ?? '';
      expect(text).not.toContain(copy.oldTitle);
      expect(text).not.toContain(copy.live);
    });

    it('presents Live Sessions as an add-on available to add, never as an upgrade', () => {
      flags.liveSessions = true;
      renderPage(language);
      const section = screen.getByTestId('subscription-add-on-capabilities');
      expect(section.textContent).toContain(copy.title);
      expect(section.textContent).toContain(copy.live);
      expect(section.textContent).toContain(copy.available);
      expect(section.textContent).not.toContain(copy.upgrade);
    });

    it('marks Live Sessions active once the add-on grants it', () => {
      flags.liveSessions = true;
      entitlementState.liveSessions = true;
      renderPage(language);
      const section = screen.getByTestId('subscription-add-on-capabilities');
      expect(section.textContent).toContain(copy.active);
      expect(section.textContent).not.toContain(copy.available);
    });
  }
);
