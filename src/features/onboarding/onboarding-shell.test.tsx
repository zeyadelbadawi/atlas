/**
 * New Customer Onboarding — the setup shell.
 *
 * What is pinned here is everything the shell must NOT get wrong:
 *
 *   - it resumes where the SERVER says (`nextStep`), not where a browser
 *     remembers;
 *   - the Plan step says the true thing in each state — trial available,
 *     trial used (paid checkout, with a way back), payment awaiting
 *     confirmation, payment failed (translated reason, reviewer's note);
 *   - Skip exists on Branding and First course only;
 *   - "Finish" is disabled until `requiredComplete`, and "ready" wording
 *     appears only with `readyLabelAllowed`;
 *   - leaving (Finish / Finish for now) completes on the server AND
 *     re-reads the session BEFORE opening `/dashboard` — otherwise the
 *     stale `onboardingPending` would bounce the owner straight back;
 *   - only the owner of the active organization is let in;
 *   - Arabic renders right to left.
 *
 * HTTP is mocked at the service layer; the real hooks, query cache,
 * router and i18n run.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AtlasLocalizationProvider } from '@app/providers/localization/LocalizationProvider';
import { STORAGE_KEYS } from '@constants';
import { TooltipProvider } from '@/components/ui/tooltip';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { ApiError } from '@api';
import { planService, tenantService } from '@features/tenant';
import { academyService } from '@features/academy';
import { courseService } from '@features/course';
import type {
  Academy,
  OnboardingStatusResponse,
  OnboardingStepKey,
  OnboardingStepStatus,
  Plan,
  ProvisioningRequest,
  WebsiteConfiguration,
} from '@types';
import { provisioningService } from '../provisioning/services/ProvisioningService';
import { websiteConfigurationService } from '../website/services/WebsiteConfigurationService';
import { onboardingService } from './services/OnboardingService';
import OnboardingPage from './pages/OnboardingPage';
import {
  resetAcademyBuildTimersForTests,
  startAcademyBuild,
} from '@components/academy-build';

// jsdom has no ResizeObserver; Radix RadioGroup measures its items with one.
if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}

const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};

type StepStatuses = Partial<Record<OnboardingStepKey, OnboardingStepStatus>>;

function status(
  statuses: StepStatuses = {},
  over: Partial<OnboardingStatusResponse> = {}
): OnboardingStatusResponse {
  const s: Record<OnboardingStepKey, OnboardingStepStatus> = {
    plan: 'complete',
    academy: 'complete',
    branding: 'incomplete',
    website: 'incomplete',
    course: 'incomplete',
    ...statuses,
  };
  return {
    organizationId: 'org-1',
    completedAt: null,
    pending: true,
    requiredComplete: s.academy === 'complete' && s.website === 'complete',
    readyLabelAllowed: s.academy === 'complete' && s.website === 'complete',
    subscription: {
      status: 'trialing',
      planKey: 'starter',
      trialEndsAt: '2026-10-10T00:00:00Z',
      trialAvailable: false,
    },
    latestSubscriptionPayment: null,
    academy: {
      id: 'aca-1',
      name: 'Nile Academy',
      slug: 'nile',
      host: 'nile.atlas.app',
      logoUrl: null,
    },
    provisioning: {
      requestId: 'req-1',
      status: 'ready',
      currentStepKey: null,
      failed: false,
    },
    steps: [
      { key: 'plan', requirement: 'prerequisite', status: s.plan },
      { key: 'academy', requirement: 'required', status: s.academy },
      { key: 'branding', requirement: 'recommended', status: s.branding },
      { key: 'website', requirement: 'required', status: s.website },
      { key: 'course', requirement: 'recommended', status: s.course },
    ],
    nextStep: 'website',
    ...over,
  };
}

/** A brand-new organization: no plan yet, everything else locked. */
function planPending(
  over: Partial<OnboardingStatusResponse> = {},
  planStatus: OnboardingStepStatus = 'incomplete'
): OnboardingStatusResponse {
  return status(
    {
      plan: planStatus,
      academy: 'blocked',
      branding: 'blocked',
      website: 'blocked',
      course: 'blocked',
    },
    {
      subscription: {
        status: 'no_plan',
        planKey: null,
        trialEndsAt: null,
        trialAvailable: false,
      },
      academy: null,
      provisioning: null,
      nextStep: 'plan',
      ...over,
    }
  );
}

