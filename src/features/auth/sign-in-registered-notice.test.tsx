/**
 * New Customer Onboarding — sign-in right after the one-page sign-up.
 *
 * The sign-up hands over `{ registered: true, email }`. The sign-in page
 * must greet the new owner with what happens next ("sign in to set up
 * your academy") and pre-fill the address they just typed; an ordinary
 * visit to sign-in must look exactly as before.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import SignInPage from './pages/SignInPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Google Identity — the page asks `/auth/options` whether to show the
// Google button; with no answer here the button simply stays hidden.
function testQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}


afterEach(cleanup);

// jsdom has no ResizeObserver; the Radix "remember me" checkbox measures with one.
if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}

const identity = {
  session: { status: 'unauthenticated' },
  user: undefined,
  organization: undefined,
  isAuthenticated: false,
  isRestoring: false,
  signIn: async () => undefined,
  completeTwoFactor: async () => undefined,
  completeEmailOtp: async () => undefined,
} as unknown as IdentityContextValue;

function renderSignIn(state?: unknown, language: 'en' | 'ar' = 'en') {
  return render(
    <QueryClientProvider client={testQueryClient()}>
      <I18nextProvider i18n={createI18nInstance(language)}>
        <IdentityContext.Provider value={identity}>
          <MemoryRouter initialEntries={[{ pathname: '/auth/sign-in', state }]}>
            <Routes>
              <Route path="/auth/sign-in" element={<SignInPage />} />
            </Routes>
          </MemoryRouter>
        </IdentityContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

describe('SignInPage after the one-page sign-up', () => {
  it('shows the "account created" notice and pre-fills the email', () => {
    renderSignIn({ registered: true, email: 'sara@example.com' });
    const notice = screen.getByTestId('account-created-notice');
    // Audit Decision 3 — the notice is true whether or not the address
    // already had an account (registration never says which).
    expect(notice.textContent).toContain('Sign in to continue');
    expect(notice.textContent).toContain(
      'If you already had an account with this email, sign in with it'
    );
    expect(notice.textContent).not.toContain('Account created');
    expect(
      (screen.getByLabelText('Email') as HTMLInputElement).value
    ).toBe('sara@example.com');
  });

  it('pre-fills the email without the notice when coming from "Sign in instead"', () => {
    renderSignIn({ email: 'sara@example.com' });
    expect(screen.queryByTestId('account-created-notice')).toBeNull();
    expect(
      (screen.getByLabelText('Email') as HTMLInputElement).value
    ).toBe('sara@example.com');
  });

  it('looks exactly as before on an ordinary visit', () => {
    renderSignIn();
    expect(screen.queryByTestId('account-created-notice')).toBeNull();
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('');
  });

  it('ignores malformed router state', () => {
    renderSignIn({ registered: 'yes', email: 42 });
    expect(screen.queryByTestId('account-created-notice')).toBeNull();
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('');
  });

  it('says it in Arabic', () => {
    renderSignIn({ registered: true, email: 'sara@example.com' }, 'ar');
    expect(screen.getByTestId('account-created-notice').textContent).toContain(
      'سجّل الدخول للمتابعة'
    );
  });
});
