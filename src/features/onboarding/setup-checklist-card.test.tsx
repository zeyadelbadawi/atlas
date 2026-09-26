/**
 * New Customer Onboarding — the dashboard's "Set up your academy" card.
 *
 * Pinned:
 *   - it keeps showing open items AFTER onboarding was completed or
 *     deferred (`completedAt` set): "Finish for now" closes the screens,
 *     not the work;
 *   - "ready" wording only with `readyLabelAllowed`; otherwise it counts
 *     the required steps left;
 *   - once only recommended items remain the owner may hide it — per
 *     device, cosmetic — and it never offers that while a required step
 *     is open;
 *   - it is owners-only and silent once everything is done.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import type {
  OnboardingStatusResponse,
  OnboardingStepKey,
  OnboardingStepStatus,
} from '@types';
import { onboardingService } from './services/OnboardingService';
import { SetupChecklistCard } from './components/SetupChecklistCard';

let current: OnboardingStatusResponse;
let getStatus: ReturnType<typeof vi.fn>;

function status(
  statuses: Partial<Record<OnboardingStepKey, OnboardingStepStatus>>,
  over: Partial<OnboardingStatusResponse> = {}
): OnboardingStatusResponse {
  const s: Record<OnboardingStepKey, OnboardingStepStatus> = {
    plan: 'complete',
    academy: 'complete',
    branding: 'complete',
    website: 'complete',
    course: 'complete',
    ...statuses,
  };
  const requiredComplete = s.academy === 'complete' && s.website === 'complete';
  return {
    organizationId: 'org-1',
    completedAt: '2026-09-26T12:00:00Z',
    pending: false,
    requiredComplete,
    readyLabelAllowed: requiredComplete,
    subscription: {
      status: 'trialing',
      planKey: 'starter',
      trialEndsAt: null,
      trialAvailable: false,
    },
    latestSubscriptionPayment: null,
    academy: null,
    provisioning: null,
    steps: [
      { key: 'plan', requirement: 'prerequisite', status: s.plan },
      { key: 'academy', requirement: 'required', status: s.academy },
      { key: 'branding', requirement: 'recommended', status: s.branding },
      { key: 'website', requirement: 'required', status: s.website },
      { key: 'course', requirement: 'recommended', status: s.course },
    ],
    nextStep: 'summary',
    ...over,
  };
}

beforeEach(() => {
  getStatus = vi.fn(async () => current);
  vi.spyOn(onboardingService, 'getStatus').mockImplementation(
    (organizationId) => getStatus(organizationId) as Promise<OnboardingStatusResponse>
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.localStorage.clear();
});

function renderCard(role = 'owner', language: 'en' | 'ar' = 'en') {
  const identity = {
    user: {
      id: 'u1',
      roles: [],
      organizations: [
        {
          organizationId: 'org-1',
          organizationName: 'Nile',
          role,
          permissions: [],
          isPrimary: true,
          joinedAt: '2026-09-26T00:00:00Z',
          onboardingPending: false,
        },
      ],
    },
    organization: { id: 'org-1', name: 'Nile', role, permissions: [] },
  } as unknown as IdentityContextValue;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18nInstance(language)}>
        <IdentityContext.Provider value={identity}>
          <MemoryRouter>
            <SetupChecklistCard />
          </MemoryRouter>
        </IdentityContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

describe('SetupChecklistCard', () => {
  it('keeps showing open required items after setup was deferred, without "ready" wording', async () => {
    current = status({ website: 'incomplete', course: 'incomplete' });
    renderCard();
    const card = await screen.findByTestId('setup-checklist-card');
    expect(card.textContent).toContain('Set up your academy');
    expect(card.textContent).toContain('Setup incomplete — 1 required step left');
    expect(card.textContent).not.toContain('Your academy is ready');
    expect(screen.getByTestId('setup-item-website')).toBeTruthy();
    expect(screen.getByTestId('setup-item-course')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /Continue setup/ }).getAttribute('href')
    ).toBe('/onboarding');
    expect(screen.getAllByRole('link', { name: 'Open' })[0].getAttribute('href')).toBe(
      '/onboarding/website'
    );
    // Never offered while something required is open.
    expect(screen.queryByRole('button', { name: 'Hide' })).toBeNull();
  });

  it('says "ready" only when readyLabelAllowed, and lists the recommended items left', async () => {
    current = status({ branding: 'incomplete' });
    renderCard();
    const card = await screen.findByTestId('setup-checklist-card');
    expect(card.textContent).toContain('Your academy is ready');
    expect(card.textContent).toContain('A few recommended steps are left.');
    expect(screen.getByTestId('setup-item-branding')).toBeTruthy();
  });

  it('does not say "ready" when the server withholds it', async () => {
    current = status(
      { branding: 'incomplete' },
      { requiredComplete: true, readyLabelAllowed: false }
    );
    renderCard();
    const card = await screen.findByTestId('setup-checklist-card');
    expect(card.textContent).not.toContain('Your academy is ready');
  });

  it('can be hidden on this device once only recommended items remain', async () => {
    current = status({ course: 'incomplete' });
    const user = userEvent.setup();
    const { unmount } = renderCard();
    await screen.findByTestId('setup-checklist-card');
    await user.click(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.queryByTestId('setup-checklist-card')).toBeNull();
    unmount();

    // Still hidden on the next visit from this device…
    renderCard();
    await waitFor(() => expect(getStatus).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('setup-checklist-card')).toBeNull();
  });

  it('comes back when a required step reopens, even if hidden', async () => {
    window.localStorage.setItem('atlas:onboardingCardHidden:org-1', '1');
    current = status({ website: 'incomplete' });
    renderCard();
    expect(await screen.findByTestId('setup-checklist-card')).toBeTruthy();
  });

  it('renders nothing once every step is complete', async () => {
    current = status({});
    renderCard();
    await waitFor(() => expect(getStatus).toHaveBeenCalled());
    expect(screen.queryByTestId('setup-checklist-card')).toBeNull();
  });

  it('never asks for the status as a manager', async () => {
    current = status({ website: 'incomplete' });
    renderCard('manager');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getStatus).not.toHaveBeenCalled();
    expect(screen.queryByTestId('setup-checklist-card')).toBeNull();
  });

  it('renders in Arabic', async () => {
    current = status({ website: 'incomplete' });
    renderCard('owner', 'ar');
    const card = await screen.findByTestId('setup-checklist-card');
    expect(card.textContent).toContain('إعداد أكاديميتك');
    expect(card.textContent).toContain('الإعداد غير مكتمل — تبقّت خطوة مطلوبة واحدة');
  });
});
