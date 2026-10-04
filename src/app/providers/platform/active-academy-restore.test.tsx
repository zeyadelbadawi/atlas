/**
 * The active academy after a page load (W5 — academy switching isolation).
 *
 * HISTORY. `setActiveAcademy` used to persist to one per-BROWSER key
 * (`atlas:active-academy`) that was read back on every load. That made a
 * third source of truth beside the URL and the page: two tabs diverged, a
 * reload adopted the other tab's academy, and another account's academy
 * could leak into this session (F1, F6).
 *
 * NOW. Inside `/dashboard/academy/:academyId/*` the URL is the only truth
 * (mirrored by `AcademyScopeProvider`). Elsewhere the sidebar still needs
 * an academy for its links — the reason the old restore existed (Courses,
 * Members, Website… vanished on refresh) — so `useActiveAcademyReconciliation`
 * seeds it from the "last academy" preference keyed by USER and
 * ORGANIZATION, and only if the server still lists that academy for the
 * caller.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { STORAGE_KEYS } from '@constants';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import {
  academyService,
  useActiveAcademyReconciliation,
  writeLastAcademy,
} from '@features/academy';
import type { Academy, PaginatedResult } from '@types';
import { AtlasPlatformProvider } from './PlatformProvider';
import { usePlatform } from '@hooks';

function ActiveAcademyProbe(): JSX.Element {
  const { activeAcademyId } = usePlatform();
  return <span data-testid="probe">{activeAcademyId ?? 'none'}</span>;
}

function ReconciledProbe(): JSX.Element {
  useActiveAcademyReconciliation();
  return <ActiveAcademyProbe />;
}

function renderProvider() {
  return render(
    <AtlasPlatformProvider>
      <ActiveAcademyProbe />
    </AtlasPlatformProvider>
  );
}

function academy(id: string, status: Academy['status'] = 'active'): Academy {
  return {
    id,
    organizationId: 'org-1',
    name: id,
    slug: id,
    status,
    timezone: 'UTC',
    language: 'en',
    currency: 'USD',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };
}

function identityFor(userId: string): IdentityContextValue {
  return {
    user: { id: userId, roles: [], organizations: [] },
    organization: { id: 'org-1', name: 'Nile', role: 'owner', permissions: [] },
  } as unknown as IdentityContextValue;
}

function renderReconciled(userId: string, path = '/dashboard/profile') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <IdentityContext.Provider value={identityFor(userId)}>
        <AtlasPlatformProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="*" element={<ReconciledProbe />} />
            </Routes>
          </MemoryRouter>
        </AtlasPlatformProvider>
      </IdentityContext.Provider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.spyOn(academyService, 'getAcademies').mockResolvedValue({
    items: [academy('academy-1'), academy('academy-2')],
    pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
  } as unknown as PaginatedResult<Academy>);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('AtlasPlatformProvider — no per-browser academy', () => {
  it('never adopts the retired per-browser key, and deletes it', () => {
    localStorage.setItem(STORAGE_KEYS.activeAcademy, 'academy-of-another-tab');
    renderProvider();
    expect(screen.getByTestId('probe').textContent).toBe('none');
    expect(localStorage.getItem(STORAGE_KEYS.activeAcademy)).toBeNull();
  });

  it('ignores an academy smuggled into the preferences blob, and survives a corrupt one', () => {
    localStorage.setItem(
      STORAGE_KEYS.userPreferences,
      JSON.stringify({ sidebarCollapsed: true, activeAcademyId: 'academy-x' })
    );
    renderProvider();
    expect(screen.getByTestId('probe').textContent).toBe('none');
    cleanup();

    localStorage.setItem(STORAGE_KEYS.userPreferences, '{not json');
    renderProvider();
    expect(screen.getByTestId('probe').textContent).toBe('none');
  });
});

describe('useActiveAcademyReconciliation — outside any academy', () => {
  it("seeds the sidebar's academy from THIS user's last academy in this organization", async () => {
    writeLastAcademy({ userId: 'u1', organizationId: 'org-1' }, 'academy-2');
    renderReconciled('u1');
    await waitFor(() =>
      expect(screen.getByTestId('probe').textContent).toBe('academy-2')
    );
  });

  it("never adopts another account's last academy (same browser)", async () => {
    writeLastAcademy(
      { userId: 'someone-else', organizationId: 'org-1' },
      'academy-2'
    );
    renderReconciled('u1');
    // Falls back to the first academy the server lists for THIS caller.
    await waitFor(() =>
      expect(screen.getByTestId('probe').textContent).toBe('academy-1')
    );
  });

  it('replaces a remembered academy the server no longer lists for the caller', async () => {
    writeLastAcademy(
      { userId: 'u1', organizationId: 'org-1' },
      'revoked-academy'
    );
    renderReconciled('u1');
    await waitFor(() =>
      expect(screen.getByTestId('probe').textContent).toBe('academy-1')
    );
  });

  it('stays out of the way inside an academy URL (the URL is the truth there)', async () => {
    writeLastAcademy({ userId: 'u1', organizationId: 'org-1' }, 'academy-2');
    renderReconciled('u1', '/dashboard/academy/academy-1/members');
    await act(async () => {
      await Promise.resolve();
    });
    // Nothing seeded from storage; the scope provider (not mounted here)
    // is what mirrors the URL.
    expect(screen.getByTestId('probe').textContent).toBe('none');
  });
});

/*
 * 22 Sep 2026 authorization audit — academies are organization-scoped, so
 * switching organizations must drop the remembered academy instead of
 * letting the sidebar build links the API is guaranteed to refuse.
 */
describe('AtlasPlatformProvider — organization switch', () => {
  it('forgets the active academy when the organization changes', async () => {
    function Setter(): JSX.Element {
      const { setActiveAcademy } = usePlatform();
      return (
        <button
          type="button"
          onClick={() => setActiveAcademy('academy-of-org-a')}
        >
          set
        </button>
      );
    }
    render(
      <AtlasPlatformProvider>
        <Setter />
        <ActiveAcademyProbe />
      </AtlasPlatformProvider>
    );
    await act(async () => {
      screen.getByRole('button', { name: 'set' }).click();
    });
    expect(screen.getByTestId('probe').textContent).toBe('academy-of-org-a');

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('atlas:organization-switched', {
          detail: { organizationId: 'org-b' },
        })
      );
    });

    expect(screen.getByTestId('probe').textContent).toBe('none');
  });
});
