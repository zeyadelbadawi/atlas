/**
 * A signed-out visit to a protected page goes to sign-in carrying the page
 * as `?redirect=`, so a deep link (the marketing site's
 * `/dashboard/academy?open=payments`) lands where it pointed once signed
 * in. SignInPage is what validates and follows it (`isSafeReturnPath`).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';

vi.mock('@features/tenant', () => ({
  useSubscriptionLifecycleState: () => ({ state: undefined, isLoading: false }),
}));

import { RouteGuard } from './RouteGuard';
import { AUTH_ROUTES, AUTHENTICATED_ENTRY_ROUTE } from '../route-paths';

afterEach(cleanup);

const signedOut = {
  user: null,
  isAuthenticated: false,
  isRestoring: false,
  organization: undefined,
} as unknown as IdentityContextValue;

function SignInProbe() {
  const location = useLocation();
  return (
    <p data-testid="sign-in">{`${location.pathname}${location.search}`}</p>
  );
}

function visit(entry: string) {
  render(
    <IdentityContext.Provider value={signedOut}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path={AUTH_ROUTES.signIn} element={<SignInProbe />} />
          <Route
            path="/dashboard/*"
            element={
              <RouteGuard requireAuthentication>
                <p>protected</p>
              </RouteGuard>
            }
          />
        </Routes>
      </MemoryRouter>
    </IdentityContext.Provider>
  );
  return screen.getByTestId('sign-in').textContent ?? '';
}

describe('RouteGuard — sign-in comes back to the requested page', () => {
  it('carries the path and query of a deep link', () => {
    const target = visit('/dashboard/academy?open=payments');
    const url = new URL(target, 'https://dashboard.example');
    expect(url.pathname).toBe(AUTH_ROUTES.signIn);
    expect(url.searchParams.get('redirect')).toBe(
      '/dashboard/academy?open=payments'
    );
  });

  it('adds nothing for the dashboard entry itself', () => {
    expect(visit(AUTHENTICATED_ENTRY_ROUTE)).toBe(AUTH_ROUTES.signIn);
  });
});
