/**
 * Google Identity — frontend (Phase 3).
 *
 * The button appears only where the host offers Google; starting a flow
 * remembers where it came from and leaves for Google exactly once; the
 * return page presents the handoff exactly once, removes it from the
 * address bar, and turns each answer into the right screen; "Last used"
 * is written only from a session response.
 */
import { StrictMode, useState } from 'react';
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
import { STORAGE_KEYS } from '@constants';
import { authenticationService, sessionService } from '@services/identity';
import { createApiError } from '@api';
import type {
  AuthenticationResponse,
  CurrentUser,
  GoogleSignInResult,
} from '@types';
import { GoogleSignInOption } from './GoogleSignInOption';
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
  expiresIn: 900,
  user: USER,
  authMethod: 'google',
};

const accepted: GoogleSignInResult[] = [];

/** A stand-in for `IdentityProvider`: `acceptSignInResult` really signs in. */
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
      accepted.push(result);
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
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  );
}

function renderWith(ui: ReactNode, entry = '/', language: 'en' | 'ar' = 'en') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={createI18nInstance(language)}>
        <TestIdentity>
          <MemoryRouter initialEntries={[entry]}>
            <Routes>
              <Route path="/auth/google/return" element={ui} />
              <Route path="/auth/sign-in" element={ui} />
              <Route
                path="/dashboard"
                element={<p data-testid="dashboard" />}
              />
              <Route
                path="/dashboard/profile"
                element={<p data-testid="settings" />}
              />
            </Routes>
          </MemoryRouter>
        </TestIdentity>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

const returnFlow = (
  <GoogleReturnFlow
    surface="management"
    defaultNext="/dashboard"
    defaultFrom="/auth/sign-in"
    forgotPasswordHref="/auth/forgot-password"
  />
);

function arriveWithFragment(fragment: string) {
  window.history.replaceState(null, '', `/auth/google/return#${fragment}`);
}

beforeEach(() => {
  accepted.length = 0;
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('the Google button', () => {
  it('is not shown while the host does not offer Google', async () => {
    const options = vi
      .spyOn(authenticationService, 'authOptions')
      .mockResolvedValue({ google: false });
    renderWith(
      <GoogleSignInOption intent="sign_in" surface="management" />,
      '/auth/sign-in'
    );
    await waitFor(() => expect(options).toHaveBeenCalled());
    expect(screen.queryByTestId('google-auth-button')).toBeNull();
  });

  it('is shown, with "Last used" only when the last session was a Google one', async () => {
    vi.spyOn(authenticationService, 'authOptions').mockResolvedValue({
      google: true,
    });
    window.localStorage.setItem(STORAGE_KEYS.lastAuthMethod, 'google');
    renderWith(
      <GoogleSignInOption intent="sign_in" surface="management" />,
      '/auth/sign-in'
    );
    expect(
      (await screen.findByTestId('google-auth-button')).textContent
    ).toContain('Continue with Google');
    expect(screen.getByTestId('google-last-used').textContent).toBe(
      'Last used'
    );
  });

  it('has no badge after a password session, and speaks Arabic', async () => {
    vi.spyOn(authenticationService, 'authOptions').mockResolvedValue({
      google: true,
    });
    window.localStorage.setItem(STORAGE_KEYS.lastAuthMethod, 'password');
    renderWith(
      <GoogleSignInOption intent="sign_in" surface="management" />,
      '/auth/sign-in',
      'ar'
    );
    expect(
      (await screen.findByTestId('google-auth-button')).textContent
    ).toContain('المتابعة باستخدام Google');
    expect(screen.queryByTestId('google-last-used')).toBeNull();
  });

  it('remembers where it started and leaves for Google once, however often it is clicked', async () => {
    vi.spyOn(authenticationService, 'authOptions').mockResolvedValue({
      google: true,
    });
    let release: (value: {
      authorizationUrl: string;
      expiresAt: string;
    }) => void = () => undefined;
    const authorize = vi
      .spyOn(authenticationService, 'googleAuthorize')
      .mockImplementation(() => new Promise((resolve) => (release = resolve)));
    const assign = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      pathname: '/sign-up',
      search: '?invite=code-1',
      assign,
    } as Location);

    renderWith(
      <GoogleSignInOption
        intent="sign_up"
        surface="academy"
        academyId="11111111-1111-4111-8111-111111111111"
        inviteToken="code-1"
        locale="ar"
        next="/ar/my"
      />,
      '/auth/sign-in'
    );
    const button = await screen.findByTestId('google-auth-button');
    fireEvent.click(button);
    fireEvent.click(button);
    expect(authorize).toHaveBeenCalledTimes(1);
    expect(authorize).toHaveBeenCalledWith({
      intent: 'sign_up',
      returnTo: '/sign-up?invite=code-1',
      academyId: '11111111-1111-4111-8111-111111111111',
    });
    release({
      authorizationUrl: 'https://accounts.google.test/auth',
      expiresAt: '',
    });
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith('https://accounts.google.test/auth')
    );
    expect(readGoogleFlowContext()).toMatchObject({
      intent: 'sign_up',
      surface: 'academy',
      from: '/sign-up?invite=code-1',
      next: '/ar/my',
      inviteToken: 'code-1',
      locale: 'ar',
    });
  });
});

