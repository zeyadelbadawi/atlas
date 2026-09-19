/**
 * The Students tab is the Client Owner's view of who registered on their
 * academy website (P64 Phase 1) — the roster that, until this phase,
 * existed only in the database.
 *
 * What these tests pin:
 *
 *  1. The table renders what the server returned, unfiltered and
 *     unsorted locally — every roster row reaching the component is a row
 *     on screen.
 *  2. Search and the status filter travel to the SERVER as query
 *     parameters. This is the one behaviour a client-side filter would
 *     silently break: filtering the current page locally looks identical
 *     on page 1 of a small academy and is wrong for every real one, since
 *     "pending" would then mean "pending among the twenty rows I happen
 *     to be holding".
 *  3. A row opens the drawer for that learner.
 *  4. An instructor's scoped read (`viewerScope: 'assigned_courses'`)
 *     offers no management action.
 *
 * (4) is NOT a security test and must not be read as one. Every one of
 * those actions is refused server-side for an instructor
 * (`errors.academy.insufficientRole`), and that refusal is what protects
 * the roster. What this prevents is the opposite defect: showing someone
 * a Block button that can only ever fail.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type {
  AcademyRosterQuery,
  AcademyRosterStudent,
  AcademyStudentDetail,
} from '@types';

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

const rows: AcademyRosterStudent[] = [
  {
    membershipId: 'm1',
    userId: 'u1',
    name: 'Layla Hassan',
    email: 'layla@example.com',
    accountStatus: 'active',
    emailVerified: true,
    membershipStatus: 'active',
    blocked: false,
    source: 'self_signup',
    joinedAt: '2026-09-01T09:00:00Z',
    lastActivityAt: '2026-09-15T12:00:00Z',
    enrollmentCount: 3,
    activeEnrollmentCount: 2,
  },
  {
    membershipId: 'm2',
    userId: 'u2',
    name: 'Omar Said',
    email: 'omar@example.com',
    accountStatus: 'active',
    emailVerified: false,
    membershipStatus: 'pending',
    blocked: false,
    source: 'invite',
    joinedAt: '2026-09-10T09:00:00Z',
    enrollmentCount: 0,
    activeEnrollmentCount: 0,
  },
];

/** Every query the component has asked the server for, oldest first. */
const queries: AcademyRosterQuery[] = [];

function detailFor(
  viewerScope: AcademyStudentDetail['viewerScope']
): AcademyStudentDetail {
  return {
    student: rows[0],
    enrollments: [],
    quizOutcomes: [],
    assignmentOutcomes: [],
    activeSessionCount: 1,
    viewerScope,
  };
}

let detail: AcademyStudentDetail = detailFor('academy');

/* ------------------------------------------------------------------ *
 * Mocks — the roster hooks are the seam; the network is not under test.
 * ------------------------------------------------------------------ */

const idleMutation = {
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isPending: false,
  error: null,
};

vi.mock('./hooks', () => ({
  useAcademyStudents: (
    _academyId: string,
    options?: { query?: AcademyRosterQuery }
  ) => {
    if (options?.query) queries.push(options.query);
    return {
      data: {
        items: rows,
        pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
  },
  useAcademyStudent: () => ({
    data: detail,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useBlockAcademyStudent: () => idleMutation,
  useUnblockAcademyStudent: () => idleMutation,
  useApproveAcademyStudent: () => idleMutation,
  useRejectAcademyStudent: () => idleMutation,
  useEnrollAcademyStudent: () => idleMutation,
  useRevokeRosterEnrollment: () => idleMutation,
  useUpdateRosterEnrollmentExpiry: () => idleMutation,
}));

vi.mock('@app/providers', () => ({
  useToast: () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }),
  useConfirmDialog: () => ({ confirm: async () => true }),
}));

vi.mock('@features/learning', () => ({
  getQuizAttemptStatusTone: () => 'neutral',
  getSubmissionStatusTone: () => 'neutral',
}));

// The enroll dialog's course picker. Mocked at the feature barrel the
// dialog actually imports from, so nothing pulls the Course feature's
// pages into this suite.
vi.mock('@features/course', () => ({
  useCourses: () => ({ data: { items: [] }, isLoading: false }),
}));

/*
  The status and sort controls are Radix `Select`s. Opening one in jsdom
  never completes — Radix's positioning work depends on layout APIs jsdom
  does not implement, and the click that opens it hangs rather than
  failing — so a real interaction with the filter cannot be expressed
  against the real primitive.

  This replaces ONLY that presentation primitive with the native control
  it stands in for. Everything under test is untouched: the component's
  own `onValueChange`, the state it sets and the query it builds from that
  state are exactly the production ones. What is given up is coverage of
  Radix's own popup, which is not this component's code.
*/
vi.mock('@/components/ui/select', async () => {
  const React = await import('react');
  type AnyProps = Record<string, unknown> & {
    readonly children?: React.ReactNode;
  };

  /** The accessible name lives on the trigger; the native control needs it. */
  const labelOf = (children: React.ReactNode): string | undefined => {
    let label: string | undefined;
    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return;
      const value = (child.props as Record<string, unknown>)['aria-label'];
      if (typeof value === 'string') label = value;
    });
    return label;
  };

  return {
    Select: ({ value, onValueChange, children }: AnyProps) =>
      React.createElement(
        'select',
        {
          'aria-label': labelOf(children),
          value: value as string,
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
            (onValueChange as (next: string) => void)(event.target.value),
        },
        children
      ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: AnyProps) =>
      React.createElement(React.Fragment, null, children),
    SelectItem: ({ value, children }: AnyProps) =>
      React.createElement('option', { value: value as string }, children),
  };
});

