/**
 * W5 — academy switching isolation, through a real data router.
 *
 * The URL is the single source of truth for the active academy; these
 * cases check what a user experiences when it changes:
 *   - `useSwitchAcademy` pushes (Back/Forward work) to the same screen in
 *     the other academy, and the screen REMOUNTS (no state bleeds across);
 *   - unsaved work is asked about first (the app-wide NavigationBlockDialog);
 *   - in-flight reads of the academy being left are cancelled and their late
 *     responses dropped (race guard);
 *   - the switching overlay is bound to the real membership check plus the
 *     first data load, and does not flash on a cached return;
 *   - a 403/404 for the current academy removes its cache, explains, and
 *     redirects; a late 403 for an academy already left changes nothing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useState } from 'react';
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
  useParams,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IdentityContext } from '@app/providers/identity/identity.context';
import type { IdentityContextValue } from '@app/providers/identity/identity.context';
import { AtlasPlatformProvider } from '@app/providers/platform/PlatformProvider';
import { AcademyScopeRoute } from '@app/routes/AcademyScopeRoute';
import {
  NavigationBlockDialog,
  UnsavedChangesProvider,
} from '@features/unsaved-changes';
import { createApiError } from '@api';
import { academyKeys } from '@services/query';
import { useApiQuery, useUnsavedChanges } from '@hooks';
import type { AcademyMembership, PaginatedResult, Academy } from '@types';
import { academyService } from '../services/AcademyService';
import { useSwitchAcademy } from '../hooks/useSwitchAcademy';
import { AcademyScopeProvider } from './AcademyScopeProvider';
import type { AcademyScopeLocationState } from './AcademyScopeProvider';

const notify = vi.fn();
vi.mock('@app/providers/toast/useToast', () => ({
  useToast: () => ({
    notify,
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
    dismissAll: vi.fn(),
  }),
}));

const ORG = 'org-1';
const NOT_A_MEMBER = createApiError('forbidden', {
  status: 403,
  messageKey: 'errors.tenancy.notAMember',
});

function academy(id: string, name: string): Academy {
  return {
    id,
    organizationId: ORG,
    name,
    slug: id,
    status: 'active',
    timezone: 'UTC',
    language: 'en',
    currency: 'EGP',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    viewerRole: 'owner',
  };
}

function membership(id: string, name: string): AcademyMembership {
  return {
    academy: {
      id,
      organizationId: ORG,
      name,
      slug: id,
      status: 'active',
      language: 'en',
    },
    role: 'owner',
    roleSource: 'organization_owner',
    permissions: [],
  };
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (error: unknown) => void;
}
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Per-academy members responses the test controls. */
let membersFetch: (academyId: string) => Promise<string[]>;

/** One academy screen: a query keyed by the academy, local state and a guarded field. */
function MembersScreen(): JSX.Element {
  const { academyId = '' } = useParams();
  const [clicks, setClicks] = useState(0);
  const [draft, setDraft] = useState('');
  useUnsavedChanges({ isDirty: draft !== '' });
  const { data } = useApiQuery<string[]>({
    queryKey: academyKeys.members(ORG, academyId),
    queryFn: () => membersFetch(academyId),
  });
  const { switchAcademy } = useSwitchAcademy();
  return (
    <div>
      <p data-testid="screen-academy">{academyId}</p>
      <p data-testid="rows">{data ? data.join(',') : 'loading'}</p>
      <button type="button" onClick={() => setClicks((n) => n + 1)}>
        bump
      </button>
      <p data-testid="clicks">{clicks}</p>
      <input
        aria-label="draft"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <button type="button" onClick={() => switchAcademy('B')}>
        to-B
      </button>
      <button type="button" onClick={() => switchAcademy('A')}>
        to-A
      </button>
    </div>
  );
}

function ChooserProbe(): JSX.Element {
  const location = useLocation();
  const lost = (location.state as AcademyScopeLocationState | null)
    ?.academyAccessLost;
  return (
    <p data-testid="chooser">{lost ? `lost:${lost.academyId}` : 'chooser'}</p>
  );
}

function Where(): JSX.Element {
  const location = useLocation();
  return <p data-testid="where">{location.pathname}</p>;
}

