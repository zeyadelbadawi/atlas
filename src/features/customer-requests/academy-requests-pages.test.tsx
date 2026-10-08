/**
 * Customer Requests — the academy's Requests center.
 *
 * Pinned here:
 *  1. My Requests lists the academy's requests (title, reference, type,
 *     status) from `GET academies/:id/customer-requests`, in EN and AR
 *     with no raw translation key.
 *  2. An academy with no requests gets an explanation and every kind of
 *     request as an entry point — not a dead end.
 *  3. A manager is told who can use requests; nothing is fetched.
 *  4. The detail page shows the history as an ordered timeline, the
 *     "what happens next" copy, and hides the reply box and Cancel once a
 *     request is closed (the server's own `canReply`/`canCancel`).
 *  5. Cancel is confirmed first and sent once.
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
import type { MockInstance } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { LocalizationContext } from '@app/providers/localization/localization.context';
import type { LocalizationContextValue } from '@app/providers/localization/localization.context';
import { AcademyScopeContext } from '@features/academy';
import type { AcademyScopeValue } from '@features/academy';
import type { AcademyStaffRole, LanguageCode } from '@types';
import { customerRequestService } from './services/CustomerRequestService';
import type {
  CustomerRequestDetail,
  CustomerRequestSummary,
} from './types/customer-request.types';

const notify = vi.fn();
const notifySuccess = vi.fn();
const notifyError = vi.fn();

vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useToast: () => ({ notify, notifySuccess, notifyError, dismissAll: vi.fn() }),
  useConfirmDialog: () => ({ confirm: vi.fn(async () => true) }),
}));

/* Radix `Select` never finishes opening in jsdom: swap in the native control. */
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

const { default: AcademyRequestsPage } =
  await import('./pages/AcademyRequestsPage');
const { default: AcademyRequestDetailPage } =
  await import('./pages/AcademyRequestDetailPage');

const ACADEMY_ID = 'academy-1';

function scope(role: AcademyStaffRole): AcademyScopeValue {
  return {
    academyId: ACADEMY_ID,
    membership: {
      academy: {
        id: ACADEMY_ID,
        organizationId: 'org-1',
        name: 'Nile Academy',
        slug: 'nile',
        status: 'active',
        language: 'en',
      },
      role,
      roleSource: 'academy_membership',
      permissions: [],
    },
    isResolving: false,
    error: null,
    lostAcademyIds: new Set(),
    isCurrentAcademy: () => true,
  };
}

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

const I18N = {
  en: createI18nInstance('en'),
  ar: createI18nInstance('ar'),
} as const;

function renderAt(
  path: string,
  {
    role = 'owner',
    language = 'en',
  }: { role?: AcademyStaffRole; language?: LanguageCode } = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={I18N[language]}>
        <LocalizationContext.Provider value={localization(language)}>
          <AcademyScopeContext.Provider value={scope(role)}>
            <div dir={language === 'ar' ? 'rtl' : 'ltr'}>
              <MemoryRouter initialEntries={[path]}>
                <Routes>
                  <Route
                    path="/dashboard/academy/:academyId/requests"
                    element={<AcademyRequestsPage />}
                  />
                  <Route
                    path="/dashboard/academy/:academyId/requests/:requestId"
                    element={<AcademyRequestDetailPage />}
                  />
                </Routes>
              </MemoryRouter>
            </div>
          </AcademyScopeContext.Provider>
        </LocalizationContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

function summary(
  id: string,
  overrides: Partial<CustomerRequestSummary> = {}
): CustomerRequestSummary {
  return {
    id,
    reference: `CR-${id.toUpperCase().padEnd(8, '0')}`,
    type: 'logo',
    title: `Request ${id}`,
    status: 'submitted',
    priority: 'normal',
    academy: { id: ACADEMY_ID, name: 'Nile Academy' },
    requester: { name: 'Sara' },
    createdAt: '2026-10-01T10:00:00.000Z',
    lastActivityAt: '2026-10-02T10:00:00.000Z',
    ...overrides,
  };
}

function page(items: readonly CustomerRequestSummary[]) {
  return {
    items,
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: items.length,
      totalPages: 1,
    },
  };
}

