/**
 * Signing in on an academy's own website (P64 Phase 1, AD-5).
 *
 * WHAT THIS PREVENTS, in the order the defects actually bit:
 *
 * 1. THE SURFACE WAS NEVER DECLARED. The academy site posted a bare
 *    `{ email, password }`, so the backend defaulted it to the MANAGEMENT
 *    surface — the one that now refuses learners outright. Every student
 *    signing in on their own academy's domain would have been told to go
 *    sign in on their academy's domain. The academy id must ride along
 *    too, and it must be the one the HOST resolved to, never a guess.
 *
 * 2. THE 2FA CHALLENGE WAS DROPPED ON THE FLOOR. A correct password on a
 *    2FA account resolves to a challenge, not a session. The academy page
 *    ignored the return value entirely: the form simply cleared and the
 *    visitor stayed signed out with no error and no next step. And the
 *    verify call has to carry the ORIGINAL sign-in's surface — the
 *    challenge id does not remember it, and the session is minted there.
 *
 * 3. `returnTo` WAS AN OPEN REDIRECT, and only half-honoured. The old
 *    check was `returnTo.startsWith('/')`, which `//evil.example` passes
 *    while the browser reads it as another origin entirely — a phishing
 *    link could bounce a freshly authenticated student to a look-alike
 *    site. A visitor arriving with no `returnTo` was left sitting on a
 *    "you're signed in" card instead of being taken to their courses.
 *
 * None of this is access control — the backend re-decides every one of
 * these on its own. What is tested here is that the client asks the right
 * question and spends the answer.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import type { CurrentUser, TwoFactorChallenge } from '@types';
import { ApiError } from '@api';

const ACADEMY_ID = 'aca-elzozo';

/*
 * jsdom implements no layout and therefore no `ResizeObserver`, which the
 * Radix primitive behind the "Remember me" checkbox constructs on mount.
 * Nothing here observes a size; the stub exists so the real sign-in form
 * can be rendered rather than replaced by a stand-in that would prove
 * nothing about the page under test.
 */
if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}

const signIn =
  vi.fn<
    (input: Record<string, unknown>) => Promise<TwoFactorChallenge | undefined>
  >();
const completeTwoFactor =
  vi.fn<(input: Record<string, unknown>) => Promise<void>>();
let signInError: ApiError | null = null;

vi.mock('@hooks', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useSignIn: () => ({
      signIn,
      completeTwoFactor,
      isLoading: false,
      error: signInError,
      clearError: () => {
        signInError = null;
      },
    }),
  };
});

// The website payload is the one thing a component test cannot obtain
// honestly — it comes from two chained authenticated queries against a
// resolved hostname. Everything else in the tree is the real thing.
vi.mock('./hooks/usePublicWebsiteData', () => ({
  usePublicWebsiteData: () => ({
    status: 'ready',
    academy: {
      academyId: ACADEMY_ID,
      academyName: 'Elzozo Academy',
      canonicalHost: 'elzozo.atlas.app',
    },
    configuration: {
      themeKey: 'modern-education',
      brand: {
        primaryColor: '#1f6feb',
        secondaryColor: '#0b4fc4',
        accentColor: '#f59e0b',
      },
      navigation: [],
      header: {},
      footer: { groups: [], socialLinks: [] },
    },
    pages: [],
  }),
}));

import { PublicWebsiteSignInPage } from './components/PublicWebsiteSignInPage';

const i18n = createI18nInstance('en');

function identity(authenticated: boolean): IdentityContextValue {
  const user = {
    id: 'u-1',
    name: 'Sara',
    email: 'sara@example.com',
    roles: [],
    permissions: [],
    organizations: [],
    organizationMemberships: [],
    principalKind: 'learner',
    academies: [],
    createdAt: '2026-01-01T00:00:00Z',
  } as unknown as CurrentUser;

  return {
    session: authenticated
      ? { status: 'authenticated', user }
      : { status: 'unauthenticated' },
    user: authenticated ? user : undefined,
    isAuthenticated: authenticated,
    isRestoring: false,
    organization: undefined,
    signOut: () => Promise.resolve(),
  } as unknown as IdentityContextValue;
}