function Shell(): JSX.Element {
  return (
    <AcademyScopeProvider>
      <Where />
      <AcademyScopeRoute />
      <NavigationBlockDialog />
    </AcademyScopeProvider>
  );
}

const identity = {
  user: {
    id: 'u1',
    roles: [],
    organizations: [
      {
        organizationId: ORG,
        organizationName: 'Nile',
        role: 'owner',
        permissions: [],
        isPrimary: true,
        joinedAt: '2026-10-01T00:00:00Z',
      },
    ],
  },
  organization: { id: ORG, name: 'Nile', role: 'owner', permissions: [] },
  isAuthenticated: true,
} as unknown as IdentityContextValue;

function renderApp(initial = '/dashboard/academy/A/members') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
  });
  const router = createMemoryRouter(
    [
      {
        element: <Shell />,
        children: [
          { path: '/dashboard/academy', element: <ChooserProbe /> },
          {
            path: '/dashboard/academy/:academyId/members',
            element: <MembersScreen />,
          },
        ],
      },
    ],
    { initialEntries: [initial] }
  );
  render(
    <QueryClientProvider client={queryClient}>
      <IdentityContext.Provider value={identity}>
        <AtlasPlatformProvider>
          <UnsavedChangesProvider>
            <RouterProvider router={router} />
          </UnsavedChangesProvider>
        </AtlasPlatformProvider>
      </IdentityContext.Provider>
    </QueryClientProvider>
  );
  return { router, queryClient };
}

const text = (id: string) => screen.getByTestId(id).textContent;
const click = (name: string) =>
  act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });

let membershipFetch: (academyId: string) => Promise<AcademyMembership>;

beforeEach(() => {
  notify.mockReset();
  localStorage.clear();
  membershipFetch = (id) =>
    Promise.resolve(membership(id, id === 'A' ? 'Academy A' : 'Academy B'));
  membersFetch = (id) => Promise.resolve([`${id}-row-1`, `${id}-row-2`]);
  vi.spyOn(academyService, 'getMyMembership').mockImplementation((id) =>
    membershipFetch(id)
  );
  vi.spyOn(academyService, 'getAcademies').mockResolvedValue({
    items: [academy('A', 'Academy A'), academy('B', 'Academy B')],
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  } as PaginatedResult<Academy>);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useSwitchAcademy — navigation', () => {
  it('pushes to the same screen in the other academy; Back and Forward replay it', async () => {
    const { router } = renderApp();
    await waitFor(() => expect(text('rows')).toBe('A-row-1,A-row-2'));

    await click('to-B');
    await waitFor(() => expect(text('rows')).toBe('B-row-1,B-row-2'));
    expect(text('where')).toBe('/dashboard/academy/B/members');

    await act(async () => {
      await router.navigate(-1);
    });
    await waitFor(() => expect(text('screen-academy')).toBe('A'));
    expect(text('rows')).toBe('A-row-1,A-row-2');

    await act(async () => {
      await router.navigate(1);
    });
    await waitFor(() => expect(text('screen-academy')).toBe('B'));
  });

  it('remounts the screen: local state never carries from A to B', async () => {
    renderApp();
    await waitFor(() => expect(text('rows')).toBe('A-row-1,A-row-2'));
    await click('bump');
    await click('bump');
    expect(text('clicks')).toBe('2');

    await click('to-B');
    await waitFor(() => expect(text('screen-academy')).toBe('B'));
    expect(text('clicks')).toBe('0');
  });

  it('never shows A data while B loads (no placeholder across academies)', async () => {
    renderApp();
    await waitFor(() => expect(text('rows')).toBe('A-row-1,A-row-2'));
    const pendingB = deferred<string[]>();
    membersFetch = (id) =>
      id === 'B' ? pendingB.promise : Promise.resolve(['unexpected']);

    await click('to-B');
    await waitFor(() => expect(text('screen-academy')).toBe('B'));
    expect(text('rows')).toBe('loading');
    expect(screen.queryByText(/A-row/)).toBeNull();

    await act(async () => pendingB.resolve(['B-row-1']));
    await waitFor(() => expect(text('rows')).toBe('B-row-1'));
  });
});