function plan(id: string, key: string, name: string, order: number): Plan {
  return {
    id,
    key,
    name,
    status: 'active',
    displayOrder: order,
    family: 'normal',
    tier: 'basic',
    limits: {
      academies: 1,
      students: 100,
      instructors: 2,
      staff: 2,
      courses: 10,
      generalStorage: 5,
      videoStorage: 10,
      recordedSessions: 0,
    },
    features: { liveSessions: false },
    pricing: { amount: 49, currency: 'USD', billingCycle: 'monthly' },
    trialEligible: true,
    trialDurationDays: 14,
    version: 1,
  };
}

const ACADEMY: Academy = {
  id: 'aca-1',
  organizationId: 'org-1',
  name: 'Nile Academy',
  slug: 'nile',
  status: 'active',
  timezone: 'Africa/Cairo',
  language: 'en',
  currency: 'USD',
  createdAt: '2026-09-26T00:00:00Z',
  updatedAt: '2026-09-26T00:00:00Z',
};

let current: OnboardingStatusResponse;
let getStatus: ReturnType<typeof vi.fn>;
let completeCall: ReturnType<typeof vi.fn>;
let startTrial: ReturnType<typeof vi.fn>;
let refreshSession: ReturnType<typeof vi.fn>;
/** Call order across the complete → refresh → navigate sequence. */
let events: string[];

beforeEach(() => {
  events = [];
  current = status();
  getStatus = vi.fn(async () => current);
  completeCall = vi.fn(async (_org: string, request: { mode: string }) => {
    events.push(`complete:${request.mode}`);
    current = {
      ...current,
      pending: false,
      completedAt: '2026-09-26T12:00:00Z',
    };
    return current;
  });
  startTrial = vi.fn(async () => ({
    started: true,
    trialEndsAt: '2026-10-10T00:00:00Z',
  }));
  refreshSession = vi.fn(async () => {
    events.push('refreshSession');
  });

  vi.spyOn(onboardingService, 'getStatus').mockImplementation(
    (organizationId) =>
      getStatus(organizationId) as Promise<OnboardingStatusResponse>
  );
  vi.spyOn(onboardingService, 'complete').mockImplementation(
    (organizationId, request) =>
      completeCall(organizationId, request) as Promise<OnboardingStatusResponse>
  );
  vi.spyOn(planService, 'getPlans').mockResolvedValue([
    plan('plan-starter', 'starter', 'Starter', 1),
    plan('plan-growth', 'growth', 'Growth', 2),
  ]);
  vi.spyOn(tenantService, 'startTrial').mockImplementation(
    (organizationId, input) =>
      startTrial(organizationId, input) as ReturnType<
        typeof tenantService.startTrial
      >
  );
  vi.spyOn(academyService, 'getAcademy').mockResolvedValue(ACADEMY);
  vi.spyOn(courseService, 'getCourseCategories').mockResolvedValue({
    items: [],
    pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 1 },
  } as unknown as Awaited<
    ReturnType<typeof courseService.getCourseCategories>
  >);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  resetAcademyBuildTimersForTests();
});

function identity(role = 'owner'): IdentityContextValue {
  return {
    session: { status: 'authenticated' },
    isAuthenticated: true,
    isRestoring: false,
    user: {
      id: 'u1',
      name: 'Sara',
      email: 'sara@example.com',
      roles: [],
      permissions: [],
      principalKind: 'staff',
      academies: [],
      organizations: [
        {
          organizationId: 'org-1',
          organizationName: 'Nile',
          role,
          permissions: [],
          isPrimary: true,
          joinedAt: '2026-09-26T00:00:00Z',
          onboardingPending: role === 'owner',
        },
      ],
      organizationMemberships: [],
      createdAt: '2026-09-26T00:00:00Z',
    },
    organization: { id: 'org-1', name: 'Nile', role, permissions: [] },
    refreshSession: () => refreshSession(),
    switchOrganization: vi.fn(),
  } as unknown as IdentityContextValue;
}

function Where({ testId }: { readonly testId: string }): JSX.Element {
  const location = useLocation();
  events.push(`at:${location.pathname}`);
  return (
    <span data-testid={testId}>{`${location.pathname}${location.search}`}</span>
  );
}

