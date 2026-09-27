/**
 * New Customer Onboarding — the one-page sign-up.
 *
 * THE ACCEPTANCE CRITERION. A new customer creates their account AND
 * their organization AND starts a trial from ONE page with ONE button.
 * Every case below protects a piece of that:
 *
 *   - all five inputs (name, email, password, organization, plan) and a
 *     single "Create account" are on the same screen;
 *   - that button sends `organizationName` and `planId` in the one
 *     `POST /auth/register`, then goes to sign-in with the email carried;
 *   - with the backend flag off, the form is exactly today's form, and the
 *     academy-host learner sign-up never even asks;
 *   - trials off → the organization is still created, with no plan;
 *   - the plan the visitor arrived for is pre-selected (`?plan=`, then the
 *     marketing hand-off in `sessionStorage`), ineligible keys are ignored;
 *   - a stale plan is refused by the server → options re-read, choice
 *     cleared, explained on the picker; a taken email offers sign-in.
 *
 * HTTP is mocked at the service layer (`signupOptionsService`,
 * `authenticationService`), so the real hooks, query cache, form and
 * i18n run end to end.
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
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { ApiError } from '@api';
import { authenticationService } from '@services/identity';
import type {
  Plan,
  RegistrationRequest,
  RegistrationResult,
  SignupOptionsResponse,
} from '@types';
import { INTENDED_PLAN_STORAGE_KEY } from '@features/home';
import { signupOptionsService } from './services/SignupOptionsService';
import { RegistrationForm } from './components/RegistrationForm';

// jsdom has no ResizeObserver; Radix Checkbox and RadioGroup measure with one.
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

function plan(
  overrides: Partial<Plan> & Pick<Plan, 'id' | 'key' | 'name'>
): Plan {
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
    ...overrides,
  };
}

const STARTER = plan({
  id: 'plan-starter',
  key: 'starter',
  name: 'Starter',
  nameLocalized: { en: 'Starter', ar: 'المبتدئة' },
});
const GROWTH = plan({
  id: 'plan-growth',
  key: 'growth',
  name: 'Growth',
  tier: 'growth',
  displayOrder: 2,
  pricing: { amount: 79, currency: 'USD', billingCycle: 'monthly' },
});
const PREMIUM_GROWTH = plan({
  id: 'plan-premium-growth',
  key: 'premium_growth',
  name: 'Premium Growth',
  family: 'premium',
  tier: 'growth',
  displayOrder: 5,
});

function options(
  over: Partial<SignupOptionsResponse> = {}
): SignupOptionsResponse {
  return {
    organizationSignup: true,
    trialsEnabled: true,
    trialPlans: [STARTER, GROWTH, PREMIUM_GROWTH],
    ...over,
  };
}

let getSignupOptions: ReturnType<typeof vi.fn>;
let register: ReturnType<typeof vi.fn>;

beforeEach(() => {
  getSignupOptions = vi.fn(async () => options());
  register = vi.fn(async (_request: RegistrationRequest) => ({
    account: 'new' as const,
  }));
  vi.spyOn(signupOptionsService, 'getSignupOptions').mockImplementation(
    () => getSignupOptions() as Promise<SignupOptionsResponse>
  );
  vi.spyOn(authenticationService, 'register').mockImplementation(
    (request) => register(request) as Promise<RegistrationResult>
  );
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/** Where sign-in was reached, and with what router state. */
function SignInProbe(): JSX.Element {
  const location = useLocation();
  return (
    <pre data-testid="sign-in-probe">{JSON.stringify(location.state)}</pre>
  );
}

function renderForm(
  url = '/auth/register',
  props: Parameters<typeof RegistrationForm>[0] = {},
  language: 'en' | 'ar' = 'en'
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18nInstance(language)}>
        <ToastContext.Provider value={toastValue}>
          <div dir={language === 'ar' ? 'rtl' : 'ltr'} data-testid="root">
            <MemoryRouter initialEntries={[url]}>
              <Routes>
                <Route
                  path="/auth/register"
                  element={<RegistrationForm {...props} />}
                />
                <Route path="/auth/sign-in" element={<SignInProbe />} />
              </Routes>
            </MemoryRouter>
          </div>
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

async function fillAccount(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Full Name'), 'Sara Ali');
  await user.type(screen.getByLabelText('Email'), 'sara@example.com');
  await user.type(screen.getByLabelText('Password'), 'correct-horse-1');
  await user.type(screen.getByLabelText('Confirm Password'), 'correct-horse-1');
  await user.click(screen.getByRole('checkbox'));
}

function radio(name: string): HTMLElement {
  return screen.getByRole('radio', { name });
}

