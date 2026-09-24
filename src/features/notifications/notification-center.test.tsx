/**
 * The notification centre — bell popover and management page.
 *
 * WHAT THESE PROTECT:
 *
 * 1. THE BELL OPENS A POPOVER THAT CAN ACT. The previous bell was a link;
 *    the badge invited a click that cost a page change. A regression back
 *    to a bare link would pass every "renders a bell" test, so what is
 *    asserted is the popover's contents and that its buttons reach the
 *    mutations with the right ids.
 *
 * 2. FILTERS ARE SERVER-SIDE. The page must send `type`/`priority` in the
 *    query, not thin one page locally. Asserted through what the list
 *    hook receives, which is the only place the difference is visible.
 *
 * 3. UNREAD IS NOT COLOUR ALONE, AND THE ACTION IS A REAL LINK. Both are
 *    accessibility rules that survive a visual review and die in a
 *    refactor: an `sr-only` prefix and an `href` are what is checked.
 *
 * Every hook is mocked at the feature's hook barrel, so nothing reaches
 * the network and no identity/toast providers are needed.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AtlasLocalizationProvider } from '@app/providers/localization/LocalizationProvider';
import type { Notification } from '@types';

const useNotifications = vi.fn();
const useNotificationSummary = vi.fn();
const markRead = vi.fn();
const markAllRead = vi.fn();

/*
 * The popover primitives are stubbed with a minimal stateful equivalent.
 *
 * Radix's popper positions itself through floating-ui's `autoUpdate`,
 * which never settles under jsdom: the panel opens correctly (verified —
 * `data-state="open"` and the content render), but the frame loop keeps
 * the test alive until it times out. What these cases are about is OUR
 * content and OUR handlers, not Radix's positioning, so the stub keeps
 * the only semantics the tests depend on — content exists only while
 * open, and the trigger toggles it — and drops the engine.
 */
vi.mock('@/components/ui/popover', async () => {
  const React = await import('react');
  const OpenContext = React.createContext<{
    open: boolean;
    setOpen: (next: boolean) => void;
  }>({ open: false, setOpen: () => undefined });

  return {
    Popover: ({
      children,
      open: controlled,
      onOpenChange,
    }: {
      children: React.ReactNode;
      open?: boolean;
      onOpenChange?: (next: boolean) => void;
    }) => {
      const [uncontrolled, setUncontrolled] = React.useState(false);
      const open = controlled ?? uncontrolled;
      const setOpen = (next: boolean) => {
        setUncontrolled(next);
        onOpenChange?.(next);
      };
      return (
        <OpenContext.Provider value={{ open, setOpen }}>{children}</OpenContext.Provider>
      );
    },
    PopoverTrigger: ({
      children,
    }: {
      children: React.ReactElement;
      asChild?: boolean;
    }) => {
      const { open, setOpen } = React.useContext(OpenContext);
      return React.cloneElement(children, {
        onClick: () => setOpen(!open),
        'aria-expanded': open,
      });
    },
    PopoverContent: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      'aria-label'?: string;
    }) => {
      const { open } = React.useContext(OpenContext);
      return open ? <div {...props}>{children}</div> : null;
    },
  };
});

/*
 * Same reasoning as the popover stub: the Select primitive is Radix's
 * listbox, which needs a real pointer environment to open. A native
 * `<select>` honouring `onValueChange` keeps exactly the contract this
 * page depends on — choosing a value calls back with it — and lets the
 * case assert what matters: the chosen type reaches the SERVER query.
 */
vi.mock('@/components/ui/select', async () => {
  const React = await import('react');
  const SelectContext = React.createContext<{
    value?: string;
    onValueChange?: (next: string) => void;
    register: (attrs: { id?: string; label?: string }) => void;
    attrs: { id?: string; label?: string };
  }>({ register: () => undefined, attrs: {} });

  return {
    Select: ({
      children,
      value,
      onValueChange,
    }: {
      children: React.ReactNode;
      value?: string;
      onValueChange?: (next: string) => void;
    }) => {
      const [attrs, setAttrs] = React.useState<{ id?: string; label?: string }>({});
      const register = React.useCallback(
        (next: { id?: string; label?: string }) =>
          setAttrs((current) =>
            current.id === next.id && current.label === next.label ? current : next
          ),
        []
      );
      return (
        <SelectContext.Provider value={{ value, onValueChange, register, attrs }}>
          <select
            id={attrs.id}
            aria-label={attrs.label}
            value={value ?? ''}
            onChange={(event) => onValueChange?.(event.target.value)}
          >
            {children}
          </select>
        </SelectContext.Provider>
      );
    },
    // The trigger only carries the accessible name and id in the real
    // primitive; here it hands them to the native <select> and renders
    // nothing itself, so the options stay inside the listbox.
    SelectTrigger: ({
      id,
      'aria-label': ariaLabel,
    }: {
      children?: React.ReactNode;
      id?: string;
      'aria-label'?: string;
    }) => {
      const { register } = React.useContext(SelectContext);
      React.useEffect(() => {
        register({ id, label: ariaLabel });
      }, [register, id, ariaLabel]);
      return null;
    },
    SelectValue: () => null,
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectLabel: () => null,
    SelectSeparator: () => null,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
      <option value={value}>{children}</option>
    ),
  };
});

