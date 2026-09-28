/**
 * Authentication comprehensive audit — frontend regressions.
 *
 *   - the platform sign-in honours `?redirect=` only for a same-site
 *     relative path (never `//host`, a scheme or a backslash trick), the
 *     same guard the academy sign-in uses;
 *   - the sign-up name is bounded to the server's 100 characters, with a
 *     translated message, before anything is sent.
 */
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { authenticationService } from '@services/identity';
import type { CurrentUser, RegistrationResult } from '@types';
import { signupOptionsService } from './services/SignupOptionsService';
import SignInPage from './pages/SignInPage';
import { RegistrationForm } from './components/RegistrationForm';

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

const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};

function Where(): JSX.Element {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
}

function renderAt(entry: string, ui: ReactNode, authenticated: boolean) {
  const identity = {
    session: authenticated
      ? { status: 'authenticated', user: USER }
      : { status: 'unauthenticated' },
    user: authenticated ? USER : undefined,
    isAuthenticated: authenticated,
    isRestoring: false,
    organization: undefined,
    acceptSignInResult: () => undefined,
    completeTwoFactor: async () => undefined,
    completeEmailOtp: async () => undefined,
    signIn: async () => undefined,
  } as unknown as IdentityContextValue;
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={createI18nInstance('en')}>
        <ToastContext.Provider value={toastValue}>
          <IdentityContext.Provider value={identity}>
            <MemoryRouter initialEntries={[entry]}>
              <Routes>
                <Route path="/auth/sign-in" element={ui} />
                <Route path="/auth/register" element={ui} />
                <Route path="*" element={<Where />} />
              </Routes>
            </MemoryRouter>
          </IdentityContext.Provider>
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.spyOn(authenticationService, 'authOptions').mockResolvedValue({
    google: false,
  });
  vi.spyOn(signupOptionsService, 'getSignupOptions').mockResolvedValue({
    organizationSignup: false,
    trialsEnabled: false,
    trialPlans: [],
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('platform sign-in ?redirect=', () => {
  it.each([
    ['//evil.example/phish'],
    ['https://evil.example/'],
    ['/\\evil.example'],
    ['javascript:alert(1)'],
  ])('ignores %s and lands on the dashboard', async (target) => {
    renderAt(
      `/auth/sign-in?redirect=${encodeURIComponent(target)}`,
      <SignInPage />,
      true
    );
    expect((await screen.findByTestId('where')).textContent).toBe('/dashboard');
  });

  it('follows a same-site relative path', async () => {
    renderAt(
      `/auth/sign-in?redirect=${encodeURIComponent('/dashboard/profile?tab=security')}`,
      <SignInPage />,
      true
    );
    expect((await screen.findByTestId('where')).textContent).toBe(
      '/dashboard/profile?tab=security'
    );
  });
});

describe('sign-up name bound', () => {
  it('refuses more than 100 characters with a translated message and sends nothing', async () => {
    const register = vi
      .spyOn(authenticationService, 'register')
      .mockResolvedValue({ account: 'new' } as RegistrationResult);
    renderAt('/auth/register', <RegistrationForm />, false);
    const name = (await screen.findByLabelText('Full Name')) as HTMLInputElement;
    expect(name.maxLength).toBe(100);
    // `maxLength` stops typing; a pasted/programmatic value is still validated.
    fireEvent.change(name, { target: { value: 'x'.repeat(101) } });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'sara@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-horse-1' },
    });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'correct-horse-1' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(
      await screen.findByText('Name must be 100 characters or fewer')
    ).toBeTruthy();
    await waitFor(() => expect(register).not.toHaveBeenCalled());
  });
});