function renderShell(
  url: string,
  options: { readonly role?: string; readonly language?: 'en' | 'ar' } = {}
) {
  const language = options.language ?? 'en';
  // The REAL localization provider: the shell's language switcher needs
  // it, and it is what puts `dir`/`lang` on the document root.
  // Written directly: the app's own writer is consent-gated, and this is
  // test setup, not a preference the user chose.
  window.localStorage.setItem(STORAGE_KEYS.language, JSON.stringify(language));
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AtlasLocalizationProvider>
        <TooltipProvider>
          <ToastContext.Provider value={toastValue}>
            <IdentityContext.Provider value={identity(options.role)}>
              <div data-testid="root">
                <MemoryRouter initialEntries={[url]}>
                  <Routes>
                    <Route path="/onboarding" element={<OnboardingPage />} />
                    <Route
                      path="/onboarding/:step"
                      element={<OnboardingPage />}
                    />
                    <Route
                      path="/dashboard"
                      element={<Where testId="dashboard" />}
                    />
                    <Route
                      path="/dashboard/*"
                      element={<Where testId="elsewhere" />}
                    />
                  </Routes>
                </MemoryRouter>
              </div>
            </IdentityContext.Provider>
          </ToastContext.Provider>
        </TooltipProvider>
      </AtlasLocalizationProvider>
    </QueryClientProvider>
  );
}

const heading = () => screen.findByRole('heading', { level: 1 });

describe('onboarding shell — entry', () => {
  it('resumes at the server’s nextStep when opened without a step', async () => {
    current = status({}, { nextStep: 'website' });
    renderShell('/onboarding');
    expect((await heading()).textContent).toBe('Publish your website');
  });

  it('marks the current step in the rail with aria-current and words, not colour alone', async () => {
    renderShell('/onboarding/website');
    await heading();
    const nav = screen.getByRole('navigation', { name: 'Setup progress' });
    const currentLink = within(nav)
      .getAllByRole('link')
      .find((link) => link.getAttribute('aria-current') === 'step');
    expect(currentLink?.textContent).toContain('Website');
    expect(currentLink?.textContent).toContain('To do');
    // A complete plan step is not listed at all.
    expect(within(nav).queryByText('Plan')).toBeNull();
    expect(within(nav).getByTestId('rail-step-academy').textContent).toContain(
      'Done'
    );
  });

  it('tags required and recommended steps in the rail, in words', async () => {
    renderShell('/onboarding/website');
    await heading();
    const nav = screen.getByRole('navigation', { name: 'Setup progress' });
    expect(within(nav).getByTestId('rail-step-academy').textContent).toContain(
      'Required'
    );
    expect(within(nav).getByTestId('rail-step-website').textContent).toContain(
      'Required'
    );
    // Branding is chosen in the Academy step; it has no screen of its own.
    expect(within(nav).queryByTestId('rail-step-branding')).toBeNull();
    expect(within(nav).getByTestId('rail-step-course').textContent).toContain(
      'Recommended'
    );
  });

  it('focuses the heading on each step', async () => {
    renderShell('/onboarding/website');
    const title = await heading();
    await waitFor(() => expect(document.activeElement).toBe(title));
  });

  it('sends a non-owner to /dashboard without reading the status', async () => {
    renderShell('/onboarding', { role: 'manager' });
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(getStatus).not.toHaveBeenCalled();
  });

  it('sends the owner to /dashboard when the status read is refused (403)', async () => {
    getStatus.mockRejectedValue(
      new ApiError({
        kind: 'forbidden',
        messageKey: 'errors.forbidden',
        status: 403,
        retryable: false,
      })
    );
    renderShell('/onboarding/website');
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
  });
});