describe('leaving for Google and coming back with "Back"', () => {
  it('re-enables the button when the browser restores the page from its back/forward cache', async () => {
    vi.spyOn(authenticationService, 'authOptions').mockResolvedValue({
      google: true,
    });
    const authorize = vi
      .spyOn(authenticationService, 'googleAuthorize')
      .mockImplementation(() => new Promise(() => undefined));
    renderWith(
      <GoogleSignInOption intent="sign_in" surface="management" />,
      '/auth/sign-in'
    );
    const button = await screen.findByTestId('google-auth-button');
    fireEvent.click(button);
    await waitFor(() => expect(button).toHaveProperty('disabled', true));
    const restored = new Event('pageshow');
    Object.defineProperty(restored, 'persisted', { value: true });
    window.dispatchEvent(restored);
    await waitFor(() => expect(button).toHaveProperty('disabled', false));
    // And it can start again.
    fireEvent.click(button);
    expect(authorize).toHaveBeenCalledTimes(2);
  });
});

describe('the flow context', () => {
  it('ignores an off-site "from" or "next"', () => {
    saveGoogleFlowContext({
      intent: 'sign_in',
      surface: 'management',
      from: '//evil.example',
    });
    expect(readGoogleFlowContext()).toBeNull();
    saveGoogleFlowContext({
      intent: 'sign_in',
      surface: 'management',
      from: '/auth/sign-in',
      next: 'https://evil.example',
    });
    expect(readGoogleFlowContext()?.next).toBeUndefined();
  });
});

describe('"Last used"', () => {
  it('is written from the session response, and only from a real method', () => {
    sessionService.acceptAuthenticationResponse(SESSION_RESPONSE);
    expect(window.localStorage.getItem(STORAGE_KEYS.lastAuthMethod)).toBe(
      'google'
    );
    sessionService.acceptAuthenticationResponse({
      ...SESSION_RESPONSE,
      authMethod: undefined,
    });
    expect(window.localStorage.getItem(STORAGE_KEYS.lastAuthMethod)).toBe(
      'google'
    );
    sessionService.acceptAuthenticationResponse({
      ...SESSION_RESPONSE,
      authMethod: 'password',
    });
    expect(window.localStorage.getItem(STORAGE_KEYS.lastAuthMethod)).toBe(
      'password'
    );
  });
});

