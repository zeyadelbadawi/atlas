/**
 * The roster keeps its rows on screen while the SAME academy's roster is
 * searched, filtered or paged, and never shows one academy's learners
 * under another. Both come from `useApiQuery`'s key-aware default; the
 * hook used to override it with `keepPreviousData`, which kept the
 * previous academy's rows on screen after switching academy.
 *
 * Drives the real hook against the real query client factory; only the
 * service (the network) and the session are stubbed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@services/query/query-client';
import type { AcademyRosterPage, AcademyRosterQuery } from '@types';

const getStudents =
  vi.fn<(academyId: string, query?: AcademyRosterQuery) => Promise<unknown>>();

vi.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => ({ organization: { id: 'org-1' } }),
}));
vi.mock('./services/AcademyRosterService', () => ({
  academyRosterService: {
    getStudents: (academyId: string, query?: AcademyRosterQuery) =>
      getStudents(academyId, query),
  },
}));

const { useAcademyStudents } = await import('./hooks/useAcademyStudents');

afterEach(() => {
  cleanup();
  getStudents.mockReset();
});

function rosterOf(name: string): AcademyRosterPage {
  return {
    items: [{ membershipId: name, name } as AcademyRosterPage['items'][number]],
    pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
  };
}

/** One client per test, shared across rerenders like the app's. */
function makeWrapper() {
  const client = createQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const never = () => new Promise<never>(() => undefined);

describe('useAcademyStudents placeholder data', () => {
  it("does not keep the previous academy's rows when the academy changes", async () => {
    getStudents.mockImplementation((academyId) =>
      academyId === 'a1' ? Promise.resolve(rosterOf('Layla')) : never()
    );
    const { result, rerender } = renderHook(
      ({ academyId }: { academyId: string }) => useAcademyStudents(academyId),
      { wrapper: makeWrapper(), initialProps: { academyId: 'a1' } }
    );
    await waitFor(() =>
      expect(result.current.data?.items[0]?.name).toBe('Layla')
    );

    rerender({ academyId: 'a2' });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isPlaceholderData).toBe(false);
  });

  it('keeps the rows on screen while the same academy is searched', async () => {
    getStudents.mockImplementation((_academyId, query) =>
      query?.search ? never() : Promise.resolve(rosterOf('Layla'))
    );
    const { result, rerender } = renderHook(
      ({ search }: { search?: string }) =>
        useAcademyStudents('a1', { query: search ? { search } : {} }),
      { wrapper: makeWrapper(), initialProps: {} as { search?: string } }
    );
    await waitFor(() =>
      expect(result.current.data?.items[0]?.name).toBe('Layla')
    );

    rerender({ search: 'om' });

    expect(result.current.data?.items[0]?.name).toBe('Layla');
    expect(result.current.isPlaceholderData).toBe(true);
  });
});