describe('onboarding shell — Plan step', () => {
  it('offers the free trial with a plan choice when one is available', async () => {
    current = planPending({
      subscription: {
        status: 'no_plan',
        planKey: null,
        trialEndsAt: null,
        trialAvailable: true,
      },
    });
    const user = userEvent.setup();
    renderShell('/onboarding');
    expect((await heading()).textContent).toBe('Choose how to start');
    const start = await screen.findByRole('button', {
      name: 'Start free trial',
    });
    expect((start as HTMLButtonElement).disabled).toBe(true);

    await user.click(screen.getByRole('radio', { name: 'Growth' }));
    current = status({}, { nextStep: 'academy' });
    await user.click(start);

    await waitFor(() =>
      expect(startTrial).toHaveBeenCalledWith('org-1', {
        planId: 'plan-growth',
      })
    );
    expect((await heading()).textContent).toBe('Create your academy');
  });

  it('offers paid plans through the existing checkout, with a way back to setup, when the trial is used', async () => {
    current = planPending();
    renderShell('/onboarding/plan');
    const link = await screen.findByTestId('plan-checkout-growth');
    expect(link.getAttribute('href')).toBe(
      '/dashboard/tenant/billing/checkout/plan_subscription/growth?returnTo=%2Fonboarding'
    );
    expect(
      screen.queryByRole('button', { name: 'Start free trial' })
    ).toBeNull();
  });

  it('says a submitted payment is awaiting confirmation and links to it', async () => {
    current = planPending(
      {
        latestSubscriptionPayment: {
          id: 'pay-1',
          status: 'pending',
          reviewStatus: 'pending_review',
          failureReason: null,
          reviewNotes: null,
          planKey: 'growth',
        },
      },
      'awaiting_confirmation'
    );
    renderShell('/onboarding/plan');
    const panel = await screen.findByTestId('plan-awaiting-confirmation');
    expect(panel.textContent).toContain(
      'Payment submitted — waiting for confirmation'
    );
    expect(
      within(panel)
        .getByRole('link', { name: 'View payment' })
        .getAttribute('href')
    ).toBe('/dashboard/tenant/billing/payments/pay-1');
    expect(
      within(panel).getByRole('link', { name: 'Contact support' })
    ).toBeTruthy();
    expect(screen.queryByTestId('plan-paid-offer')).toBeNull();
  });

  it('shows why a payment failed (translated, never the raw key) and offers to pay again', async () => {
    current = planPending({
      latestSubscriptionPayment: {
        id: 'pay-2',
        status: 'failed',
        reviewStatus: 'rejected',
        failureReason: 'errors.payment.rejectedByReviewer',
        reviewNotes: 'The transfer reference was missing.',
        planKey: 'growth',
      },
    });
    renderShell('/onboarding/plan');
    const panel = await screen.findByTestId('plan-payment-failed');
    expect(panel.textContent).toContain(
      "Atlas reviewed this payment and couldn't accept it."
    );
    expect(panel.textContent).not.toContain('errors.payment');
    expect(screen.getByTestId('plan-payment-review-notes').textContent).toBe(
      'The transfer reference was missing.'
    );
    expect(
      within(panel)
        .getByRole('link', { name: 'Submit a new payment' })
        .getAttribute('href')
    ).toBe(
      '/dashboard/tenant/billing/checkout/plan_subscription/growth?returnTo=%2Fonboarding'
    );
  });

  it('skips a complete plan step', async () => {
    renderShell('/onboarding/plan');
    expect((await heading()).textContent).toBe('Create your academy');
  });
});

