/**
 * Platform Contact Submissions — the Platform Owner's inbox for the Atlas
 * marketing contact form (TASK 7).
 *
 * The real page, hooks, service and query cache run end to end; only the
 * transport (`apiClient.get`/`patch`/`delete`) is replaced by a tiny
 * in-memory backend, so what is pinned is the exact request the page
 * sends and what the operator reads back:
 *
 *  1. Rows, topics, statuses and the whole-inbox counts render, in EN and
 *     AR, with no raw translation key leaking.
 *  2. Search and topic filters are server requests under the contract's
 *     wire names.
 *  3. "No enquiries yet", "no enquiries match" and a failed read are
 *     distinct states.
 *  4. Opening a `new` enquiry marks it read (one PATCH).
 *  5. Delete is permanent and therefore CONFIRMED: requesting it opens an
 *     alert dialog and sends nothing; Cancel sends nothing; only the
 *     explicit confirmation sends the DELETE.
 *  6. A visitor's message is text, never markup.
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
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { LocalizationContext } from '@app/providers/localization/localization.context';
import type { LocalizationContextValue } from '@app/providers/localization/localization.context';
import { ApiError, apiClient } from '@api';
import type { ReadOptions } from '@api';
import type { LanguageCode } from '@types';
import type {
  PlatformContactSubmission,
  PlatformContactSubmissionStatus,
} from './services/PlatformContactSubmissionService';

const notify = vi.fn();
const notifySuccess = vi.fn();
const notifyError = vi.fn();

vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useToast: () => ({ notify, notifySuccess, notifyError, dismissAll: vi.fn() }),
}));

/*
  Radix `Select` never finishes opening in jsdom; only that primitive is
  swapped for the native control it stands in for.
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

const { default: PlatformContactSubmissionsPage } =
  await import('./pages/PlatformContactSubmissionsPage');

/* ------------------------------------------------------------------ *
 * A tiny backend
 * ------------------------------------------------------------------ */

const LIST_PATH = 'platform/contact-submissions';
const SUMMARY_PATH = `${LIST_PATH}/summary`;

function enquiry(
  id: string,
  overrides: Partial<PlatformContactSubmission> = {}
): PlatformContactSubmission {
  return {
    id,
    name: `Visitor ${id}`,
    email: `${id}@example.com`,
    organizationName: null,
    topic: 'sales',
    message: `Message ${id}`,
    locale: 'en',
    sourcePath: '/',
    status: 'read',
    userAgent: null,
    readAt: null,
    createdAt: '2026-10-01T10:30:00.000Z',
    ...overrides,
  };
}

const BASE_ROWS: readonly PlatformContactSubmission[] = [
  enquiry('c1', {
    name: 'Layla Haddad',
    email: 'layla@falcon.example',
    organizationName: 'Falcon Learning',
    topic: 'partnership',
    message: 'Hello,\n<b>We run three academies</b> and want a walkthrough.',
    status: 'new',
  }),
  enquiry('c2', {
    name: 'Omar Said',
    email: 'omar@example.com',
    topic: 'support',
    status: 'read',
  }),
];

let dataset: PlatformContactSubmission[] = [];
let failNextList = false;
type Params = Record<string, unknown>;

const get = vi.fn<(path: string, options?: ReadOptions) => Promise<unknown>>();
const patch =
  vi.fn<
    (
      path: string,
      body: { status: PlatformContactSubmissionStatus }
    ) => Promise<unknown>
  >();
const del = vi.fn<(path: string) => Promise<unknown>>();

function serve(): void {
  get.mockImplementation(async (path, options) => {
    if (path === SUMMARY_PATH) {
      const count = (status: PlatformContactSubmissionStatus) =>
        dataset.filter((row) => row.status === status).length;
      return {
        total: dataset.length,
        new: count('new'),
        read: count('read'),
        archived: count('archived'),
      };
    }
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
        (!params.topic || row.topic === params.topic) &&
        (!search ||
          `${row.name} ${row.email} ${row.organizationName ?? ''} ${row.message}`
            .toLowerCase()
            .includes(search))
    );
    return {
      items: rows,
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: rows.length,
        totalPages: 1,
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
  del.mockImplementation(async (path) => {
    const id = path.split('/').at(-1);
    dataset = dataset.filter((row) => row.id !== id);
    return undefined;
  });
}

function lastListRequest(): Params {
  const calls = get.mock.calls.filter(([path]) => path === LIST_PATH);
  return (calls.at(-1)?.[1]?.params ?? {}) as Params;
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

function renderPage(language: LanguageCode = 'en') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={I18N[language]}>
        <LocalizationContext.Provider value={localization(language)}>
          <div dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <MemoryRouter
              initialEntries={['/dashboard/platform/contact-submissions']}
            >
              <PlatformContactSubmissionsPage />
            </MemoryRouter>
          </div>
        </LocalizationContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

const USER_EVENT_OPTIONS = { delay: null, pointerEventsCheck: 0 } as const;

beforeAll(() => {
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
    body: { status: PlatformContactSubmissionStatus }
  ) => patch(path, body)) as typeof apiClient.patch);
  vi.spyOn(apiClient, 'delete').mockImplementation(((path: string) =>
    del(path)) as typeof apiClient.delete);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  get.mockReset();
  patch.mockReset();
  del.mockReset();
  notify.mockReset();
  notifySuccess.mockReset();
  notifyError.mockReset();
});