const { AcademyStudentsTab } = await import('./components/AcademyStudentsTab');

/* ------------------------------------------------------------------ */

beforeAll(() => {
  // Radix's Select and Sheet drive pointer capture and scrolling, neither
  // of which jsdom implements. Stubbing them is what lets a real click
  // reach the component instead of the test poking state directly.
  const proto = window.HTMLElement.prototype as unknown as Record<
    string,
    unknown
  >;
  proto.hasPointerCapture = () => false;
  proto.setPointerCapture = () => undefined;
  proto.releasePointerCapture = () => undefined;
  proto.scrollIntoView = () => undefined;
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
  queries.length = 0;
  detail = detailFor('academy');
  vi.clearAllMocks();
});

/*
  One instance for the whole file. `createI18nInstance` builds and parses
  every namespace in the product; doing that per render made the suite
  slower with each test rather than each test slow on its own.
*/
const i18n = createI18nInstance('en');

function renderTab() {
  return render(
    <I18nextProvider i18n={i18n}>
      <AcademyStudentsTab academyId="academy-1" />
    </I18nextProvider>
  );
}

/**
 * `delay: null` and `pointerEventsCheck: 0` are not cosmetic here.
 * The roster renders a full data table plus two Radix Selects and a Sheet,
 * and user-event's default per-event delay and its `pointer-events`
 * walk over that tree (a `getComputedStyle` per ancestor, per event) take
 * long enough in jsdom to exhaust the test timeout before a single click
 * lands. Neither option changes what the component receives — the same
 * real pointer/keyboard events are dispatched.
 */
const USER_EVENT_OPTIONS = { delay: null, pointerEventsCheck: 0 } as const;

/** Interactions on this tree are slow in jsdom; see `USER_EVENT_OPTIONS`. */
const INTERACTION_TIMEOUT = 30_000;

/** The query the component most recently asked the server for. */
function latestQuery(): AcademyRosterQuery {
  return queries[queries.length - 1];
}

describe('AcademyStudentsTab', () => {
  it('renders a row per learner the server returned', () => {
    renderTab();

    expect(screen.getByText('Layla Hassan')).toBeTruthy();
    expect(screen.getByText('layla@example.com')).toBeTruthy();
    expect(screen.getByText('Omar Said')).toBeTruthy();
    // Both rows are activatable — the drawer is how the roster is read.
    expect(
      screen.getAllByRole('button', { name: /Layla Hassan/ }).length
    ).toBeGreaterThan(0);
  });

  it('asks the server for page 1 sorted by newest first, with no filter', () => {
    renderTab();

    const query = latestQuery();
    expect(query.page).toBe(1);
    expect(query.sortBy).toBe('joinedAt');
    expect(query.sortDir).toBe('desc');
    expect(query.search).toBeUndefined();
    expect(query.status).toBeUndefined();
  });

  it(
    'sends the search term to the server once typing settles',
    async () => {
      const user = userEvent.setup(USER_EVENT_OPTIONS);
      renderTab();

      await user.type(screen.getByRole('searchbox'), 'omar');
      // `SearchInput` debounces: the keystrokes themselves must not each
      // become a roster request.
      expect(latestQuery().search).toBeUndefined();

      await waitFor(() => expect(latestQuery().search).toBe('omar'), {
        timeout: 5_000,
      });
    },
    INTERACTION_TIMEOUT
  );

  it(
    'sends the status filter to the server rather than filtering the page locally',
    async () => {
      const user = userEvent.setup(USER_EVENT_OPTIONS);
      renderTab();

      await user.selectOptions(
        screen.getByRole('combobox', { name: /filter by status/i }),
        'pending'
      );

      await waitFor(() => expect(latestQuery().status).toBe('pending'));
      // Both server rows are still on screen: the component did not take it
      // upon itself to hide the one whose status does not match.
      expect(screen.getByText('Layla Hassan')).toBeTruthy();
    },
    INTERACTION_TIMEOUT
  );

  it(
    'opens the drawer for the learner whose row was activated',
    async () => {
      const user = userEvent.setup(USER_EVENT_OPTIONS);
      renderTab();

      await user.click(
        screen.getAllByRole('button', { name: /Layla Hassan/ })[0]
      );

      const drawer = await screen.findByRole('dialog');
      expect(drawer.textContent).toContain('Layla Hassan');
      expect(drawer.textContent).toContain('Active sessions');
    },
    INTERACTION_TIMEOUT
  );

  it(
    'offers management actions when the viewer manages the academy',
    async () => {
      const user = userEvent.setup(USER_EVENT_OPTIONS);
      renderTab();

      await user.click(
        screen.getAllByRole('button', { name: /Layla Hassan/ })[0]
      );
      await screen.findByRole('dialog');

      expect(screen.queryByTestId('student-actions')).toBeTruthy();
      expect(screen.getByRole('button', { name: /^Block$/ })).toBeTruthy();
    },
    INTERACTION_TIMEOUT
  );

  it(
    'offers no management action on an instructor’s course-scoped read',
    async () => {
      detail = detailFor('assigned_courses');
      const user = userEvent.setup(USER_EVENT_OPTIONS);
      renderTab();

      await user.click(
        screen.getAllByRole('button', { name: /Layla Hassan/ })[0]
      );
      const drawer = await screen.findByRole('dialog');

      expect(screen.queryByTestId('student-actions')).toBeNull();
      expect(screen.queryByRole('button', { name: /^Block$/ })).toBeNull();
      expect(
        screen.queryByRole('button', { name: /Enroll in a course/ })
      ).toBeNull();
      // And it says why, rather than simply showing nothing.
      expect(drawer.textContent).toContain('through the courses you teach');
    },
    INTERACTION_TIMEOUT
  );
});