describe('onboarding shell — Academy step', () => {
  function provisioningRequest(
    requestStatus: ProvisioningRequest['status']
  ): ProvisioningRequest {
    return {
      id: 'req-1',
      organizationId: 'org-1',
      status: requestStatus,
      currentStepKey: 'website',
      steps: [],
      idempotencyKey: 'k',
      attemptCount: 1,
      requestedAcademyName: 'Nile Academy',
      requestedSubdomain: 'nile',
      createdAt: '2026-09-26T00:00:00Z',
      ...(requestStatus === 'failed'
        ? { lastError: { messageKey: 'errors.provisioning.dnsFailed' } }
        : {}),
    } as unknown as ProvisioningRequest;
  }

  it('says "Create academy" on the submit button, not the provisioning wording', async () => {
    current = status(
      {
        academy: 'incomplete',
        branding: 'blocked',
        website: 'blocked',
        course: 'blocked',
      },
      { academy: null, provisioning: null, nextStep: 'academy' }
    );
    renderShell('/onboarding/academy');
    expect((await heading()).textContent).toBe('Create your academy');
    expect(
      await screen.findByRole('button', { name: 'Create academy' })
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /provisioning/i })).toBeNull();
  });

  it('stays in the shell and follows provisioning while it runs', async () => {
    current = status(
      {
        academy: 'in_progress',
        branding: 'blocked',
        website: 'blocked',
        course: 'blocked',
      },
      {
        provisioning: {
          requestId: 'req-1',
          status: 'provisioning',
          currentStepKey: 'website',
          failed: false,
        },
        nextStep: 'academy',
      }
    );
    vi.spyOn(provisioningService, 'getProvisioningRequest').mockResolvedValue(
      provisioningRequest('provisioning')
    );
    renderShell('/onboarding/academy');
    const build = await screen.findByTestId('academy-build');
    expect(build.textContent).toContain('Building Nile Academy');
    expect(within(build).getAllByRole('listitem')).toHaveLength(10);
    expect(within(build).getByRole('progressbar')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  });

  it('keeps the build screen up until its window has passed, even once the server says ready', async () => {
    startAcademyBuild('req-1');
    current = status(
      {},
      {
        provisioning: {
          requestId: 'req-1',
          status: 'ready',
          currentStepKey: null,
          failed: false,
        },
        nextStep: 'website',
      }
    );
    vi.spyOn(provisioningService, 'getProvisioningRequest').mockResolvedValue(
      provisioningRequest('ready')
    );
    renderShell('/onboarding/academy');
    expect(await screen.findByTestId('academy-build')).toBeTruthy();
    expect(screen.queryByTestId('academy-ready')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
    // `/onboarding` resumes on the build rather than skipping past it.
    const nav = screen.getByRole('navigation', { name: 'Setup progress' });
    expect(within(nav).getByTestId('rail-step-academy').textContent).toContain(
      'In progress'
    );
  });

  it('offers retry when provisioning failed', async () => {
    current = status(
      {
        academy: 'incomplete',
        branding: 'blocked',
        website: 'blocked',
        course: 'blocked',
      },
      {
        provisioning: {
          requestId: 'req-1',
          status: 'failed',
          currentStepKey: 'website',
          failed: true,
        },
        nextStep: 'academy',
      }
    );
    vi.spyOn(provisioningService, 'getProvisioningRequest').mockResolvedValue(
      provisioningRequest('failed')
    );
    const retry = vi
      .spyOn(provisioningService, 'retryProvisioning')
      .mockResolvedValue(provisioningRequest('provisioning'));
    const user = userEvent.setup();
    renderShell('/onboarding/academy');
    await screen.findByTestId('academy-provisioning-failed');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(retry).toHaveBeenCalledWith('org-1', 'req-1'));
  });
});

describe('onboarding shell — Website step', () => {
  it('explains learners cannot see an unpublished site, links to its host, and publishes it', async () => {
    const publish = vi
      .spyOn(websiteConfigurationService, 'publishConfiguration')
      .mockImplementation(async () => {
        current = status({ website: 'complete' }, { nextStep: 'branding' });
        return { status: 'published' } as unknown as WebsiteConfiguration;
      });
    const user = userEvent.setup();
    renderShell('/onboarding/website');
    const panel = await screen.findByTestId('website-unpublished');
    expect(panel.textContent).toContain(
      "Learners can't see your website until you publish it."
    );
    expect(screen.getByTestId('website-host-link').getAttribute('href')).toBe(
      'https://nile.atlas.app/'
    );
    await user.click(screen.getByRole('button', { name: 'Publish website' }));
    await waitFor(() => expect(publish).toHaveBeenCalledWith('aca-1'));
    expect(await screen.findByTestId('website-published')).toBeTruthy();
  });
});

describe('onboarding shell — Skip', () => {
  it.each([
    ['course', 'Create your first course', true],
    ['website', 'Publish your website', false],
    ['academy', 'Create your academy', false],
    ['summary', 'Setup incomplete — 1 required step left', false],
  ] as const)('on %s: Skip offered = %s', async (step, title, skippable) => {
    renderShell(`/onboarding/${step}`);
    expect((await heading()).textContent).toBe(title);
    expect(!!screen.queryByTestId('onboarding-skip')).toBe(skippable);
  });

  it('moves to the next screen without storing anything', async () => {
    const user = userEvent.setup();
    renderShell('/onboarding/course');
    await heading();
    await user.click(screen.getByTestId('onboarding-skip'));
    expect((await heading()).textContent).toBe(
      'Setup incomplete — 1 required step left'
    );
    expect(completeCall).not.toHaveBeenCalled();
    const stored = Object.keys(window.localStorage).filter((key) =>
      key.toLowerCase().includes('onboarding')
    );
    expect(stored).toEqual([]);
  });
});

