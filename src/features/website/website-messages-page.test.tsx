/**
 * Website Messages — the Academy's Contact form inbox.
 *
 * The real page, hooks, service and query cache run end to end; only the
 * transport (`apiClient.get`/`patch`) is replaced by a tiny in-memory
 * backend. That is the point: what is pinned here is the exact request
 * the page sends — the wire parameter names the backend contract fixes
 * (`page`, `pageSize`, `search`, `status`, `from`, `to`, `sortBy`,
 * `sortDirection`) and the PATCH body — and what the person reads back.
 *
 *  1. Rows and the "Showing x–y of z" range render from the response.
 *  2. Every filter/sort/page-size change is a server request, written to
 *     the URL, and returns to page 1; a URL restores the whole view.
 *  3. "No messages yet" and "no messages match" are different states.
 *  4. A failed read offers a retry that works.
 *  5. Opening a `new` message marks it read (one PATCH); the explicit
 *     actions send the status they name; Undo puts an archive back.
 *  6. Arabic renders right-to-left with Arabic plural forms.
 *  7. A visitor's message is text, never markup.
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { LocalizationContext } from '@app/providers/localization/localization.context';
import type { LocalizationContextValue } from '@app/providers/localization/localization.context';
import { ApiError, apiClient } from '@api';
import type { ReadOptions } from '@api';
import type {
  ContactSubmission,
  ContactSubmissionStatus,
  ContactSubmissionSummary,
  LanguageCode,
} from '@types';

/* ------------------------------------------------------------------ *
 * Mocks — the seams are the transport, the toast and the permission.
 * ------------------------------------------------------------------ */

const notify = vi.fn();
const notifySuccess = vi.fn();
const notifyError = vi.fn();

vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useToast: () => ({
    notify,
    notifySuccess,
    notifyError,
    dismissAll: vi.fn(),
  }),
}));

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({
    hasPermission: (permission: string) =>
      permission === 'academy.website.manage',
  }),
}));