describe('one-page sign-up — organization mode on', () => {
  it('shows all five inputs and exactly one submit button on the same page', async () => {
    renderForm();
    expect(await screen.findByLabelText('Organization name')).toBeTruthy();
    expect(screen.getByLabelText('Full Name')).toBeTruthy();
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByLabelText('Confirm Password')).toBeTruthy();
    expect(screen.getByRole('radiogroup')).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(3);

    const submits = screen
      .getAllByRole('button')
      .filter((button) => button.getAttribute('type') === 'submit');
    expect(submits).toHaveLength(1);
    expect(submits[0].textContent).toBe('Create Account');
  });

  it('groups the plans by family and states trial length, price after trial and no card', async () => {
    renderForm();
    await screen.findByRole('radiogroup');
    expect(screen.getByText('Standard')).toBeTruthy();
    expect(screen.getByText('Premium')).toBeTruthy();
    const growth = screen.getByTestId('trial-plan-growth');
    expect(within(growth).getByText('14-day free trial')).toBeTruthy();
    expect(within(growth).getByText('No card required')).toBeTruthy();
    expect(within(growth).getByText('Then $79 / month')).toBeTruthy();
    expect(
      within(growth).getByText('Growth', { selector: 'span.text-xs' })
    ).toBeTruthy();
  });

  it('sends organizationName and planId in ONE register call, then goes to sign-in with the email', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillAccount(user);
    await user.type(
      screen.getByLabelText('Organization name'),
      '  Nile Learning '
    );
    await user.click(radio('Growth'));
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    expect(register.mock.calls[0][0]).toEqual({
      name: 'Sara Ali',
      email: 'sara@example.com',
      password: 'correct-horse-1',
      academyId: undefined,
      inviteToken: undefined,
      organizationName: 'Nile Learning',
      planId: 'plan-growth',
    });
    const probe = await screen.findByTestId('sign-in-probe');
    expect(JSON.parse(probe.textContent ?? 'null')).toEqual({
      registered: true,
      email: 'sara@example.com',
    });
  });

  it('requires a plan while trials are on, and sends nothing without one', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillAccount(user);
    await user.type(await screen.findByLabelText('Organization name'), 'Nile');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(
      await screen.findByText('Choose a plan to start your free trial')
    ).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });

  it('requires an organization name of at least two characters', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillAccount(user);
    await user.type(await screen.findByLabelText('Organization name'), 'N');
    await user.click(radio('Starter'));
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(
      await screen.findByText('Organization name must be at least 2 characters')
    ).toBeTruthy();
    expect(register).not.toHaveBeenCalled();
  });
});

describe('one-page sign-up — the form falls back to today', () => {
  it('renders the account-only form when the flag is off, and sends no organization fields', async () => {
    getSignupOptions.mockResolvedValue(
      options({ organizationSignup: false, trialPlans: [] })
    );
    const user = userEvent.setup();
    renderForm();
    await waitFor(() => expect(getSignupOptions).toHaveBeenCalled());
    await fillAccount(user);
    expect(screen.queryByLabelText('Organization name')).toBeNull();
    expect(screen.queryByRole('radiogroup')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    const payload = register.mock.calls[0][0] as RegistrationRequest;
    expect(payload).not.toHaveProperty('organizationName');
    expect(payload).not.toHaveProperty('planId');
  });

  it('renders the account-only form when the options cannot be loaded', async () => {
    getSignupOptions.mockRejectedValue(
      new ApiError({
        kind: 'server',
        messageKey: 'errors.server',
        retryable: true,
      })
    );
    renderForm();
    await waitFor(() => expect(getSignupOptions).toHaveBeenCalled());
    expect(screen.getByLabelText('Full Name')).toBeTruthy();
    expect(screen.queryByLabelText('Organization name')).toBeNull();
  });

  it('never asks for options on an academy website sign-up', async () => {
    renderForm('/auth/register', { academyId: 'academy-1' });
    expect(screen.getByLabelText('Full Name')).toBeTruthy();
    // Give any stray query a chance to fire.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(getSignupOptions).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Organization name')).toBeNull();
  });
});

describe('one-page sign-up — trials disabled', () => {
  it('still creates the organization, explains the plan comes later, and sends no planId', async () => {
    getSignupOptions.mockResolvedValue(
      options({ trialsEnabled: false, trialPlans: [] })
    );
    const user = userEvent.setup();
    renderForm();
    await fillAccount(user);
    await user.type(
      await screen.findByLabelText('Organization name'),
      'Nile Learning'
    );
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getByTestId('choose-plan-later').textContent).toContain(
      "You'll choose a plan after signing in."
    );

    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    const payload = register.mock.calls[0][0] as RegistrationRequest;
    expect(payload.organizationName).toBe('Nile Learning');
    expect(payload).not.toHaveProperty('planId');
  });
});