describe('useSwitchAcademy — unsaved changes', () => {
  it('asks first; Stay keeps the user and the draft in A, Leave switches', async () => {
    renderApp();
    await waitFor(() => expect(text('rows')).toBe('A-row-1,A-row-2'));
    fireEvent.change(screen.getByLabelText('draft'), {
      target: { value: 'half-typed' },
    });

    await click('to-B');
    expect(await screen.findByTestId('unsaved-stay')).toBeTruthy();
    expect(text('where')).toBe('/dashboard/academy/A/members');

    await act(async () => {
      fireEvent.click(screen.getByTestId('unsaved-stay'));
    });
    expect(text('where')).toBe('/dashboard/academy/A/members');
    expect((screen.getByLabelText('draft') as HTMLInputElement).value).toBe(
      'half-typed'
    );

    await click('to-B');
    await act(async () => {
      fireEvent.click(await screen.findByTestId('unsaved-leave'));
    });
    await waitFor(() =>
      expect(text('where')).toBe('/dashboard/academy/B/members')
    );
    expect((screen.getByLabelText('draft') as HTMLInputElement).value).toBe('');
  });
});

describe('switch lifecycle — cancellation and race guard', () => {
  it("cancels the old academy's in-flight read and drops its late response", async () => {
    const pendingA = deferred<string[]>();
    membersFetch = (id) =>
      id === 'A' ? pendingA.promise : Promise.resolve(['B-row-1']);
    const { queryClient } = renderApp();
    await waitFor(() =>
      expect(
        queryClient.getQueryState(academyKeys.members(ORG, 'A'))?.fetchStatus
      ).toBe('fetching')
    );

    await click('to-B');
    await waitFor(() => expect(text('rows')).toBe('B-row-1'));
    expect(
      queryClient.getQueryState(academyKeys.members(ORG, 'A'))?.fetchStatus
    ).toBe('idle');

    // The old academy's response arrives after the switch: it is not
    // written anywhere, and the screen keeps showing B.
    await act(async () => pendingA.resolve(['A-late-row']));
    expect(
      queryClient.getQueryData(academyKeys.members(ORG, 'A'))
    ).toBeUndefined();
    expect(text('rows')).toBe('B-row-1');
  });

  it('a late 403 for the academy already left does not throw the user out of B', async () => {
    const pendingA = deferred<AcademyMembership>();
    membershipFetch = (id) =>
      id === 'A' ? pendingA.promise : Promise.resolve(membership('B', 'B'));
    renderApp();
    await click('to-B');
    await waitFor(() => expect(text('rows')).toBe('B-row-1,B-row-2'));

    await act(async () => pendingA.reject(NOT_A_MEMBER));
    expect(text('where')).toBe('/dashboard/academy/B/members');
    expect(notify).not.toHaveBeenCalled();
  });
});

describe('switching overlay', () => {
  it('covers the switch until the membership check and the first data load finish', async () => {
    renderApp();
    await waitFor(() => expect(text('rows')).toBe('A-row-1,A-row-2'));
    // A first visit (deep link) is not a switch: no overlay.
    expect(screen.queryByTestId('academy-switching-overlay')).toBeNull();

    const pendingMembership = deferred<AcademyMembership>();
    const pendingRows = deferred<string[]>();
    membershipFetch = () => pendingMembership.promise;
    membersFetch = () => pendingRows.promise;

    await click('to-B');
    const overlay = await screen.findByTestId('academy-switching-overlay');
    expect(overlay.querySelector('[role="status"]')).toBeTruthy();
    expect(overlay.closest('[aria-busy="true"]')).toBeTruthy();

    await act(async () =>
      pendingMembership.resolve(membership('B', 'Academy B'))
    );
    // Still loading the screen's first data.
    expect(screen.queryByTestId('academy-switching-overlay')).toBeTruthy();

    await act(async () => pendingRows.resolve(['B-row-1']));
    await waitFor(() =>
      expect(screen.queryByTestId('academy-switching-overlay')).toBeNull()
    );
  });

  it('does not flash on a return to an academy whose data is cached', async () => {
    renderApp();
    await waitFor(() => expect(text('rows')).toBe('A-row-1,A-row-2'));
    await click('to-B');
    await waitFor(() => expect(text('rows')).toBe('B-row-1,B-row-2'));
    await waitFor(() =>
      expect(screen.queryByTestId('academy-switching-overlay')).toBeNull()
    );

    await click('to-A');
    expect(text('rows')).toBe('A-row-1,A-row-2');
    expect(screen.queryByTestId('academy-switching-overlay')).toBeNull();
  });
});

