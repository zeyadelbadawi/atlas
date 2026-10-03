/**
 * The retired academy wizard's address forwards instead of 404ing.
 *
 * The old `/dashboard/academy/:id/onboarding` wizard kept its progress in
 * `localStorage`; it is gone. Links to it still exist (history, bookmarks,
 * old emails), so the address now forwards: an owner with setup still
 * open to the one server-driven setup shell, anyone else to the academy
 * they were headed for.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import { LegacyAcademyOnboardingRedirect } from './LegacyAcademyOnboardingRedirect';

afterEach(cleanup);

function Where(): JSX.Element {
  const location = useLocation();
  return (
    <span data-testid="where">{`${location.pathname}${location.search}`}</span>
  );
}

function renderAt(role: string, onboardingPending: boolean) {
  const identity = {
    user: {
      id: 'u1',
      roles: [],
      organizations: [
        {
          organizationId: 'org-1',
          organizationName: 'Nile',
          role,
          permissions: [],
          isPrimary: true,
          joinedAt: '2026-09-26T00:00:00Z',
          onboardingPending,
        },
      ],
    },
    organization: { id: 'org-1', name: 'Nile', role, permissions: [] },
  } as unknown as IdentityContextValue;

  return render(
    <IdentityContext.Provider value={identity}>
      <MemoryRouter initialEntries={['/dashboard/academy/aca-1/onboarding']}>
        <Routes>
          <Route
            path="/dashboard/academy/:academyId/onboarding"
            element={<LegacyAcademyOnboardingRedirect />}
          />
          <Route path="/onboarding" element={<Where />} />
          <Route path="/dashboard/academy" element={<Where />} />
          <Route path="/dashboard/academy/:academyId" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </IdentityContext.Provider>
  );
}

describe('LegacyAcademyOnboardingRedirect', () => {
  it('sends an owner with setup open to /onboarding', () => {
    renderAt('owner', true);
    expect(screen.getByTestId('where').textContent).toBe('/onboarding');
  });

  it('sends an owner who finished setup to the academy dashboard', () => {
    renderAt('owner', false);
    expect(screen.getByTestId('where').textContent).toBe(
      '/dashboard/academy/aca-1'
    );
  });

  it('sends a manager to the academy dashboard', () => {
    renderAt('manager', true);
    expect(screen.getByTestId('where').textContent).toBe(
      '/dashboard/academy/aca-1'
    );
  });
});