describe('onboarding shell — no Branding screen', () => {
  it('sends /onboarding/branding to the next visible step, even when the server resumes there', async () => {
    current = status({ website: 'complete' }, { nextStep: 'branding' });
    renderShell('/onboarding/branding');
    expect((await heading()).textContent).toBe('Create your first course');
  });
});

describe('onboarding shell — Summary', () => {
  it('disables Finish until the required steps are complete, and never says ready', async () => {
    current = status({ website: 'incomplete' }, { nextStep: 'website' });
    renderShell('/onboarding/summary');
    expect((await heading()).textContent).toBe(
      'Setup incomplete — 1 required step left'
    );
    expect(
      (screen.getByRole('button', { name: 'Finish' }) as HTMLButtonElement)
        .disabled
    ).toBe(true);
    expect(screen.queryByText('Your academy is ready')).toBeNull();
    expect(
      (
        screen.getByRole('button', {
          name: 'Finish for now',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(false);
  });

  it('says "ready" only with readyLabelAllowed', async () => {
    current = status(
      { website: 'complete' },
      { requiredComplete: true, readyLabelAllowed: false, nextStep: 'branding' }
    );
    renderShell('/onboarding/summary');
    expect((await heading()).textContent).not.toBe('Your academy is ready');
  });

  it('finishes on the server, refreshes the session, THEN opens the dashboard', async () => {
    current = status({ website: 'complete' }, { nextStep: 'branding' });
    const user = userEvent.setup();
    renderShell('/onboarding/summary');
    expect((await heading()).textContent).toBe('Your academy is ready');
    await user.click(screen.getByRole('button', { name: 'Finish' }));

    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(completeCall).toHaveBeenCalledWith('org-1', { mode: 'finish' });
    expect(
      events.filter((event) => !event.startsWith('at:/onboarding'))
    ).toEqual(['complete:finish', 'refreshSession', 'at:/dashboard']);
  });
});

describe('onboarding shell — Finish for now', () => {
  it('defers on the server and refreshes the session before leaving, from any step', async () => {
    const user = userEvent.setup();
    renderShell('/onboarding/website');
    await heading();
    await user.click(screen.getByTestId('onboarding-finish-for-now'));

    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(completeCall).toHaveBeenCalledWith('org-1', { mode: 'defer' });
    expect(
      events.filter((event) => !event.startsWith('at:/onboarding'))
    ).toEqual(['complete:defer', 'refreshSession', 'at:/dashboard']);
  });

  it('stays in setup and says so when deferring fails', async () => {
    completeCall.mockRejectedValue(
      new ApiError({
        kind: 'server',
        messageKey: 'errors.server',
        retryable: true,
      })
    );
    const user = userEvent.setup();
    renderShell('/onboarding/website');
    await heading();
    await user.click(screen.getByTestId('onboarding-finish-for-now'));
    await waitFor(() => expect(completeCall).toHaveBeenCalled());
    // Still on the step, with the button usable again.
    await waitFor(() =>
      expect(
        (screen.getByTestId('onboarding-finish-for-now') as HTMLButtonElement)
          .disabled
      ).toBe(false)
    );
    expect(screen.queryByTestId('dashboard')).toBeNull();
    expect(refreshSession).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Publish your website'
    );
  });
});

describe('onboarding shell — Arabic', () => {
  it('renders the shell in Arabic, right to left', async () => {
    current = status({ website: 'incomplete' });
    renderShell('/onboarding/summary', { language: 'ar' });
    expect((await heading()).textContent).toBe(
      'الإعداد غير مكتمل — تبقّت خطوة مطلوبة واحدة'
    );
    await waitFor(() => expect(document.documentElement.dir).toBe('rtl'));
    expect(document.documentElement.lang).toBe('ar');
    expect(
      screen.getByRole('navigation', { name: 'تقدّم الإعداد' })
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'إنهاء' })).toBeTruthy();
  });
});