/*
  Radix `Select` never finishes opening in jsdom (it depends on layout
  APIs jsdom lacks), so only that presentation primitive is swapped for
  the native control it stands in for. The page's own `onValueChange`
  and the query it builds are the production ones.
*/
vi.mock('@/components/ui/select', async () => {
  const React = await import('react');
  type AnyProps = Record<string, unknown> & {
    readonly children?: React.ReactNode;
  };
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

const { default: WebsiteMessagesPage } =
  await import('./pages/WebsiteMessagesPage');

/* ------------------------------------------------------------------ *
 * A tiny backend
 * ------------------------------------------------------------------ */

const ACADEMY = 'academy-1';
const LIST_PATH = `academies/${ACADEMY}/contact-submissions`;
const SUMMARY_PATH = `${LIST_PATH}/summary`;
const PAGE_PATH = `/dashboard/academy/${ACADEMY}/website/messages`;

function submission(
  id: string,
  overrides: Partial<ContactSubmission> = {}
): ContactSubmission {
  return {
    id,
    academyId: ACADEMY,
    name: `Visitor ${id}`,
    email: `${id}@example.com`,
    message: `Message ${id}`,
    status: 'read',
    createdAt: '2026-09-15T10:30:00.000Z',
    ...overrides,
  };
}

const BASE_ROWS: readonly ContactSubmission[] = [
  submission('s1', {
    name: 'Layla Hassan',
    email: 'layla@example.com',
    message: 'Hello,\nI would like to know when the next course starts.',
    status: 'new',
  }),
  submission('s2', {
    name: 'Omar Said',
    email: 'omar@example.com',
    message: 'Do you offer group discounts?',
    status: 'read',
  }),
  submission('s3', {
    name: 'Mona Ali',
    email: 'mona@example.com',
    message: 'Thanks for the quick answer.',
    status: 'archived',
  }),
];

/** 57 messages, three of them new — enough for three pages of twenty. */
function manyRows(): ContactSubmission[] {
  return Array.from({ length: 57 }, (_, index) =>
    submission(`m${index + 1}`, { status: index < 3 ? 'new' : 'read' })
  );
}

let dataset: ContactSubmission[] = [];
let failNextList = false;

type Params = Record<string, unknown>;

const get = vi.fn<(path: string, options?: ReadOptions) => Promise<unknown>>();
const patch =
  vi.fn<
    (
      path: string,
      body: { status: ContactSubmissionStatus }
    ) => Promise<unknown>
  >();

function summaryOf(
  rows: readonly ContactSubmission[]
): ContactSubmissionSummary {
  const count = (status: ContactSubmissionStatus) =>
    rows.filter((row) => row.status === status).length;
  return {
    total: rows.length,
    new: count('new'),
    read: count('read'),
    archived: count('archived'),
  };
}

function serve(): void {
  get.mockImplementation(async (path, options) => {
    if (path === SUMMARY_PATH) return summaryOf(dataset);
    if (path !== LIST_PATH) throw new Error(`unexpected GET ${path}`);
    if (failNextList) {
      failNextList = false;
      throw new ApiError({
        kind: 'server',
        messageKey: 'errors.server',
        status: 500,
        retryable: true,
      });
    }
    const params = (options?.params ?? {}) as Params;
    const search = String(params.search ?? '').toLowerCase();
    const rows = dataset.filter(
      (row) =>
        (!params.status || row.status === params.status) &&
        (!search ||
          `${row.name} ${row.email} ${row.message}`
            .toLowerCase()
            .includes(search))
    );
    const page = Number(params.page ?? 1);
    const pageSize = Number(params.pageSize ?? 20);
    return {
      items: rows.slice((page - 1) * pageSize, page * pageSize),
      pagination: {
        page,
        pageSize,
        totalItems: rows.length,
        totalPages: Math.max(1, Math.ceil(rows.length / pageSize)),
      },
    };
  });
  patch.mockImplementation(async (path, body) => {
    const id = path.split('/').at(-1);
    dataset = dataset.map((row) =>
      row.id === id ? { ...row, status: body.status } : row
    );
    return dataset.find((row) => row.id === id);
  });
}

function listRequests(): Params[] {
  return get.mock.calls
    .filter(([path]) => path === LIST_PATH)
    .map(([, options]) => (options?.params ?? {}) as Params);
}

function lastListRequest(): Params {
  return listRequests().at(-1) ?? {};
}

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

const I18N = {
  en: createI18nInstance('en'),
  ar: createI18nInstance('ar'),
} as const;

function localization(language: LanguageCode): LocalizationContextValue {
  const isRtl = language === 'ar';
  return {
    language,
    languageDefinition: {} as LocalizationContextValue['languageDefinition'],
    direction: isRtl ? 'rtl' : 'ltr',
    isRtl,
    locale: isRtl ? 'ar-EG' : 'en-US',
    availableLanguages: [],
    setLanguage: () => undefined,
  };
}

function LocationProbe(): JSX.Element {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
}

function renderPage({
  search = '',
  language = 'en',
}: { readonly search?: string; readonly language?: LanguageCode } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={I18N[language]}>
        <LocalizationContext.Provider value={localization(language)}>
          <div dir={language === 'ar' ? 'rtl' : 'ltr'} data-testid="root">
            <MemoryRouter initialEntries={[`${PAGE_PATH}${search}`]}>
              <Routes>
                <Route
                  path="/dashboard/academy/:academyId/website/messages"
                  element={
                    <>
                      <WebsiteMessagesPage />
                      <LocationProbe />
                    </>
                  }
                />
              </Routes>
            </MemoryRouter>
          </div>
        </LocalizationContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

function location(): string {
  return screen.getByTestId('location').textContent ?? '';
}

/** The desktop table (the narrow-screen card list renders the same rows). */
async function findTable(): Promise<HTMLElement> {
  return screen.findByRole('table');
}

/** See the roster suite: user-event's defaults are too slow for this tree in jsdom. */
const USER_EVENT_OPTIONS = { delay: null, pointerEventsCheck: 0 } as const;

beforeAll(() => {
  // Radix's Sheet and Tabs probe pointer capture and scrolling, which
  // jsdom does not implement.
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

beforeEach(() => {
  dataset = [...BASE_ROWS];
  failNextList = false;
  serve();
  vi.spyOn(apiClient, 'get').mockImplementation(((
    path: string,
    options?: ReadOptions
  ) => get(path, options)) as typeof apiClient.get);
  vi.spyOn(apiClient, 'patch').mockImplementation(((
    path: string,
    body: { status: ContactSubmissionStatus }
  ) => patch(path, body)) as typeof apiClient.patch);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/* ------------------------------------------------------------------ */

describe('Website Messages — list', () => {
  it('renders every returned message with its status and the result range', async () => {
    renderPage();
    const table = await findTable();

    expect(within(table).getByText('Layla Hassan')).toBeTruthy();
    expect(within(table).getByText('omar@example.com')).toBeTruthy();
    // One line: the line break in the message is collapsed in the row.
    expect(
      within(table).getByText(
        'Hello, I would like to know when the next course starts.'
      )
    ).toBeTruthy();
    // Status in words, not colour alone.
    const rows = within(table).getAllByRole('button');
    expect(within(rows[0]).getByText('New')).toBeTruthy();
    expect(within(rows[1]).getByText('Read')).toBeTruthy();
    expect(within(rows[2]).getByText('Archived')).toBeTruthy();

    expect(screen.getByText('Showing 1–3 of 3 messages')).toBeTruthy();
    expect(lastListRequest()).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    });
  });

  it('shows the whole-academy counts on the status tabs and an "N new" indicator', async () => {
    renderPage();
    await findTable();
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'All 3' })).toBeTruthy()
    );
    expect(screen.getByRole('tab', { name: 'New 1' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Read 1' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Archived 1' })).toBeTruthy();
    expect(screen.getByText('1 new')).toBeTruthy();
  });

  it('restores the whole view from the URL and sends it to the server', async () => {
    renderPage({
      search:
        '?search=layla&status=new&from=2026-09-01&to=2026-09-30&sortBy=name&sortDirection=asc&page=2&pageSize=50',
    });
    await waitFor(() => expect(listRequests().length).toBeGreaterThan(0));
    expect(listRequests()[0]).toEqual({
      page: 2,
      pageSize: 50,
      search: 'layla',
      status: 'new',
      from: '2026-09-01',
      to: '2026-09-30',
      sortBy: 'name',
      sortDirection: 'asc',
    });

    expect(
      (
        screen.getByRole('searchbox', {
          name: 'Search by name, email or message',
        }) as HTMLInputElement
      ).value
    ).toBe('layla');
    expect(
      (screen.getByRole('combobox', { name: 'Sort by' }) as HTMLSelectElement)
        .value
    ).toBe('name:asc');
    expect(
      (screen.getByLabelText('Received from') as HTMLInputElement).value
    ).toBe('2026-09-01');
    expect(
      (screen.getByLabelText('Received to') as HTMLInputElement).value
    ).toBe('2026-09-30');
    expect(
      screen.getByRole('tab', { name: /^New/ }).getAttribute('aria-selected')
    ).toBe('true');
  });

  it('ignores unrecognised URL values instead of sending them', async () => {
    renderPage({
      search:
        '?status=spam&from=2026-02-31&to=yesterday&sortBy=phone&sortDirection=up&page=-4&pageSize=7',
    });
    await waitFor(() => expect(listRequests().length).toBeGreaterThan(0));
    expect(listRequests()[0]).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    });
  });

  it.each([
    {
      control: 'search',
      act: async (user: ReturnType<typeof userEvent.setup>) => {
        await user.type(
          screen.getByRole('searchbox', {
            name: 'Search by name, email or message',
          }),
          'm1'
        );
      },
      expected: { search: 'm1' },
      url: 'search=m1',
    },
    {
      control: 'status',
      act: async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(await screen.findByRole('tab', { name: /^New/ }));
      },
      expected: { status: 'new' },
      url: 'status=new',
    },
    {
      control: 'received from',
      act: async () => {
        fireEvent.change(screen.getByLabelText('Received from'), {
          target: { value: '2026-09-01' },
        });
      },
      expected: { from: '2026-09-01' },
      url: 'from=2026-09-01',
    },
    {
      control: 'received to',
      act: async () => {
        fireEvent.change(screen.getByLabelText('Received to'), {
          target: { value: '2026-09-30' },
        });
      },
      expected: { to: '2026-09-30' },
      url: 'to=2026-09-30',
    },
    {
      control: 'sort',
      act: async () => {
        fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), {
          target: { value: 'email:asc' },
        });
      },
      expected: { sortBy: 'email', sortDirection: 'asc' },
      url: 'sortBy=email&sortDirection=asc',
    },
    {
      control: 'page size',
      act: async () => {
        const pageSize = screen
          .getAllByRole('combobox')
          .find((element) => (element as HTMLSelectElement).value === '20');
        fireEvent.change(pageSize as HTMLElement, { target: { value: '50' } });
      },
      expected: { pageSize: 50 },
      url: 'pageSize=50',
    },
  ])(
    'changing $control sends it to the server, writes it to the URL and returns to page 1',
    async ({ act, expected, url }) => {
      dataset = manyRows();
      const user = userEvent.setup(USER_EVENT_OPTIONS);
      renderPage({ search: '?page=3' });
      await findTable();
      expect(lastListRequest()).toMatchObject({ page: 3 });
      expect(screen.getByText('Showing 41–57 of 57 messages')).toBeTruthy();

      await act(user);

      await waitFor(() =>
        expect(lastListRequest()).toMatchObject({ ...expected, page: 1 })
      );
      expect(location()).toContain(url);
      expect(location()).not.toContain('page=3');
    }
  );

  it('moves between pages through the URL', async () => {
    dataset = manyRows();
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    renderPage();
    await findTable();
    expect(screen.getByText('Showing 1–20 of 57 messages')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    await waitFor(() => expect(lastListRequest()).toMatchObject({ page: 2 }));
    expect(location()).toContain('page=2');
    expect(
      await screen.findByText('Showing 21–40 of 57 messages')
    ).toBeTruthy();
  });
});

