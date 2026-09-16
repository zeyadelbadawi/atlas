/**
 * `/dashboard` sends a Platform Owner to the Platform Dashboard.
 *
 * WHAT THIS PREVENTS. The tenant dashboard reads "my organization's"
 * academies, courses and subscription. A Platform Owner has no
 * organization, so landing there showed an operator a page of zeroes and a
 * subscription notice for an account that will never hold a subscription —
 * the very first screen after sign-in, which is the worst place for the
 * product to look broken.
 *
 * The customer half matters just as much: this must not redirect anyone
 * else, or every tenant loses their own dashboard.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import { DashboardIndexRoute } from './DashboardIndexRoute';

function renderAt(roles: string[]) {
  const identity = {
    user: { id: 'u1', name: 'T', email: 't@atlas.dev', roles },
  } as unknown as IdentityContextValue;

  return render(
    <IdentityContext.Provider value={identity}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <DashboardIndexRoute>
                <span data-testid="tenant-dashboard">tenant dashboard</span>
              </DashboardIndexRoute>
            }
          />
          <Route
            path="/dashboard/platform"
            element={<span data-testid="platform-dashboard">platform dashboard</span>}
          />
        </Routes>
      </MemoryRouter>
    </IdentityContext.Provider>
  );
}

// This project has no global auto-cleanup, so each render is torn down
// explicitly; otherwise `screen` queries the leftovers of earlier cases.
afterEach(cleanup);

describe('DashboardIndexRoute', () => {
  it('redirects a platform owner to the platform dashboard', () => {
    renderAt(['platform_owner']);
    expect(screen.getByTestId('platform-dashboard')).toBeTruthy();
    expect(screen.queryByTestId('tenant-dashboard')).toBeNull();
  });

  it('leaves a tenant on the tenant dashboard', () => {
    renderAt(['organization_owner']);
    expect(screen.getByTestId('tenant-dashboard')).toBeTruthy();
  });

  it('leaves every other role on the tenant dashboard', () => {
    for (const role of ['instructor', 'student', 'staff']) {
      const { getByTestId, unmount } = renderAt([role]);
      expect(getByTestId('tenant-dashboard')).toBeTruthy();
      unmount();
    }
  });
});