function renderPage({
  authenticated = false,
  entry = '/sign-in',
}: { authenticated?: boolean; entry?: string } = {}) {
  return render(
    <I18nextProvider i18n={i18n}>
      <IdentityContext.Provider value={identity(authenticated)}>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route
              path="/sign-in"
              element={
                <PublicWebsiteSignInPage lookupKey="elzozo" locale="en" />
              }
            />
            <Route
              path="/my-learning"
              element={<span data-testid="my-learning">my learning</span>}
            />
            <Route
              path="/my-learning/courses/:courseId"
              element={<span data-testid="course">course</span>}
            />
          </Routes>
        </MemoryRouter>
      </IdentityContext.Provider>
    </I18nextProvider>
  );
}

function submitCredentials() {
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { value: 'sara@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/^password/i), {
    target: { value: 'correct horse battery' },
  });
  fireEvent.submit(screen.getByRole('button', { name: /sign in/i }));
}

beforeEach(() => {
  signInError = null;
  signIn.mockResolvedValue(undefined);
  completeTwoFactor.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('academy sign-in — surface', () => {
  it('signs in on the ACADEMY surface, with this host’s resolved academy id', async () => {
    renderPage();
    submitCredentials();

    await vi.waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    expect(signIn.mock.calls[0][0]).toMatchObject({
      email: 'sara@example.com',
      surface: 'academy',
      academyId: ACADEMY_ID,
    });
  });
});

describe('academy sign-in — the second factor', () => {
  const challenge: TwoFactorChallenge = {
    twoFactorRequired: true,
    challengeId: 'chal-1',
    expiresIn: 300,
  };

  it('shows the code step instead of silently clearing the form', async () => {
    signIn.mockResolvedValue(challenge);
    renderPage();
    submitCredentials();

    expect(
      await screen.findByRole('heading', { name: /two-factor/i })
    ).toBeTruthy();
  });

  it('carries the original sign-in’s surface into the verify call', async () => {
    signIn.mockResolvedValue(challenge);
    renderPage();
    submitCredentials();
    await screen.findByRole('heading', { name: /two-factor/i });

    fireEvent.change(screen.getByLabelText(/authentication code/i), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^verify$/i }));

    await vi.waitFor(() => expect(completeTwoFactor).toHaveBeenCalledTimes(1));
    expect(completeTwoFactor.mock.calls[0][0]).toMatchObject({
      challengeId: 'chal-1',
      token: '123456',
      surface: 'academy',
      academyId: ACADEMY_ID,
    });
  });
});

describe('academy sign-in — where an authenticated visitor lands', () => {
  it('goes to My Learning when no returnTo was supplied', async () => {
    renderPage({ authenticated: true });
    expect(await screen.findByTestId('my-learning')).toBeTruthy();
  });

  it('honours a same-site relative returnTo', async () => {
    renderPage({
      authenticated: true,
      entry: '/sign-in?returnTo=%2Fmy-learning%2Fcourses%2Fc1',
    });
    expect(await screen.findByTestId('course')).toBeTruthy();
  });

  /*
   * `//evil.example` and `https://evil.example` both start with something
   * that looks path-like to a naive check; the browser reads both as
   * another origin. A freshly authenticated session is exactly what a
   * phishing bounce wants, so both fall back to My Learning.
   */
  it.each(['//evil.example', 'https://evil.example/', '/\\evil.example'])(
    'refuses %s as a returnTo and goes to My Learning instead',
    async (hostile) => {
      renderPage({
        authenticated: true,
        entry: `/sign-in?returnTo=${encodeURIComponent(hostile)}`,
      });
      expect(await screen.findByTestId('my-learning')).toBeTruthy();
    }
  );
});

describe('academy sign-in — a refusal with a real next step', () => {
  it('points a non-member at this academy’s sign-up page', async () => {
    signInError = new ApiError({
      kind: 'forbidden',
      messageKey: 'errors.auth.notAMemberOfAcademy',
      status: 403,
      retryable: false,
    });
    signIn.mockRejectedValue(signInError);

    renderPage();
    expect(
      await screen.findByRole('link', { name: /create a student account/i })
    ).toBeTruthy();
  });
});
