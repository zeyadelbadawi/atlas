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

/*
 * New Customer Onboarding — the owner of an organization whose setup is
 * still open lands on `/onboarding` from `/dashboard`, and NOBODY else is
 * routed: not a manager, instructor or learner, not an owner who finished
 * or deferred, not a Platform Owner, and never from a deep link.
 */
describe('DashboardIndexRoute — first-login onboarding routing', () => {
  function membership(
    role: string,
    onboardingPending: boolean | undefined,
    organizationId = 'org-1'
  ) {
    return {
      organizationId,
      organizationName: 'Nile',
      role,
      permissions: [],
      isPrimary: true,
      joinedAt: '2026-09-26T00:00:00Z',
      ...(onboardingPending === undefined ? {} : { onboardingPending }),
    };
  }

  function renderRouted(
    organizations: ReturnType<typeof membership>[],
    options: {
      readonly roles?: string[];
      readonly activeOrganizationId?: string;
      readonly url?: string;
    } = {}
  ) {
    const identity = {
      user: {
        id: 'u1',
        name: 'T',
        email: 't@atlas.dev',
        roles: options.roles ?? [],
        organizations,
      },
      organization: options.activeOrganizationId === undefined && organizations.length === 0
        ? undefined
        : { id: options.activeOrganizationId ?? 'org-1', name: 'Nile', role: organizations[0]?.role ?? '', permissions: [] },
    } as unknown as IdentityContextValue;

    return render(
      <IdentityContext.Provider value={identity}>
        <MemoryRouter initialEntries={[options.url ?? '/dashboard']}>
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
              path="/dashboard/tenant/usage"
              element={<span data-testid="deep-link">usage</span>}
            />
            <Route
              path="/dashboard/platform"
              element={<span data-testid="platform-dashboard">platform</span>}
            />
            <Route
              path="/onboarding"
              element={<span data-testid="onboarding">onboarding</span>}
            />
          </Routes>
        </MemoryRouter>
      </IdentityContext.Provider>
    );
  }

  it('sends the owner of a pending organization to /onboarding', () => {
    renderRouted([membership('owner', true)]);
    expect(screen.getByTestId('onboarding')).toBeTruthy();
    expect(screen.queryByTestId('tenant-dashboard')).toBeNull();
  });

  it('leaves an owner who finished or deferred setup on the dashboard', () => {
    renderRouted([membership('owner', false)]);
    expect(screen.getByTestId('tenant-dashboard')).toBeTruthy();
  });

  it('leaves an owner whose session predates the field on the dashboard', () => {
    renderRouted([membership('owner', undefined)]);
    expect(screen.getByTestId('tenant-dashboard')).toBeTruthy();
  });

  it('never routes a manager, instructor or learner, even if a flag were set', () => {
    for (const role of ['manager', 'instructor', 'student']) {
      const { getByTestId, unmount } = renderRouted([membership(role, true)]);
      expect(getByTestId('tenant-dashboard')).toBeTruthy();
      unmount();
    }
  });

  it('sends a Platform Owner to the platform dashboard, never to setup', () => {
    renderRouted([membership('owner', true)], { roles: ['platform_owner'] });
    expect(screen.getByTestId('platform-dashboard')).toBeTruthy();
  });

  it('judges the ACTIVE organization, not another pending one', () => {
    renderRouted(
      [membership('owner', true, 'org-1'), membership('owner', false, 'org-2')],
      { activeOrganizationId: 'org-2' }
    );
    expect(screen.getByTestId('tenant-dashboard')).toBeTruthy();
  });

  it('does not trap a deep link', () => {
    renderRouted([membership('owner', true)], { url: '/dashboard/tenant/usage' });
    expect(screen.getByTestId('deep-link')).toBeTruthy();
    expect(screen.queryByTestId('onboarding')).toBeNull();
  });
});