describe('access lost (403 / 404) for the current academy', () => {
  it('membership refused: removes the academy cache, explains, redirects to the chooser', async () => {
    membershipFetch = (id) =>
      id === 'B'
        ? Promise.reject(NOT_A_MEMBER)
        : Promise.resolve(membership(id, 'Academy A'));
    const { queryClient } = renderApp('/dashboard/academy/B/members');
    // Something of B is cached before the refusal lands.
    queryClient.setQueryData(academyKeys.stats(ORG, 'B'), { totalMembers: 9 });

    await waitFor(() => expect(text('chooser')).toBe('lost:B'));
    expect(text('where')).toBe('/dashboard/academy');
    expect(
      queryClient.getQueryData(academyKeys.stats(ORG, 'B'))
    ).toBeUndefined();
    expect(
      queryClient.getQueryData(academyKeys.members(ORG, 'B'))
    ).toBeUndefined();
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        intent: 'error',
        titleKey: 'academy:switcher.accessLost.title',
        values: { name: 'Academy B' },
      })
    );
    // The inline explanation is on the destination too.
    expect(await screen.findByTestId('academy-access-lost')).toBeTruthy();
  });

  it('academy deleted (404): same exit, with the "no longer available" wording', async () => {
    membershipFetch = () =>
      Promise.reject(
        createApiError('notFound', {
          status: 404,
          messageKey: 'errors.academy.notFound',
        })
      );
    renderApp('/dashboard/academy/B/members');
    await waitFor(() => expect(text('chooser')).toBe('lost:B'));
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        titleKey: 'academy:switcher.accessLost.goneTitle',
      })
    );
  });

  it('revoked mid-session: a "not a member" refusal on any read re-checks membership and exits', async () => {
    renderApp();
    await waitFor(() => expect(text('rows')).toBe('A-row-1,A-row-2'));
    expect(academyService.getMyMembership).toHaveBeenCalledTimes(1);

    // Another owner revokes the membership: every academy read now refuses.
    membershipFetch = () => Promise.reject(NOT_A_MEMBER);
    membersFetch = () => Promise.reject(NOT_A_MEMBER);
    await click('to-B');
    await waitFor(() => expect(text('chooser')).toMatch(/^lost:/));
    expect(text('where')).toBe('/dashboard/academy');
  });

  it('a generic 404 (an API without the membership route) does not exit the academy', async () => {
    membershipFetch = () =>
      Promise.reject(
        createApiError('notFound', {
          status: 404,
          messageKey: 'errors.notFound',
        })
      );
    renderApp();
    await waitFor(() => expect(text('rows')).toBe('A-row-1,A-row-2'));
    expect(text('where')).toBe('/dashboard/academy/A/members');
    expect(notify).not.toHaveBeenCalled();
  });

  it('a role refusal (insufficientRole) is not treated as lost access', async () => {
    renderApp();
    await waitFor(() => expect(text('rows')).toBe('A-row-1,A-row-2'));
    const calls = vi.mocked(academyService.getMyMembership).mock.calls.length;
    membersFetch = () =>
      Promise.reject(
        createApiError('forbidden', {
          status: 403,
          messageKey: 'errors.academy.insufficientRole',
        })
      );
    await click('to-B');
    await waitFor(() => expect(text('screen-academy')).toBe('B'));
    expect(text('where')).toBe('/dashboard/academy/B/members');
    // Only the switch's own membership check ran — no re-check, no exit.
    expect(vi.mocked(academyService.getMyMembership).mock.calls.length).toBe(
      calls + 1
    );
    expect(notify).not.toHaveBeenCalled();
  });
});