describe('Website Messages — empty, no results and error', () => {
  it('explains that messages arrive from the website Contact form when there are none yet', async () => {
    dataset = [];
    renderPage();
    expect(await screen.findByText('No messages yet')).toBeTruthy();
    expect(
      screen.getByText(
        "When visitors send a message through your website's Contact form, it will appear here."
      )
    ).toBeTruthy();
    expect(screen.queryByText('No messages match these filters')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull();
  });

  it('says nothing matches — and offers to clear the filters — when filters exclude everything', async () => {
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    renderPage({ search: '?search=nobody&status=read' });
    expect(
      await screen.findByText('No messages match these filters')
    ).toBeTruthy();
    expect(screen.queryByText('No messages yet')).toBeNull();

    // The toolbar and the empty state both offer it; use the empty state's.
    const clear = screen.getAllByRole('button', { name: 'Clear filters' });
    await user.click(clear[clear.length - 1]);

    await waitFor(() => expect(location()).toBe(''));
    expect(lastListRequest()).toEqual({
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    });
    expect(within(await findTable()).getByText('Layla Hassan')).toBeTruthy();
  });

  it('shows an error with a retry that reloads the list', async () => {
    failNextList = true;
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    renderPage();

    const retry = await screen.findByRole('button', { name: 'Try again' });
    expect(screen.queryByRole('table')).toBeNull();

    await user.click(retry);

    expect(within(await findTable()).getByText('Layla Hassan')).toBeTruthy();
    expect(listRequests()).toHaveLength(2);
  });
});

describe('Website Messages — reading and managing a message', () => {
  async function open(name: string) {
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    const table = await findTable();
    await user.click(within(table).getByText(name));
    const sheet = await screen.findByRole('dialog');
    return { user, sheet };
  }

  it('opening a new message marks it read with one PATCH and refreshes the list and counts', async () => {
    renderPage();
    await findTable();
    const listCallsBefore = listRequests().length;
    const summaryCallsBefore = get.mock.calls.filter(
      ([path]) => path === SUMMARY_PATH
    ).length;

    const { sheet } = await open('Layla Hassan');

    await waitFor(() => expect(patch).toHaveBeenCalledTimes(1));
    expect(patch).toHaveBeenCalledWith(`${LIST_PATH}/s1`, { status: 'read' });

    // The sheet shows the full message, the reply link and the new state.
    expect(within(sheet).getByText('Layla Hassan')).toBeTruthy();
    expect(
      within(sheet)
        .getByRole('link', { name: 'Reply by email' })
        .getAttribute('href')
    ).toBe('mailto:layla@example.com');
    expect(
      within(sheet).getByTestId('contact-submission-message').textContent
    ).toBe('Hello,\nI would like to know when the next course starts.');
    expect(
      await within(sheet).findByRole('button', { name: 'Mark as unread' })
    ).toBeTruthy();

    await waitFor(() => {
      expect(listRequests().length).toBeGreaterThan(listCallsBefore);
      expect(
        get.mock.calls.filter(([path]) => path === SUMMARY_PATH).length
      ).toBeGreaterThan(summaryCallsBefore);
    });
    // Silent: opening is not an action that needs confirming.
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('opening a message that is already read sends nothing', async () => {
    renderPage();
    await open('Omar Said');
    expect(screen.getByRole('button', { name: 'Mark as unread' })).toBeTruthy();
    expect(patch).not.toHaveBeenCalled();
  });

  it('"Mark as unread" sets the message back to new', async () => {
    renderPage();
    const { user, sheet } = await open('Omar Said');
    await user.click(
      within(sheet).getByRole('button', { name: 'Mark as unread' })
    );

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith(`${LIST_PATH}/s2`, { status: 'new' })
    );
    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith(
        'website:messages.toasts.markedUnread'
      )
    );
    expect(
      await within(sheet).findByRole('button', { name: 'Mark as read' })
    ).toBeTruthy();
  });

  it('"Archive" archives without a confirmation and offers Undo', async () => {
    renderPage();
    const { user, sheet } = await open('Omar Said');
    await user.click(within(sheet).getByRole('button', { name: 'Archive' }));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith(`${LIST_PATH}/s2`, {
        status: 'archived',
      })
    );
    await waitFor(() => expect(notify).toHaveBeenCalledTimes(1));
    const toast = notify.mock.calls[0][0] as {
      titleKey: string;
      action: { labelKey: string; onAction: () => void };
    };
    expect(toast.titleKey).toBe('website:messages.toasts.archived');
    expect(toast.action.labelKey).toBe('website:messages.toasts.undo');
    expect(
      await within(sheet).findByRole('button', { name: 'Restore' })
    ).toBeTruthy();

    // Undo returns it to the status it had before (read).
    toast.action.onAction();
    await waitFor(() => expect(patch).toHaveBeenCalledTimes(2));
    expect(patch).toHaveBeenLastCalledWith(`${LIST_PATH}/s2`, {
      status: 'read',
    });
  });

  it('"Restore" brings an archived message back as read', async () => {
    renderPage();
    const { user, sheet } = await open('Mona Ali');
    expect(patch).not.toHaveBeenCalled();
    await user.click(within(sheet).getByRole('button', { name: 'Restore' }));

    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith(`${LIST_PATH}/s3`, { status: 'read' })
    );
    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith(
        'website:messages.toasts.restored'
      )
    );
  });

  it('reports a failed status change', async () => {
    patch.mockRejectedValueOnce(
      new ApiError({
        kind: 'forbidden',
        messageKey: 'errors.forbidden',
        status: 403,
        retryable: false,
      })
    );
    renderPage();
    const { user, sheet } = await open('Omar Said');
    await user.click(within(sheet).getByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledTimes(1));
    expect(notifyError.mock.calls[0][0]).toBe('website:messages.toasts.failed');
    expect(notify).not.toHaveBeenCalled();
  });

  it('renders an HTML-looking message as literal text, never as markup', async () => {
    const markup =
      '<img src="x" onerror="alert(1)"><script>window.__pwned = true</script><b>bold</b>';
    dataset = [
      submission('x1', { name: 'Mallory', message: markup, status: 'read' }),
    ];
    renderPage();
    const table = await findTable();
    expect(within(table).getByText(markup)).toBeTruthy();
    expect(table.querySelector('img, script, b')).toBeNull();

    const { sheet } = await open('Mallory');
    const body = within(sheet).getByTestId('contact-submission-message');
    expect(body.textContent).toBe(markup);
    expect(body.querySelector('img, script, b')).toBeNull();
    expect(document.querySelector('img[src="x"]')).toBeNull();
    expect(
      (window as unknown as { __pwned?: boolean }).__pwned
    ).toBeUndefined();
  });
});

describe('Website Messages — Arabic', () => {
  it('renders right-to-left with translated labels and Arabic plural forms', async () => {
    dataset = manyRows();
    const { container } = renderPage({ search: '?page=2', language: 'ar' });

    expect(screen.getByTestId('root').getAttribute('dir')).toBe('rtl');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'الرسائل' })
    ).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'الترتيب' })).toBeTruthy();

    // 57 is in Arabic's "many" category: singular counted noun.
    expect(await screen.findByText('عرض ٢١–٤٠ من أصل ٥٧ رسالة')).toBeTruthy();
    // 3 is in the "few" category: plural counted noun.
    expect(await screen.findByText('٣ رسائل جديدة')).toBeTruthy();
    // No untranslated key leaked through.
    expect(container.textContent).not.toMatch(/website:messages/);
  });

  it('uses the dual form for two messages', async () => {
    dataset = [submission('d1'), submission('d2')];
    renderPage({ language: 'ar' });
    expect(await screen.findByText('عرض ١–٢ من أصل رسالتين')).toBeTruthy();
  });
});