function detail(
  overrides: Partial<CustomerRequestDetail> = {}
): CustomerRequestDetail {
  return {
    ...summary('r1', { title: 'A new logo for spring' }),
    description: 'We need a modern logo for the spring launch.',
    details: { brandName: 'Nile', colors: 'Navy and gold' },
    closedAt: null,
    canCancel: true,
    canReply: true,
    events: [
      {
        id: 'e1',
        kind: 'created',
        actorSide: 'customer',
        actorName: 'Sara',
        body: null,
        fromStatus: null,
        toStatus: 'submitted',
        createdAt: '2026-10-01T10:00:00.000Z',
      },
      {
        id: 'e2',
        kind: 'status_changed',
        actorSide: 'team',
        actorName: 'Omar',
        body: null,
        fromStatus: 'submitted',
        toStatus: 'waiting_for_customer',
        createdAt: '2026-10-02T09:00:00.000Z',
      },
      {
        id: 'e3',
        kind: 'team_message',
        actorSide: 'team',
        actorName: 'Omar',
        body: 'Could you send your current colours?',
        fromStatus: null,
        toStatus: null,
        createdAt: '2026-10-02T09:01:00.000Z',
      },
    ],
    ...overrides,
    status: overrides.status ?? 'waiting_for_customer',
  };
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

let list: MockInstance<typeof customerRequestService.list>;
let get: MockInstance<typeof customerRequestService.get>;

beforeEach(() => {
  list = vi.spyOn(customerRequestService, 'list');
  get = vi.spyOn(customerRequestService, 'get');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  notify.mockReset();
  notifySuccess.mockReset();
  notifyError.mockReset();
});

const LIST_PATH = `/dashboard/academy/${ACADEMY_ID}/requests`;
const DETAIL_PATH = `${LIST_PATH}/r1`;

describe('My Requests', () => {
  it.each(['en', 'ar'] as const)(
    'lists the academy requests (%s) with no raw keys',
    async (language) => {
      list.mockResolvedValue(
        page([
          summary('r1', { title: 'A new logo', type: 'logo' }),
          summary('r2', {
            title: 'Connect our domain',
            type: 'domain',
            status: 'waiting_for_customer',
          }),
        ])
      );
      const { container } = renderAt(LIST_PATH, { language });
      const table = await screen.findByRole('table');
      expect(within(table).getByText('A new logo')).toBeTruthy();
      expect(within(table).getByText('Connect our domain')).toBeTruthy();
      expect(within(table).getByText('CR-R1000000')).toBeTruthy();
      if (language === 'en') {
        expect(within(table).getByText('Waiting for you')).toBeTruthy();
        expect(within(table).getByText('Custom domain')).toBeTruthy();
      } else {
        expect(within(table).getByText('بانتظار ردك')).toBeTruthy();
      }
      // Mobile stacked cards carry the same rows.
      expect(
        within(
          screen.getByTestId('customer-requests-mobile-list')
        ).getAllByRole('button')
      ).toHaveLength(2);
      expect(container.textContent).not.toMatch(/customerRequests:/);
      expect(list).toHaveBeenCalledWith(
        ACADEMY_ID,
        expect.objectContaining({
          sort: { field: 'lastActivityAt', direction: 'desc' },
        })
      );
    }
  );

  it('explains what can be requested when there are no requests yet', async () => {
    list.mockResolvedValue(page([]));
    renderAt(LIST_PATH);
    const empty = await screen.findByTestId('customer-requests-empty');
    expect(
      within(empty).getByRole('heading', { name: 'No requests yet' })
    ).toBeTruthy();
    const catalog = within(empty).getByTestId('request-catalog');
    expect(within(catalog).getAllByRole('button')).toHaveLength(5);
    expect(
      within(catalog).getByRole('button', { name: 'Request a custom feature' })
    ).toBeTruthy();
  });

  it('offers New request and Request a custom feature in the header', async () => {
    list.mockResolvedValue(page([summary('r1')]));
    renderAt(LIST_PATH);
    await screen.findByRole('table');
    expect(screen.getByTestId('new-customer-request')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Request a custom feature' })
    ).toBeTruthy();
  });

  it('sends the status filter as the API filter', async () => {
    list.mockResolvedValue(page([summary('r1')]));
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    renderAt(LIST_PATH);
    await screen.findByRole('table');
    await user.click(screen.getByRole('radio', { name: 'Open' }));
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith(
        ACADEMY_ID,
        expect.objectContaining({ filters: { status: 'open' } })
      )
    );
  });

  it('tells a manager who can use requests, and fetches nothing', async () => {
    renderAt(LIST_PATH, { role: 'manager' });
    expect(
      await screen.findByText('Only owners and administrators can see requests')
    ).toBeTruthy();
    expect(list).not.toHaveBeenCalled();
    expect(screen.queryByTestId('new-customer-request')).toBeNull();
  });

  it('shows an error state with retry when the list fails', async () => {
    const { ApiError } = await import('@api');
    list.mockRejectedValueOnce(
      new ApiError({
        kind: 'server',
        messageKey: 'errors.server',
        status: 500,
        retryable: true,
      })
    );
    list.mockResolvedValue(page([summary('r1', { title: 'Back again' })]));
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    renderAt(LIST_PATH);
    const retry = await screen.findByRole('button', { name: /try again/i });
    await user.click(retry);
    expect(await screen.findAllByText('Back again')).not.toHaveLength(0);
  });
});