async function openEnquiry(name: string) {
  const user = userEvent.setup(USER_EVENT_OPTIONS);
  const table = await screen.findByRole('table');
  await user.click(within(table).getByText(name));
  const sheet = await screen.findByRole('dialog');
  return { user, sheet };
}

/* ------------------------------------------------------------------ *
 * Tests
 * ------------------------------------------------------------------ */

describe('Platform contact inbox — list', () => {
  it('renders rows, topics, statuses and counts with no raw keys', async () => {
    const { container } = renderPage();
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Layla Haddad')).toBeTruthy();
    expect(within(table).getByText('Falcon Learning')).toBeTruthy();
    expect(within(table).getByText('Partnership')).toBeTruthy();
    expect(within(table).getByText('Account help')).toBeTruthy();
    expect(within(table).getAllByText('New').length).toBeGreaterThan(0);
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /^All/ }).textContent).toContain(
        '2'
      )
    );
    expect(container.textContent).not.toMatch(
      /platform:contactSubmissions|contactSubmissions\./
    );
  });

  it('renders in Arabic with no raw keys', async () => {
    const { container } = renderPage('ar');
    await screen.findByRole('table');
    expect(container.textContent).toMatch(/[؀-ۿ]/);
    expect(container.textContent).not.toMatch(
      /platform:contactSubmissions|contactSubmissions\./
    );
  });

  it('sends search and topic as server filters', async () => {
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    renderPage();
    await screen.findByRole('table');

    fireEvent.change(screen.getByRole('combobox', { name: 'Topic' }), {
      target: { value: 'support' },
    });
    await waitFor(() =>
      expect(lastListRequest()).toMatchObject({ topic: 'support' })
    );
    expect(
      within(await screen.findByRole('table')).queryByText('Layla Haddad')
    ).toBeNull();

    await user.type(
      screen.getByRole('searchbox', { name: /Search name, email/ }),
      'omar'
    );
    await waitFor(() =>
      expect(lastListRequest()).toMatchObject({ search: 'omar' })
    );
  });

  it('distinguishes the empty inbox from a failed read, and retries', async () => {
    dataset = [];
    renderPage();
    expect(await screen.findByText('No enquiries yet')).toBeTruthy();
    cleanup();

    dataset = [...BASE_ROWS];
    failNextList = true;
    renderPage();
    const retry = await screen.findByRole('button', {
      name: /try again|retry/i,
    });
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    await user.click(retry);
    expect(
      within(await screen.findByRole('table')).getByText('Layla Haddad')
    ).toBeTruthy();
  });
});

describe('Platform contact inbox — reading and deleting', () => {
  it('opening a new enquiry marks it read and shows the message as text', async () => {
    renderPage();
    const { sheet } = await openEnquiry('Layla Haddad');
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith(`${LIST_PATH}/c1`, { status: 'read' })
    );
    const message = within(sheet).getByTestId('platform-contact-message');
    expect(message.textContent).toBe(
      'Hello,\n<b>We run three academies</b> and want a walkthrough.'
    );
    expect(message.querySelector('b')).toBeNull();
    expect(
      within(sheet)
        .getByRole('link', { name: 'Reply by email' })
        .getAttribute('href')
    ).toBe(`mailto:${encodeURIComponent('layla@falcon.example')}`);
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('asks for confirmation before deleting, and Cancel sends nothing', async () => {
    renderPage();
    const { user, sheet } = await openEnquiry('Omar Said');
    await user.click(within(sheet).getByRole('button', { name: 'Delete' }));

    const confirm = await screen.findByRole('alertdialog');
    expect(within(confirm).getByText('Delete this enquiry?')).toBeTruthy();
    expect(confirm.textContent).toContain('Omar Said');
    expect(del).not.toHaveBeenCalled();

    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(del).not.toHaveBeenCalled();
  });

  it('deletes only after explicit confirmation, then refreshes the list', async () => {
    renderPage();
    const { user, sheet } = await openEnquiry('Omar Said');
    await user.click(within(sheet).getByRole('button', { name: 'Delete' }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(
      within(confirm).getByRole('button', { name: 'Delete permanently' })
    );

    await waitFor(() => expect(del).toHaveBeenCalledWith(`${LIST_PATH}/c2`));
    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith(
        'platform:contactSubmissions.toasts.deleted'
      )
    );
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    await waitFor(() =>
      expect(
        within(screen.getByRole('table')).queryByText('Omar Said')
      ).toBeNull()
    );
  });

  it('reports a failed delete and keeps the enquiry', async () => {
    renderPage();
    const { user, sheet } = await openEnquiry('Omar Said');
    del.mockRejectedValueOnce(
      new ApiError({
        kind: 'server',
        messageKey: 'errors.server',
        status: 500,
        retryable: true,
      })
    );
    await user.click(within(sheet).getByRole('button', { name: 'Delete' }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(
      within(confirm).getByRole('button', { name: 'Delete permanently' })
    );
    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith(
        'platform:contactSubmissions.toasts.deleteFailed'
      )
    );
    // The sheet stays open (modal, so the table behind it is aria-hidden).
    expect(
      within(screen.getByRole('table', { hidden: true })).getByText('Omar Said')
    ).toBeTruthy();
    expect(dataset.some((row) => row.id === 'c2')).toBe(true);
  });
});