describe('one-page sign-up — the intended plan', () => {
  it('pre-selects the ?plan= key', async () => {
    renderForm('/auth/register?plan=growth');
    await screen.findByRole('radiogroup');
    await waitFor(() =>
      expect(radio('Growth').getAttribute('aria-checked')).toBe('true')
    );
    expect(radio('Starter').getAttribute('aria-checked')).toBe('false');
  });

  it('pre-selects the marketing hand-off from sessionStorage, and consumes it', async () => {
    window.sessionStorage.setItem(INTENDED_PLAN_STORAGE_KEY, 'premium_growth');
    renderForm();
    await screen.findByRole('radiogroup');
    await waitFor(() =>
      expect(radio('Premium Growth').getAttribute('aria-checked')).toBe('true')
    );
    expect(window.sessionStorage.getItem(INTENDED_PLAN_STORAGE_KEY)).toBeNull();
  });

  it('ignores a key that is not an eligible trial plan', async () => {
    window.sessionStorage.setItem(INTENDED_PLAN_STORAGE_KEY, 'enterprise');
    renderForm();
    await screen.findByRole('radiogroup');
    await waitFor(() =>
      expect(
        window.sessionStorage.getItem(INTENDED_PLAN_STORAGE_KEY)
      ).toBeNull()
    );
    for (const item of screen.getAllByRole('radio')) {
      expect(item.getAttribute('aria-checked')).toBe('false');
    }
  });
});

describe('one-page sign-up — server refusals', () => {
  it('re-reads the options, clears the choice and explains on the picker when the plan is unavailable', async () => {
    register.mockRejectedValue(
      new ApiError({
        kind: 'validation',
        messageKey: 'errors.auth.signupPlanUnavailable',
        status: 400,
        retryable: false,
      })
    );
    const user = userEvent.setup();
    renderForm('/auth/register?plan=growth');
    await fillAccount(user);
    await user.type(await screen.findByLabelText('Organization name'), 'Nile');
    await waitFor(() =>
      expect(radio('Growth').getAttribute('aria-checked')).toBe('true')
    );
    getSignupOptions.mockResolvedValue(options({ trialPlans: [STARTER] }));
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByTestId('trial-plan-notice')).toBeTruthy();
    expect(screen.getByTestId('trial-plan-notice').textContent).toBe(
      'That plan can no longer be trialled. Please choose another.'
    );
    await waitFor(() => expect(getSignupOptions).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(1));
    expect(radio('Starter').getAttribute('aria-checked')).toBe('false');
    // Not the generic error card.
    expect(screen.queryByText('Something went wrong')).toBeNull();
  });

  it('falls back to the account-only form when organization sign-up was switched off meanwhile', async () => {
    register.mockRejectedValue(
      new ApiError({
        kind: 'validation',
        messageKey: 'errors.auth.organizationSignupDisabled',
        status: 400,
        retryable: false,
      })
    );
    const user = userEvent.setup();
    renderForm();
    await fillAccount(user);
    await user.type(await screen.findByLabelText('Organization name'), 'Nile');
    await user.click(radio('Starter'));
    getSignupOptions.mockResolvedValue(
      options({ organizationSignup: false, trialPlans: [] })
    );
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByTestId('signup-options-changed')).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByLabelText('Organization name')).toBeNull()
    );
  });

  it('offers sign-in when the email is already registered (409)', async () => {
    register.mockRejectedValue(
      new ApiError({
        kind: 'conflict',
        messageKey: 'errors.auth.emailAlreadyRegistered',
        status: 409,
        retryable: false,
      })
    );
    const user = userEvent.setup();
    renderForm();
    await fillAccount(user);
    await user.type(await screen.findByLabelText('Organization name'), 'Nile');
    await user.click(radio('Starter'));
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(
      await screen.findByText(
        'An account with this email already exists. Try signing in instead.'
      )
    ).toBeTruthy();
    const link = screen.getByRole('link', { name: 'Sign in instead' });
    expect(link.getAttribute('href')).toBe('/auth/sign-in');
  });
});

describe('one-page sign-up — Arabic', () => {
  it('renders the organization field and plan cards in Arabic, right to left', async () => {
    renderForm('/auth/register', {}, 'ar');
    expect(await screen.findByLabelText('اسم المؤسسة')).toBeTruthy();
    expect(screen.getByTestId('root').getAttribute('dir')).toBe('rtl');
    // Catalog text in the visitor's language, from `nameLocalized`.
    expect(screen.getByRole('radio', { name: 'المبتدئة' })).toBeTruthy();
    expect(screen.getByText('اختر تجربتك المجانية')).toBeTruthy();
  });
});