describe('Request detail', () => {
  it('shows the summary, next step and an ordered, timed history', async () => {
    get.mockResolvedValue(detail());
    renderAt(DETAIL_PATH);
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'A new logo for spring',
      })
    ).toBeTruthy();
    expect(
      screen.getByTestId('customer-request-next-step').textContent
    ).toContain('The team needs your reply');

    const timeline = screen.getByRole('list', { name: 'Request history' });
    expect(timeline.tagName).toBe('OL');
    const items = within(timeline).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0].textContent).toContain('Sara submitted the request');
    expect(items[1].textContent).toContain('Omar changed the status');
    expect(items[1].textContent).toContain('From Submitted to Waiting for you');
    expect(items[2].textContent).toContain(
      'Could you send your current colours?'
    );
    expect(items[2].querySelector('time')?.getAttribute('dateTime')).toBe(
      '2026-10-02T09:01:00.000Z'
    );

    // The brief: description and the type's answers.
    expect(screen.getByText('Brand name on the logo')).toBeTruthy();
    expect(screen.getByText('Navy and gold')).toBeTruthy();

    expect(screen.getByTestId('customer-request-reply')).toBeTruthy();
    expect(screen.getByTestId('cancel-customer-request')).toBeTruthy();
  });

  it('hides reply and cancel once the request is closed', async () => {
    get.mockResolvedValue(
      detail({ status: 'completed', canCancel: false, canReply: false })
    );
    renderAt(DETAIL_PATH);
    expect(
      await screen.findByTestId('customer-request-closed-notice')
    ).toBeTruthy();
    expect(screen.queryByTestId('customer-request-reply')).toBeNull();
    expect(screen.queryByTestId('cancel-customer-request')).toBeNull();
  });

  it('never shows an internal event even if one were returned', async () => {
    get.mockResolvedValue(
      detail({
        events: [
          {
            id: 'secret',
            kind: 'internal_note',
            visibility: 'internal',
            actorSide: 'team',
            actorName: 'Omar',
            body: 'Team-only remark',
            fromStatus: null,
            toStatus: null,
            createdAt: '2026-10-02T09:00:00.000Z',
          },
        ],
      })
    );
    renderAt(DETAIL_PATH);
    await screen.findByTestId('customer-request-next-step');
    expect(screen.queryByText('Team-only remark')).toBeNull();
  });

  it('sends a reply and clears the box once accepted', async () => {
    get.mockResolvedValue(detail());
    const reply = vi
      .spyOn(customerRequestService, 'reply')
      .mockResolvedValue(detail());
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    renderAt(DETAIL_PATH);
    const box = await screen.findByTestId('customer-request-reply');
    await user.type(box, 'Navy #001F3F and gold.');
    await user.click(screen.getByTestId('send-customer-request-reply'));
    await waitFor(() =>
      expect(reply).toHaveBeenCalledWith(
        ACADEMY_ID,
        'r1',
        'Navy #001F3F and gold.'
      )
    );
    await waitFor(() => expect((box as HTMLTextAreaElement).value).toBe(''));
    expect(notifySuccess).toHaveBeenCalledWith(
      'customerRequests:detail.replySent'
    );
  });

  it('confirms before cancelling, and cancels once', async () => {
    get.mockResolvedValue(detail());
    const cancel = vi
      .spyOn(customerRequestService, 'cancel')
      .mockResolvedValue(
        detail({ status: 'cancelled', canCancel: false, canReply: false })
      );
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    renderAt(DETAIL_PATH);
    await user.click(await screen.findByTestId('cancel-customer-request'));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toContain('A new logo for spring');
    expect(cancel).not.toHaveBeenCalled();
    await user.click(
      within(dialog).getByTestId('confirm-cancel-customer-request')
    );
    await waitFor(() => expect(cancel).toHaveBeenCalledTimes(1));
    expect(cancel).toHaveBeenCalledWith(ACADEMY_ID, 'r1');
    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith(
        'customerRequests:detail.cancelled'
      )
    );
  });
});
