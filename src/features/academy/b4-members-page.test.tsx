/**
 * B4 (UX audit) — Members page: V27 search-empty copy, V34 per-tab
 * subtitle and Add student on the Students tab. Same harness as
 * members-add-actions-by-role.test.tsx.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
        items: [
          {
            id: 'm-1',
            academyId: 'aca-1',
            userId: 'u-9',
            name: 'Omar Teacher',
            email: 'omar@example.com',
            role: 'instructor',
            status: 'active',
            joinedAt: '2026-10-01T00:00:00.000Z',
          },
        ],
        pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
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
  CreateAcademyStudentDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="add-student-dialog" /> : null,
}));
vi.mock('./components/AcademyStudentsTab', () => ({
  AcademyStudentsTab: ({ onAddStudent }: { onAddStudent?: () => void }) =>
    onAddStudent ? (
      <button type="button" onClick={onAddStudent}>
        Add student from tab
      </button>
    ) : null,
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

function renderPage(url = '/dashboard/academy/aca-1/members') {
  render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <AcademyScopeContext.Provider value={scope('owner')}>
        <MemoryRouter initialEntries={[url]}>
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

describe('Members page — B4', () => {
  it('V27 — a search with no match says so, not "no members yet"', () => {
    renderPage();
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'zzzz-nobody' },
    });
    expect(screen.getByText('No team members match')).toBeTruthy();
    expect(
      screen.queryByText("Your academy doesn't have any members yet.")
    ).toBeNull();
  });

  it('V34 — the Students tab has its own subtitle and its own Add student', () => {
    renderPage('/dashboard/academy/aca-1/members?tab=students');
    expect(
      screen.getByText(
        'See and manage the learners registered on your academy website.'
      )
    ).toBeTruthy();
    expect(screen.queryByText('Manage your academy team members')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Add student from tab' }));
    expect(screen.getByTestId('add-student-dialog')).toBeTruthy();
  });
});
