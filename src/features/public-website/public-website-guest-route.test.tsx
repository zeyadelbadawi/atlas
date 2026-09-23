/**
 * Issue B — an already-authenticated learner must not sit on the academy
 * website's credential-entry routes (Sign In / Sign Up); a valid session
 * deterministically redirects away, while an unauthenticated (or still
 * restoring) visitor reaches them normally.
 *
 * The guard is the route-level enforcement (`PublicWebsiteGuestRoute`),
 * exercised here through a real `MemoryRouter` so the redirect is the
 * genuine render-phase `<Navigate replace>` — the same behaviour a direct
 * URL, a refresh, back/forward or an in-app link all hit. Access control
 * itself is the backend's; what is proven here is the client routing rule.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import type { CurrentUser, Session } from '@types';
import { PublicWebsiteGuestRoute } from './components/PublicWebsiteGuestRoute';

afterEach(cleanup);

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

function identity(session: Session): IdentityContextValue {
  return {
    session,
    user: session.status === 'authenticated' ? user : undefined,
    isAuthenticated: session.status === 'authenticated',
    isRestoring: session.status === 'restoring',
    organization: undefined,
    signOut: () => Promise.resolve(),
  } as unknown as IdentityContextValue;
}

function renderAt(session: Session, entry: string) {
  return render(
    <IdentityContext.Provider value={identity(session)}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route
            path="/sign-in"
            element={
              <PublicWebsiteGuestRoute locale="en">
                <span data-testid="sign-in-form">sign in</span>
              </PublicWebsiteGuestRoute>
            }
          />
          <Route
            path="/sign-up"
            element={
              <PublicWebsiteGuestRoute locale="en">
                <span data-testid="sign-up-form">sign up</span>
              </PublicWebsiteGuestRoute>
            }
          />
          <Route
            path="/ar/sign-in"
            element={
              <PublicWebsiteGuestRoute locale="ar">
                <span data-testid="sign-in-form-ar">sign in ar</span>
              </PublicWebsiteGuestRoute>
            }
          />
          <Route
            path="/my"
            element={<span data-testid="learner-dashboard">dashboard</span>}
          />
          <Route
            path="/ar/my"
            element={
              <span data-testid="learner-dashboard-ar">dashboard ar</span>
            }
          />
          <Route
            path="/my-learning/courses/:courseId"
            element={<span data-testid="course">course</span>}
          />
        </Routes>
      </MemoryRouter>
    </IdentityContext.Provider>
  );
}

const authed: Session = { status: 'authenticated', user };
const anon: Session = { status: 'unauthenticated' };
const restoring: Session = { status: 'restoring' };

describe('PublicWebsiteGuestRoute — unauthenticated visitors reach the auth routes', () => {
  it('renders Sign In for an unauthenticated visitor', () => {
    renderAt(anon, '/sign-in');
    expect(screen.getByTestId('sign-in-form')).toBeTruthy();
  });

  it('renders Sign Up for an unauthenticated visitor (account creation is untouched)', () => {
    renderAt(anon, '/sign-up');
    expect(screen.getByTestId('sign-up-form')).toBeTruthy();
  });

  it('renders Sign In while the session is still restoring', () => {
    renderAt(restoring, '/sign-in');
    expect(screen.getByTestId('sign-in-form')).toBeTruthy();
  });

  it('carries an invitation-style deep link through to the form when unauthenticated', () => {
    renderAt(anon, '/sign-up?inviteToken=abc123');
    expect(screen.getByTestId('sign-up-form')).toBeTruthy();
  });
});

describe('PublicWebsiteGuestRoute — an authenticated learner is redirected away', () => {
  it('redirects an authenticated learner off Sign In to the learner dashboard', () => {
    renderAt(authed, '/sign-in');
    expect(screen.getByTestId('learner-dashboard')).toBeTruthy();
    expect(screen.queryByTestId('sign-in-form')).toBeNull();
  });

  it('redirects an authenticated learner off Sign Up to the learner dashboard', () => {
    renderAt(authed, '/sign-up');
    expect(screen.getByTestId('learner-dashboard')).toBeTruthy();
    expect(screen.queryByTestId('sign-up-form')).toBeNull();
  });

  it('a manually typed auth URL with query params cannot bypass the redirect', () => {
    renderAt(authed, '/sign-up?foo=bar&x=1');
    expect(screen.getByTestId('learner-dashboard')).toBeTruthy();
  });

  it('a fresh mount (refresh) on an auth route stays redirected', () => {
    const first = renderAt(authed, '/sign-in');
    expect(screen.getByTestId('learner-dashboard')).toBeTruthy();
    first.unmount();
    renderAt(authed, '/sign-in');
    expect(screen.getByTestId('learner-dashboard')).toBeTruthy();
  });

  it('keeps the locale prefix when redirecting from the Arabic Sign In route', () => {
    renderAt(authed, '/ar/sign-in');
    expect(screen.getByTestId('learner-dashboard-ar')).toBeTruthy();
  });
});

describe('PublicWebsiteGuestRoute — returnTo behaviour stays safe', () => {
  it('honours a same-site relative returnTo', () => {
    renderAt(authed, '/sign-in?returnTo=%2Fmy-learning%2Fcourses%2Fc1');
    expect(screen.getByTestId('course')).toBeTruthy();
  });

  it.each(['//evil.example', 'https://evil.example/', '/\\evil.example'])(
    'refuses %s as a returnTo and falls back to the learner dashboard',
    (hostile) => {
      renderAt(authed, `/sign-in?returnTo=${encodeURIComponent(hostile)}`);
      expect(screen.getByTestId('learner-dashboard')).toBeTruthy();
    }
  );
});

describe('PublicWebsiteGuestRoute — an expired/invalid session reopens the auth routes', () => {
  it('renders Sign In again once the session is unauthenticated', () => {
    renderAt(anon, '/sign-in');
    expect(screen.getByTestId('sign-in-form')).toBeTruthy();
    expect(screen.queryByTestId('learner-dashboard')).toBeNull();
  });
});
