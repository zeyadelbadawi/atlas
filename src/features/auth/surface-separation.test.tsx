/**
 * The management/academy surface split (P64 Phase 1, AD-4 / AD-5, D2).
 *
 * WHAT THIS PREVENTS. A student's account is not a management account, but
 * for most of Atlas's life the product behaved as if it were: the central
 * sign-in happily minted a session for a learner, `/dashboard/*` rendered
 * a workspace full of empty tables, and every learner-shaped route in the
 * dashboard competed with the academy website that actually owns the
 * learning experience. The backend now refuses all of that
 * (`ManagementSurfaceGuard`, and a 403 at sign-in), and none of these
 * tests can grant or deny access — what they guard is that the PRODUCT
 * stops drawing a surface the API will refuse, and that it points the
 * person somewhere that works instead of showing them a dead end.
 *
 * The three things worth pinning down, and why each is its own case:
 *
 * 1. The refusal is a SCREEN, not a toast. No session exists at that
 *    point, so there is nothing to redirect; the only useful thing is the
 *    way in, which is the academy's own website.
 * 2. An academy with no host yet must be NAMED but NOT LINKED. Linking it
 *    would send a student to `https://undefined/sign-in`.
 * 3. The dashboard guard sits at the SUBTREE ROOT, so a hand-typed deep
 *    link (`/dashboard/platform`, `/dashboard/settings`,
 *    `/dashboard/organization/create`) is covered without each route
 *    remembering to declare it. That is precisely the class of hole this
 *    is meant to close, so all three are exercised, not just one.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import type { CurrentUser, LearnerAcademy, PrincipalKind } from '@types';

// `RouteGuard` consults the subscription lifecycle for entitlement-gated
// routes. None of these routes are, but hooks cannot be called
// conditionally, so the query is stubbed rather than left to hit an
// absent QueryClient.
vi.mock('@features/tenant', () => ({
  useSubscriptionLifecycleState: () => ({ state: undefined, isLoading: false }),
}));

import { RouteGuard } from '@app/routes/guards/RouteGuard';
import { StudentSignInRefusal } from './components/StudentSignInRefusal';
import { AcademyChooser } from './components/AcademyChooser';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const i18n = createI18nInstance('en');

function academy(over: Partial<LearnerAcademy> = {}): LearnerAcademy {
  return {
    academyId: 'aca-1',
    name: 'Elzozo Academy',
    slug: 'elzozo',
    host: 'elzozo.atlas.app',
    membershipStatus: 'active',
    blocked: false,
    ...over,
  };
}

function identity(over: {
  principalKind?: PrincipalKind;
  academies?: readonly LearnerAcademy[];
  signOut?: () => Promise<void>;
}): IdentityContextValue {
  const user = {
    id: 'u-1',
    name: 'Sara',
    email: 'sara@example.com',
    roles: [],
    permissions: ['student.learning.view'],
    organizations: [],
    organizationMemberships: [],
    principalKind: over.principalKind ?? 'learner',
    academies: over.academies ?? [academy()],
    createdAt: '2026-01-01T00:00:00Z',
  } as unknown as CurrentUser;

  return {
    user,
    isAuthenticated: true,
    isRestoring: false,
    organization: undefined,
    signOut: over.signOut ?? (() => Promise.resolve()),
  } as unknown as IdentityContextValue;
}

function renderWith(
  ui: React.ReactNode,
  context: IdentityContextValue,
  initialEntry = '/'
) {
  return render(
    <I18nextProvider i18n={i18n}>
      <IdentityContext.Provider value={context}>
        <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>
      </IdentityContext.Provider>
    </I18nextProvider>
  );
}

describe('StudentSignInRefusal — the central sign-in says no', () => {
  it('states the refusal in the words the student needs, in place of the form', () => {
    renderWith(
      <StudentSignInRefusal academies={[]} onBack={() => undefined} />,
      identity({})
    );

    expect(screen.getByTestId('student-sign-in-refusal')).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: /you are a student/i })
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: /academy.s website/i })
    ).toBeTruthy();
  });

  it('links each named academy to that academy’s own sign-in page', () => {
    renderWith(
      <StudentSignInRefusal
        academies={[
          { academyId: 'a', name: 'Elzozo', slug: 'elzozo', host: 'elzozo.atlas.app' },
          { academyId: 'b', name: 'Nile', slug: 'nile', host: 'learn.nile.edu' },
        ]}
        onBack={() => undefined}
      />,
      identity({})
    );

    const links = screen.getAllByTestId('academy-link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'https://elzozo.atlas.app/sign-in',
      'https://learn.nile.edu/sign-in',
    ]);
  });

  /*
   * An academy whose website is not live yet has nowhere to send anyone.
   * Naming it is still useful ("yes, we know about this one"); linking it
   * would be a broken promise.
   */
  it('names an academy without a host but does not link it', () => {
    renderWith(
      <StudentSignInRefusal
        academies={[
          { academyId: 'a', name: 'Elzozo', slug: 'elzozo', host: 'elzozo.atlas.app' },
          { academyId: 'b', name: 'Not Live Yet', slug: 'nly' },
        ]}
        onBack={() => undefined}
      />,
      identity({})
    );

    expect(screen.getAllByTestId('academy-link')).toHaveLength(1);
    const disabled = screen.getByTestId('academy-link-disabled');
    expect(disabled.textContent).toContain('Not Live Yet');
    expect(disabled.querySelector('a')).toBeNull();
  });

  it('offers a way back to the form for someone who mistyped the account', () => {
    const onBack = vi.fn();
    renderWith(
      <StudentSignInRefusal academies={[]} onBack={onBack} />,
      identity({})
    );

    fireEvent.click(screen.getByRole('button', { name: /back to sign in/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('AcademyChooser — a signed-in learner on the platform host', () => {
  it('links every academy to its own My Learning, and offers sign out', () => {
    renderWith(
      <AcademyChooser
        titleKey="auth:academyChooser.title"
        descriptionKey="auth:academyChooser.description"
        targetPath="/my-learning"
        showSignOut
      />,
      identity({
        academies: [
          academy(),
          academy({ academyId: 'aca-2', name: 'Nile', host: 'learn.nile.edu' }),
        ],
      })
    );

    const hrefs = screen
      .getAllByTestId('academy-link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('https://elzozo.atlas.app/my-learning');
    expect(hrefs).toContain('https://learn.nile.edu/my-learning');
    expect(screen.getByTestId('academy-chooser-sign-out')).toBeTruthy();
  });

  it('signs the learner out on request — nothing on this host is for them', () => {
    const signOut = vi.fn(() => Promise.resolve());
    renderWith(
      <AcademyChooser
        titleKey="auth:academyChooser.title"
        descriptionKey="auth:academyChooser.description"
        targetPath="/my-learning"
        showSignOut
      />,
      identity({ signOut })
    );

    fireEvent.click(screen.getByTestId('academy-chooser-sign-out'));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  /*
   * A learner has no dashboard to go back to, and offering one would be a
   * link straight into the redirect that sent them here.
   */
  it('offers no "back to the dashboard" escape hatch to a pure learner', () => {
    renderWith(
      <AcademyChooser
        titleKey="auth:academyChooser.title"
        descriptionKey="auth:academyChooser.description"
        targetPath="/my-learning"
        showSignOut
      />,
      identity({ principalKind: 'learner' })
    );

    expect(screen.queryByRole('link', { name: /dashboard/i })).toBeNull();
  });
});

describe('RouteGuard — /dashboard/* is the management surface', () => {
  /** The real subtree shape: ONE guard at the root, plain routes beneath. */
  function renderDashboardAt(path: string, context: IdentityContextValue) {
    return renderWith(
      <Routes>
        <Route
          path="/dashboard"
          element={
            <RouteGuard requireAuthentication requireManagementPrincipal>
              <span data-testid="dashboard">dashboard</span>
            </RouteGuard>
          }
        />
        <Route
          path="/dashboard/*"
          element={
            <RouteGuard requireAuthentication requireManagementPrincipal>
              <span data-testid="dashboard">dashboard</span>
            </RouteGuard>
          }
        />
        <Route
          path="/academy-chooser"
          element={<span data-testid="academy-chooser-route">chooser</span>}
        />
      </Routes>,
      context,
      path
    );
  }

  const deepLinks = [
    '/dashboard',
    '/dashboard/platform',
    '/dashboard/settings',
    '/dashboard/organization/create',
  ];

  it.each(deepLinks)('sends a learner typing %s to the academy chooser', (path) => {
    renderDashboardAt(path, identity({ principalKind: 'learner' }));
    expect(screen.getByTestId('academy-chooser-route')).toBeTruthy();
    expect(screen.queryByTestId('dashboard')).toBeNull();
  });

  it.each(['staff', 'platform_owner', 'unaffiliated'] as const)(
    'lets a %s principal through',
    (principalKind) => {
      renderDashboardAt('/dashboard/platform', identity({ principalKind }));
      expect(screen.getByTestId('dashboard')).toBeTruthy();
      expect(screen.queryByTestId('academy-chooser-route')).toBeNull();
    }
  );

  /*
   * An account whose `/users/me` predates `principalKind` must not be
   * locked out of the workspace it has always had. The backend refuses a
   * learner regardless, so failing open here costs nothing and failing
   * closed would lock out real staff during a rollout.
   */
  it('lets an account with no principalKind at all through', () => {
    const context = identity({});
    const user = { ...(context.user as CurrentUser) } as Record<string, unknown>;
    delete user.principalKind;
    renderDashboardAt('/dashboard', {
      ...context,
      user: user as unknown as CurrentUser,
    } as IdentityContextValue);

    expect(screen.getByTestId('dashboard')).toBeTruthy();
  });
});