vi.mock('./hooks', () => ({
  useNotifications: (options: unknown) => useNotifications(options) as unknown,
  useNotificationSummary: () => useNotificationSummary() as unknown,
  useMarkNotificationRead: () => ({
    mutate: markRead,
    isPending: false,
    variables: undefined,
  }),
  useMarkAllNotificationsRead: () => ({
    mutate: markAllRead,
    isPending: false,
    error: null,
  }),
}));

import { NotificationBell } from './components/NotificationBell';
import NotificationsPage from './pages/NotificationsPage';

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n-1',
    userId: 'u-1',
    type: 'activity',
    priority: 'medium',
    titleKey: 'notifications:events.quizGraded.title',
    messageKey: 'notifications:events.quizGraded.message',
    values: { quizTitle: 'Algebra', score: 90 },
    isRead: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function page(
  items: readonly Notification[],
  totalItems = items.length,
  pageSize = 20
) {
  return {
    data: {
      items,
      pagination: {
        page: 1,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  };
}

/*
 * The REAL localization provider, not a bare `I18nextProvider`: shared
 * primitives inside the popover and the pager call `useLanguage`, which
 * throws outside it — mounting only i18next made every one of those
 * components fail to render, which reads in the output as a timeout
 * waiting for content that was never going to appear.
 */
function renderAt(ui: JSX.Element, path = '/dashboard/notifications') {
  return render(
    <AtlasLocalizationProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/dashboard/notifications" element={ui} />
          <Route path="*" element={<p>elsewhere</p>} />
        </Routes>
      </MemoryRouter>
    </AtlasLocalizationProvider>
  );
}

beforeAll(() => {
  // Radix-derived components probe pointer capture / ResizeObserver, which
  // jsdom does not implement.
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
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

/** See the catalog suite: user-event's defaults are too slow for this tree in jsdom. */
const USER_EVENT_OPTIONS = { delay: null, pointerEventsCheck: 0 } as const;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('NotificationBell', () => {
  it('shows the unread badge and opens a popover listing the unread rows', async () => {
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    useNotificationSummary.mockReturnValue({
      data: { unread: 2, total: 5, byType: {}, byPriority: {} },
    });
    useNotifications.mockReturnValue(
      page([
        notification({ id: 'n-1' }),
        notification({
          id: 'n-2',
          titleKey: 'notifications:events.certificateIssued.title',
          messageKey: 'notifications:events.certificateIssued.message',
          values: { courseTitle: 'Physics' },
        }),
      ])
    );

    renderAt(<NotificationBell />);

    const trigger = screen.getByRole('button', {
      name: 'Notifications (2 unread)',
    });
    expect(screen.getByTestId('notification-bell-badge').textContent).toBe('2');

    await user.click(trigger);

    const list = await screen.findByRole('list', {
      name: 'Latest unread notifications',
    });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.textContent).toContain('Quiz graded');
    expect(rows[1]?.textContent).toContain('Certificate issued');

    // The preview is fetched only while open, five rows, unread only.
    const lastCall = useNotifications.mock.calls.at(-1)?.[0] as {
      enabled: boolean;
      query: { pagination: { pageSize: number }; filters: { isRead: boolean } };
    };
    expect(lastCall.enabled).toBe(true);
    expect(lastCall.query.pagination.pageSize).toBe(5);
    expect(lastCall.query.filters.isRead).toBe(false);

    expect(
      screen.getByRole('link', { name: 'View All' }).getAttribute('href')
    ).toBe('/dashboard/notifications');
  });

  it('marks one row or all rows read from inside the popover', async () => {
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    useNotificationSummary.mockReturnValue({
      data: { unread: 1, total: 1, byType: {}, byPriority: {} },
    });
    useNotifications.mockReturnValue(page([notification({ id: 'n-7' })]));

    renderAt(<NotificationBell />);
    await user.click(screen.getByRole('button', { name: /notifications/i }));

    await user.click(
      await screen.findByRole('button', { name: 'Mark "Quiz graded" as read' })
    );
    expect(markRead).toHaveBeenCalledWith('n-7');

    await user.click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(markAllRead).toHaveBeenCalledTimes(1);
  });

  it('does not fetch the preview while closed', () => {
    useNotificationSummary.mockReturnValue({ data: undefined });
    useNotifications.mockReturnValue(page([]));

    renderAt(<NotificationBell />);

    const firstCall = useNotifications.mock.calls[0]?.[0] as { enabled: boolean };
    expect(firstCall.enabled).toBe(false);
    expect(screen.queryByTestId('notification-bell-badge')).toBeNull();
  });
});

describe('NotificationsPage', () => {
  it('renders pagination when there is more than one page', () => {
    useNotificationSummary.mockReturnValue({
      data: { unread: 0, total: 45, byType: {}, byPriority: {} },
    });
    useNotifications.mockReturnValue(
      page(
        Array.from({ length: 20 }, (_, index) =>
          notification({ id: `n-${index}`, isRead: true })
        ),
        45
      )
    );

    renderAt(<NotificationsPage />);

    const pager = screen.getByRole('navigation', { name: 'Page 1 of 3' });
    expect(within(pager).getByRole('button', { name: 'Next page' })).toBeTruthy();
    expect(pager.textContent).toContain('Showing 1–20 of 45');
  });

  it('sends type and priority from the URL as server-side filters', () => {
    useNotificationSummary.mockReturnValue({ data: undefined });
    useNotifications.mockReturnValue(page([]));

    renderAt(
      <NotificationsPage />,
      '/dashboard/notifications?status=unread&type=security&priority=high'
    );

    const options = useNotifications.mock.calls.at(-1)?.[0] as {
      query: { filters: Record<string, unknown> };
    };
    expect(options.query.filters).toEqual({
      isRead: false,
      type: 'security',
      priority: 'high',
    });
    // The controls reflect the URL. Asserted on `value` rather than the
    // rendered label: under the native-select stub the element's text is
    // every option, which says nothing about what is selected.
    expect(
      (screen.getByRole('combobox', { name: 'Type' }) as HTMLSelectElement).value
    ).toBe('security');
    expect(
      (screen.getByRole('combobox', { name: 'Priority' }) as HTMLSelectElement).value
    ).toBe('high');
    // A filtered empty list says "no matching results", not "no notifications".
    expect(screen.getByText('No matching results')).toBeTruthy();
  });

  it('applies a type chosen from the select as a query parameter', async () => {
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    useNotificationSummary.mockReturnValue({ data: undefined });
    useNotifications.mockReturnValue(page([]));

    renderAt(<NotificationsPage />);

    const type = screen.getByRole('combobox', { name: 'Type' });
    await user.selectOptions(type, 'billing');

    const options = useNotifications.mock.calls.at(-1)?.[0] as {
      query: { filters: Record<string, unknown> };
    };
    expect(options.query.filters).toEqual({ type: 'billing' });
  });

  it('renders the action as a link and unread rows with a non-colour signal', async () => {
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    useNotificationSummary.mockReturnValue({
      data: { unread: 1, total: 2, byType: {}, byPriority: {} },
    });
    useNotifications.mockReturnValue(
      page([
        notification({
          id: 'n-1',
          actionUrl: '/dashboard/instructor/courses/c-1',
          actionLabelKey: 'notifications:liveSession.action.openCourse',
        }),
        notification({ id: 'n-2', isRead: true, priority: 'urgent' }),
      ])
    );

    renderAt(<NotificationsPage />);

    const rows = screen.getAllByRole('listitem');
    expect(rows[0]?.getAttribute('data-unread')).toBe('true');
    expect(within(rows[0]!).getByText('Unread').className).toContain('sr-only');
    expect(rows[1]?.getAttribute('data-unread')).toBeNull();
    expect(within(rows[1]!).queryByText('Unread')).toBeNull();

    const action = within(rows[0]!).getByRole('link', { name: /Open course/ });
    expect(action.getAttribute('href')).toBe('/dashboard/instructor/courses/c-1');
    // Following the action from an unread row reads it.
    await user.click(action);
    expect(markRead).toHaveBeenCalledWith('n-1');

    // Priority is surfaced as a badge on high/urgent rows only.
    expect(within(rows[1]!).getByText('Urgent')).toBeTruthy();
    expect(within(rows[0]!).queryByText('Medium')).toBeNull();
  });
});
