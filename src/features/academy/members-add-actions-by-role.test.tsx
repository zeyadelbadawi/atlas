/**
 * B0-ORG-02 — the Members page offers only the adds the server accepts
 * (`assertCanAddMember`): a student needs the academy-owner role; an
 * instructor or manager also needs the organization owner. A manager (or
 * anyone else) sees no add button, and a one-line note instead.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { AcademyScopeContext } from './scope/academy-scope.context';
import type { AcademyScopeValue } from './scope/academy-scope.context';
import type { AcademyStaffRole } from '@types';

let orgRole = 'owner';

vi.mock('@hooks', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useAuth: () => ({
      organization: { id: 'org-1', role: orgRole },
      user: { id: 'u-1' },
    }),
  };
});
vi.mock('@app/providers', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useConfirmDialog: () => ({ confirm: vi.fn() }),
    useToast: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
  };
});
vi.mock('./hooks', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useAcademy: () => ({
      data: { id: 'aca-1', name: 'Nile Academy', organizationId: 'org-1' },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }),
    useAcademyMembers: () => ({
      data: {
        items: [],
        pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }),
    useRemoveAcademyMember: () => ({ mutateAsync: vi.fn(), isPending: false }),
  };
});
vi.mock('./components/AddAcademyManagerDialog', () => ({
  AddAcademyManagerDialog: () => null,
}));
vi.mock('./components/AddAcademyInstructorDialog', () => ({
  AddAcademyInstructorDialog: () => null,
}));
vi.mock('./components/CreateAcademyStudentDialog', () => ({
  CreateAcademyStudentDialog: () => null,
}));

const { default: AcademyMembersPage } =
  await import('./pages/AcademyMembersPage');

afterEach(cleanup);

function scope(role: AcademyStaffRole): AcademyScopeValue {
  return {
    academyId: 'aca-1',
    membership: {
      academy: {
        id: 'aca-1',
        organizationId: 'org-1',
        name: 'Nile Academy',
        slug: 'nile',
        status: 'active',
        language: 'en',
      },
      role,
    } as AcademyScopeValue['membership'],
    isResolving: false,
    error: null,
    lostAcademyIds: new Set(),
    isCurrentAcademy: (id) => id === 'aca-1',
  };
}

function renderAs(role: AcademyStaffRole, organizationRole: string) {
  orgRole = organizationRole;
  render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <AcademyScopeContext.Provider value={scope(role)}>
        <MemoryRouter initialEntries={['/dashboard/academy/aca-1/members']}>
          <Routes>
            <Route
              path="/dashboard/academy/:academyId/members"
              element={<AcademyMembersPage />}
            />
          </Routes>
        </MemoryRouter>
      </AcademyScopeContext.Provider>
    </I18nextProvider>
  );
}

const button = (name: string) => screen.queryByRole('button', { name });

describe('Members page — add actions by role', () => {
  it('organization owner who owns the academy sees every add', () => {
    renderAs('owner', 'owner');
    expect(button('Add Student')).toBeTruthy();
    expect(button('Add Instructor')).toBeTruthy();
    expect(button('Add Manager')).toBeTruthy();
    expect(screen.queryByTestId('members-owner-only-note')).toBeNull();
  });

  it('an academy owner who is not the organization owner adds students only', () => {
    renderAs('owner', 'member');
    expect(button('Add Student')).toBeTruthy();
    expect(button('Add Instructor')).toBeNull();
    expect(button('Add Manager')).toBeNull();
  });

  it.each(['manager', 'administrator', 'instructor', 'staff'] as const)(
    'a %s sees no add button, only the note',
    (role) => {
      renderAs(role, 'member');
      expect(button('Add Student')).toBeNull();
      expect(button('Add Instructor')).toBeNull();
      expect(button('Add Manager')).toBeNull();
      expect(screen.getByTestId('members-owner-only-note').textContent).toBe(
        'Only the account owner can add people.'
      );
    }
  );
});