describe('the return page', () => {
  it('presents the handoff once (even in StrictMode), clears it from the address bar, and signs in', async () => {
    saveGoogleFlowContext({
      intent: 'sign_in',
      surface: 'management',
      from: '/auth/sign-in',
      inviteToken: 'code-9',
    });
    arriveWithFragment('h=handoff-1');
    const complete = vi
      .spyOn(authenticationService, 'googleComplete')
      .mockResolvedValue(SESSION_RESPONSE);
    renderWith(<StrictMode>{returnFlow}</StrictMode>, '/auth/google/return');
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith({
      handoff: 'handoff-1',
      inviteToken: 'code-9',
    });
    expect(window.location.hash).toBe('');
    expect(accepted).toHaveLength(1);
    // Consumed: a later visit cannot reuse it.
    expect(readGoogleFlowContext()).toBeNull();
  });

  it('says a cancellation plainly and offers the way back', async () => {
    window.localStorage.setItem(STORAGE_KEYS.lastAuthMethod, 'password');
    arriveWithFragment('error=cancelled');
    const complete = vi.spyOn(authenticationService, 'googleComplete');
    renderWith(returnFlow, '/auth/google/return');
    expect(
      (await screen.findByTestId('google-return-failed')).textContent
    ).toContain('Google sign-in cancelled');
    expect(complete).not.toHaveBeenCalled();
    // A cancelled flow is not a Google sign-in: "Last used" is untouched.
    expect(window.localStorage.getItem(STORAGE_KEYS.lastAuthMethod)).toBe(
      'password'
    );
  });

  it('shows a management refusal of a learner as the way to their academy', async () => {
    arriveWithFragment('h=learner');
    vi.spyOn(authenticationService, 'googleComplete').mockRejectedValue(
      createApiError('forbidden', {
        messageKey: 'errors.auth.studentUseAcademySignIn',
        status: 403,
        details: {
          academies: [{ academyId: 'a-1', name: 'Elzozo', slug: 'elzozo' }],
        },
      })
    );
    renderWith(returnFlow, '/auth/google/return');
    expect(await screen.findByText('Elzozo')).toBeTruthy();
    expect(screen.queryByTestId('google-return-failed')).toBeNull();
  });

  it('explains a spent or foreign handoff without guessing', async () => {
    arriveWithFragment('h=stale');
    vi.spyOn(authenticationService, 'googleComplete').mockRejectedValue(
      createApiError('unauthorized', {
        messageKey: 'errors.auth.googleSignInExpired',
        status: 401,
      })
    );
    renderWith(returnFlow, '/auth/google/return');
    expect(
      (await screen.findByTestId('google-return-failed')).textContent
    ).toContain('expired or was already used');
    expect(window.localStorage.getItem(STORAGE_KEYS.lastAuthMethod)).toBeNull();
  });

  it('asks the owner of an existing account for its password, and lets a wrong one be retried', async () => {
    arriveWithFragment('h=h2');
    vi.spyOn(authenticationService, 'googleComplete').mockResolvedValue({
      googleStep: 'link_required',
      pending: 'p.x',
      expiresAt: '2030-01-01T00:00:00Z',
      email: 'sara@example.com',
    });
    const link = vi
      .spyOn(authenticationService, 'googleLink')
      .mockRejectedValueOnce(
        createApiError('unauthorized', {
          messageKey: 'errors.auth.invalidCredentials',
          status: 401,
        })
      )
      .mockResolvedValueOnce(SESSION_RESPONSE);
    renderWith(returnFlow, '/auth/google/return');
    expect(await screen.findByTestId('google-step-link_required')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Atlas password'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Connect and sign in' })
    );
    expect(await screen.findByText('Invalid email or password.')).toBeTruthy();
    // Still on the step — the backend gave it back.
    fireEvent.change(screen.getByLabelText('Atlas password'), {
      target: { value: 'right' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Connect and sign in' })
    );
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(link).toHaveBeenLastCalledWith({
      pending: 'p.x',
      password: 'right',
    });
  });

  it("creates nothing until the person confirms, prefilled with Google's name", async () => {
    arriveWithFragment('h=h3');
    vi.spyOn(authenticationService, 'googleComplete').mockResolvedValue({
      googleStep: 'create_account',
      pending: 'p.y',
      expiresAt: '2030-01-01T00:00:00Z',
      email: 'new@example.com',
      name: 'New Person',
    });
    const create = vi
      .spyOn(authenticationService, 'googleCreateAccount')
      .mockResolvedValue(SESSION_RESPONSE);
    renderWith(
      <GoogleReturnFlow
        surface="academy"
        academyId="a-1"
        defaultNext="/dashboard"
        defaultFrom="/auth/sign-in"
        forgotPasswordHref="/forgot-password"
      />,
      '/auth/google/return'
    );
    expect(
      await screen.findByTestId('google-step-create_account')
    ).toBeTruthy();
    expect((screen.getByLabelText('Full Name') as HTMLInputElement).value).toBe(
      'New Person'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    // Terms not accepted yet: nothing is sent.
    expect(create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(create).toHaveBeenCalledWith({ pending: 'p.y', name: 'New Person' });
  });

  it('goes back to settings after connecting Google there', async () => {
    saveGoogleFlowContext({
      intent: 'link',
      surface: 'management',
      from: '/dashboard/profile',
    });
    arriveWithFragment('h=h4');
    vi.spyOn(authenticationService, 'googleComplete').mockResolvedValue({
      linked: true,
      email: 'sara@gmail.com',
    });
    renderWith(returnFlow, '/auth/google/return');
    expect(await screen.findByTestId('settings')).toBeTruthy();
    expect(accepted).toHaveLength(0);
  });

  it('shows the second factor instead of signing in when the account has one', async () => {
    arriveWithFragment('h=h5');
    vi.spyOn(authenticationService, 'googleComplete').mockResolvedValue({
      twoFactorRequired: true,
      challengeId: 'c-1',
      expiresIn: 300,
    });
    renderWith(returnFlow, '/auth/google/return');
    await waitFor(() => expect(accepted).toHaveLength(1));
    expect(screen.queryByTestId('dashboard')).toBeNull();
    expect(screen.queryByTestId('google-return-pending')).toBeNull();
  });
});
