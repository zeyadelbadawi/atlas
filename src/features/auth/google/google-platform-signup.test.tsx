/**
 * Google Identity — Atlas's own sign-in and sign-up pages (the platform
 * host; the management surface).
 *
 *   - "Continue with Google" appears on BOTH pages exactly when the host
 *     offers Google (`GET /auth/options`), and on neither otherwise;
 *   - starting from the sign-up page carries what the form already holds
 *     (organization name, chosen plan, the plan the visitor arrived for)
 *     to the return page — in this tab's `sessionStorage`, never in a URL
 *     and never to Google;
 *   - the Google create step starts from it: the organization name is
 *     filled in, the plan is selected again when still eligible, and the
 *     same rules as the password sign-up (organization name and plan
 *     required) hold before anything is sent;
 *   - a stored draft is only a hint: malformed or oversized values are
 *     dropped.
 *
 * HTTP is mocked at the service layer, so the real pages, hooks, query
 * cache and i18n run.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { authenticationService } from '@services/identity';
import type {
  AuthenticationResponse,
  CurrentUser,
  GoogleSignInResult,
  Plan,
  SignupOptionsResponse,
} from '@types';
import { INTENDED_PLAN_STORAGE_KEY } from '@features/home';
import { signupOptionsService } from '../services/SignupOptionsService';
import SignInPage from '../pages/SignInPage';
import RegistrationPage from '../pages/RegistrationPage';
import { GoogleReturnFlow } from './GoogleReturnFlow';
import {
  readGoogleFlowContext,
  saveGoogleFlowContext,
} from './google-flow.storage';

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}

const USER = {
  id: 'u-1',
  name: 'Sara',
  email: 'sara@example.com',
  roles: [],
  permissions: [],
  organizations: [],
  organizationMemberships: [],
} as unknown as CurrentUser;

const SESSION_RESPONSE: AuthenticationResponse = {
  accessToken: 'a',
  refreshToken: 'r',
  expiresIn: 900,
  user: USER,
  authMethod: 'google',
};

const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};

function plan(over: Pick<Plan, 'id' | 'key' | 'name'> & Partial<Plan>): Plan {
  return {
    status: 'active',
    displayOrder: 1,
    family: 'normal',
    tier: 'basic',
    limits: {
      academies: 1,
      students: 500,
      instructors: 5,
      staff: 5,
      courses: 20,
      generalStorage: 10,
      videoStorage: 50,
      recordedSessions: 0,
    },
    features: {
      cms: true,
      seo: true,
      seoAdvanced: false,
      marketing: false,
      marketingAdvanced: false,
      analytics: true,
      analyticsAdvanced: false,
      customDomain: false,
      themes: true,
      multipleThemes: false,
      backup: false,
      liveSessions: false,
    },
    pricing: { amount: 29, currency: 'USD', billingCycle: 'monthly' },
    trialEligible: true,
    trialDurationDays: 14,
    version: 1,
    ...over,
  };
}

const STARTER = plan({ id: 'plan-starter', key: 'starter', name: 'Starter' });
const GROWTH = plan({
  id: 'plan-growth',
  key: 'growth',
  name: 'Growth',
  tier: 'growth',
  displayOrder: 2,
});

const OPTIONS: SignupOptionsResponse = {
  organizationSignup: true,
  trialsEnabled: true,
  trialPlans: [STARTER, GROWTH],
};

function TestIdentity({ children }: { readonly children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const value = {
    session: authenticated
      ? { status: 'authenticated', user: USER }
      : { status: 'unauthenticated' },
    user: authenticated ? USER : undefined,
    isAuthenticated: authenticated,
    isRestoring: false,
    organization: undefined,
    acceptSignInResult: (result: GoogleSignInResult) => {
      if ('twoFactorRequired' in result || 'emailOtpRequired' in result) {
        return result;
      }
      setAuthenticated(true);
      return undefined;
    },
    completeTwoFactor: async () => undefined,
    completeEmailOtp: async () => undefined,
    signIn: async () => undefined,
  } as unknown as IdentityContextValue;
  return (
    <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>
  );
}

function renderAt(entry: string, language: 'en' | 'ar' = 'en') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={createI18nInstance(language)}>
        <ToastContext.Provider value={toastValue}>
          <TestIdentity>
            <MemoryRouter initialEntries={[entry]}>
              <Routes>
                <Route path="/auth/sign-in" element={<SignInPage />} />
                <Route path="/auth/register" element={<RegistrationPage />} />
                <Route
                  path="/auth/google/return"
                  element={
                    <GoogleReturnFlow
                      surface="management"
                      defaultNext="/dashboard"
                      defaultFrom="/auth/register"
                      forgotPasswordHref="/auth/forgot-password"
                      legalLinks={{ terms: '/terms', privacy: '/privacy' }}
                    />
                  }
                />
                <Route
                  path="/dashboard"
                  element={<p data-testid="dashboard" />}
                />
              </Routes>
            </MemoryRouter>
          </TestIdentity>
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

function offerGoogle(google: boolean) {
  vi.spyOn(authenticationService, 'authOptions').mockResolvedValue({ google });
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.spyOn(signupOptionsService, 'getSignupOptions').mockResolvedValue(
    OPTIONS
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('"Continue with Google" on Atlas\'s own pages', () => {
  it('is on the sign-in page when the platform offers Google', async () => {
    offerGoogle(true);
    renderAt('/auth/sign-in');
    expect(await screen.findByTestId('google-auth-button')).toBeTruthy();
    // The password form is still there, under it.
    expect(screen.getByLabelText('Password')).toBeTruthy();
  });

  it('is on the sign-up page when the platform offers Google (Arabic too)', async () => {
    offerGoogle(true);
    renderAt('/auth/register', 'ar');
    expect(await screen.findByTestId('google-auth-button')).toBeTruthy();
    expect(
      await screen.findByTestId('organization-signup-fields')
    ).toBeTruthy();
  });

  it('is on neither page while the platform does not offer Google', async () => {
    offerGoogle(false);
    renderAt('/auth/sign-in');
    expect(await screen.findByLabelText('Password')).toBeTruthy();
    await waitFor(() =>
      expect(authenticationService.authOptions).toHaveBeenCalled()
    );
    expect(screen.queryByTestId('google-auth-button')).toBeNull();
    cleanup();
    renderAt('/auth/register');
    expect(
      await screen.findByTestId('organization-signup-fields')
    ).toBeTruthy();
    expect(screen.queryByTestId('google-auth-button')).toBeNull();
  });
});

describe('starting Google from the sign-up page', () => {
  it('carries the organization name and chosen plan to the return page — never to Google or a URL', async () => {
    offerGoogle(true);
    const authorize = vi
      .spyOn(authenticationService, 'googleAuthorize')
      .mockResolvedValue({
        authorizationUrl: 'https://accounts.google.test/auth',
        expiresAt: '',
      });
    const assign = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      pathname: '/auth/register',
      search: '?plan=starter',
      assign,
    } as Location);

    renderAt('/auth/register?plan=starter');
    fireEvent.change(await screen.findByLabelText('Organization name'), {
      target: { value: '  Nile Learning  ' },
    });
    // The visitor arrived for Starter, then picked Growth here.
    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: /Starter/ }).getAttribute('aria-checked')
      ).toBe('true')
    );
    fireEvent.click(screen.getByRole('radio', { name: /Growth/ }));
    fireEvent.click(await screen.findByTestId('google-auth-button'));

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith('https://accounts.google.test/auth')
    );
    // Google and the backend's authorize get nothing of the sign-up.
    expect(authorize).toHaveBeenCalledWith({
      intent: 'sign_up',
      returnTo: '/auth/register?plan=starter',
    });
    expect(readGoogleFlowContext()).toMatchObject({
      intent: 'sign_up',
      surface: 'management',
      from: '/auth/register?plan=starter',
      signup: {
        organizationName: 'Nile Learning',
        planId: 'plan-growth',
        planKey: 'starter',
      },
    });
  });

  it('carries the pricing page hand-off even though the form consumed it', async () => {
    offerGoogle(true);
    window.sessionStorage.setItem(INTENDED_PLAN_STORAGE_KEY, 'growth');
    vi.spyOn(authenticationService, 'googleAuthorize').mockResolvedValue({
      authorizationUrl: 'https://accounts.google.test/auth',
      expiresAt: '',
    });
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      pathname: '/auth/register',
      search: '',
      assign: vi.fn(),
    } as Location);

    renderAt('/auth/register');
    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: /Growth/ }).getAttribute('aria-checked')
      ).toBe('true')
    );
    expect(window.sessionStorage.getItem(INTENDED_PLAN_STORAGE_KEY)).toBeNull();
    fireEvent.click(await screen.findByTestId('google-auth-button'));
    await waitFor(() =>
      expect(readGoogleFlowContext()?.signup).toEqual({
        planId: 'plan-growth',
        planKey: 'growth',
      })
    );
  });
});

describe('the Google create step on the platform', () => {
  function arriveWithCreateStep() {
    window.history.replaceState(null, '', '/auth/google/return#h=h-new');
    vi.spyOn(authenticationService, 'googleComplete').mockResolvedValue({
      googleStep: 'create_account',
      pending: 'p.new',
      expiresAt: '2030-01-01T00:00:00Z',
      email: 'owner@example.com',
      name: 'Nour Owner',
    });
    return vi
      .spyOn(authenticationService, 'googleCreateAccount')
      .mockResolvedValue(SESSION_RESPONSE);
  }

  it('starts from the organization name and plan chosen before Google, and sends them with the account', async () => {
    saveGoogleFlowContext({
      intent: 'sign_up',
      surface: 'management',
      from: '/auth/register?plan=starter',
      signup: {
        organizationName: 'Nile Learning',
        planId: 'plan-growth',
        planKey: 'starter',
      },
    });
    const create = arriveWithCreateStep();
    renderAt('/auth/google/return');

    expect(
      await screen.findByTestId('google-step-create_account')
    ).toBeTruthy();
    expect(
      ((await screen.findByLabelText('Organization name')) as HTMLInputElement)
        .value
    ).toBe('Nile Learning');
    // The plan picked in the form wins over the one the visitor arrived for.
    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: /Growth/ }).getAttribute('aria-checked')
      ).toBe('true')
    );
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(create).toHaveBeenCalledWith({
      pending: 'p.new',
      name: 'Nour Owner',
      organizationName: 'Nile Learning',
      planId: 'plan-growth',
    });
  });

  it('selects the plan the visitor arrived for when the form had no choice', async () => {
    saveGoogleFlowContext({
      intent: 'sign_up',
      surface: 'management',
      from: '/auth/register?plan=starter',
      signup: { planKey: 'starter' },
    });
    arriveWithCreateStep();
    renderAt('/auth/google/return');
    await screen.findByTestId('google-step-create_account');
    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: /Starter/ }).getAttribute('aria-checked')
      ).toBe('true')
    );
  });

  it('requires the organization name and a plan, exactly like the password sign-up, before sending anything', async () => {
    // Started on the sign-IN page: nothing carried; an ineligible key is ignored.
    saveGoogleFlowContext({
      intent: 'sign_in',
      surface: 'management',
      from: '/auth/sign-in',
      signup: { planKey: 'retired-plan' },
    });
    const create = arriveWithCreateStep();
    renderAt('/auth/google/return');
    await screen.findByTestId('google-step-create_account');
    expect(
      ((await screen.findByLabelText('Organization name')) as HTMLInputElement)
        .value
    ).toBe('');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(create).not.toHaveBeenCalled();
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.getAttribute('aria-checked')).toBe('false');
    }

    fireEvent.change(screen.getByLabelText('Organization name'), {
      target: { value: 'Delta Academy Group' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    // Still no plan: still nothing sent.
    expect(create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('radio', { name: /Starter/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        pending: 'p.new',
        name: 'Nour Owner',
        organizationName: 'Delta Academy Group',
        planId: 'plan-starter',
      })
    );
  });
});

describe('the stored sign-up draft', () => {
  it('is only a hint: malformed or oversized values are dropped', () => {
    window.sessionStorage.setItem(
      'atlas:google-flow',
      JSON.stringify({
        intent: 'sign_up',
        surface: 'management',
        from: '/auth/register',
        startedAt: Date.now(),
        signup: {
          organizationName: 'x'.repeat(121),
          planId: 42,
          planKey: 'growth',
        },
      })
    );
    expect(readGoogleFlowContext()?.signup).toEqual({ planKey: 'growth' });

    window.sessionStorage.setItem(
      'atlas:google-flow',
      JSON.stringify({
        intent: 'sign_up',
        surface: 'management',
        from: '/auth/register',
        startedAt: Date.now(),
        signup: 'Nile Learning',
      })
    );
    expect(readGoogleFlowContext()?.signup).toBeUndefined();
  });
});
