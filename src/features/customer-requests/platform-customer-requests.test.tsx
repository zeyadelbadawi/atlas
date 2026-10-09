/**
 * Customer Requests — the Platform Owner console.
 *
 * Pinned here:
 *  1. The list renders the cross-academy queue and the counts strip, and
 *     the Unassigned filter is sent under the API's own word.
 *  2. The detail shows internal notes DISTINCTLY (marked, amber, "Only
 *     visible to the Atlas team") and assignment events, where emails go,
 *     and limits the status control to the server's `allowedStatuses`.
 *  3. A status change carries the optional customer-visible note; a 409
 *     invalid transition surfaces as a toast with its own copy.
 *  4. The composer sends an internal note with `internal: true`.
 *  5. Routing saves the whole table, an empty inbox as `null`, and an
 *     invalid address is stopped next to its field.
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
import { ApiError } from '@api';
import { platformCustomerRequestService } from './services/PlatformCustomerRequestService';
import type {
  CustomerRequestRoutingRule,
  PlatformCustomerRequestDetail,
  PlatformCustomerRequestSummary,
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
    Select: ({ value, onValueChange, children, disabled }: AnyProps) =>
      React.createElement(
        'select',
        {
          'aria-label': labelOf(children),
          value: value as string,
          disabled: disabled as boolean,
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
            (onValueChange as (next: string) => void)(event.target.value),
        },
        React.createElement('option', { value: '' }, '—'),
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

const { default: PlatformCustomerRequestsPage } =
  await import('./pages/PlatformCustomerRequestsPage');
const { default: PlatformCustomerRequestDetailPage } =
  await import('./pages/PlatformCustomerRequestDetailPage');
const { default: PlatformCustomerRequestRoutingPage } =
  await import('./pages/PlatformCustomerRequestRoutingPage');

const LOCALIZATION: LocalizationContextValue = {
  language: 'en',
  languageDefinition: {} as LocalizationContextValue['languageDefinition'],
  direction: 'ltr',
  isRtl: false,
  locale: 'en-US',
  availableLanguages: [],
  setLanguage: () => undefined,
};

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18nInstance('en')}>
        <LocalizationContext.Provider value={LOCALIZATION}>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route
                path="/dashboard/platform/customer-requests"
                element={<PlatformCustomerRequestsPage />}
              />
              <Route
                path="/dashboard/platform/customer-requests/routing"
                element={<PlatformCustomerRequestRoutingPage />}
              />
              <Route
                path="/dashboard/platform/customer-requests/:requestId"
                element={<PlatformCustomerRequestDetailPage />}
              />
            </Routes>
          </MemoryRouter>
        </LocalizationContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

const OWNERS = [
  { id: 'owner-1', name: 'Omar' },
  { id: 'owner-2', name: 'Layla' },
];

function summary(
  id: string,
  overrides: Partial<PlatformCustomerRequestSummary> = {}
): PlatformCustomerRequestSummary {
  return {
    id,
    reference: `CR-${id.toUpperCase().padEnd(8, '0')}`,
    type: 'theme',
    title: `Request ${id}`,
    status: 'submitted',
    priority: 'high',
    academy: { id: 'academy-1', name: 'Nile Academy' },
    organization: { id: 'org-1', name: 'Nile Org' },
    requester: { name: 'Sara' },
    assignee: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    lastActivityAt: '2026-10-02T10:00:00.000Z',
    ...overrides,
  };
}

function detail(
  overrides: Partial<PlatformCustomerRequestDetail> = {}
): PlatformCustomerRequestDetail {
  return {
    ...summary('r1', { title: 'A custom theme' }),
    description: 'We want a calm, professional theme.',
    details: { style: 'Calm' },
    closedAt: null,
    canCancel: true,
    canReply: true,
    requesterEmail: 'sara@nile.example',
    assignee: { id: 'owner-1', name: 'Omar' },
    allowedStatuses: ['under_review', 'rejected'],
    routedTo: 'design@atlas.example',
    events: [
      {
        id: 'e1',
        kind: 'created',
        visibility: 'customer',
        actorSide: 'customer',
        actorName: 'Sara',
        body: null,
        fromStatus: null,
        toStatus: 'submitted',
        createdAt: '2026-10-01T10:00:00.000Z',
      },
      {
        id: 'e2',
        kind: 'assigned',
        visibility: 'internal',
        actorSide: 'team',
        actorName: 'Layla',
        body: null,
        fromStatus: null,
        toStatus: null,
        assignee: { id: 'owner-1', name: 'Omar' },
        createdAt: '2026-10-01T11:00:00.000Z',
      },
      {
        id: 'e3',
        kind: 'internal_note',
        visibility: 'internal',
        actorSide: 'team',
        actorName: 'Omar',
        body: 'Check the brand guide before replying.',
        fromStatus: null,
        toStatus: null,
        createdAt: '2026-10-01T12:00:00.000Z',
      },
      {
        id: 'e4',
        kind: 'team_message',
        visibility: 'customer',
        actorSide: 'team',
        actorName: 'Omar',
        body: 'Thanks — we are on it.',
        fromStatus: null,
        toStatus: null,
        createdAt: '2026-10-01T13:00:00.000Z',
      },
    ],
    ...overrides,
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

beforeEach(() => {
  vi.spyOn(platformCustomerRequestService, 'assignees').mockResolvedValue(
    OWNERS
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  notify.mockReset();
  notifySuccess.mockReset();
  notifyError.mockReset();
});

describe('Platform customer requests — list', () => {
  it('renders the queue, the counts and sends the Unassigned filter', async () => {
    const list = vi
      .spyOn(platformCustomerRequestService, 'list')
      .mockResolvedValue({
        items: [
          summary('r1', { title: 'A custom theme' }),
          summary('r2', {
            title: 'Our own domain',
            type: 'domain',
            assignee: { id: 'owner-2', name: 'Layla' },
          }),
        ],
        pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
      });
    vi.spyOn(platformCustomerRequestService, 'counts').mockResolvedValue({
      open: 7,
      byStatus: {
        submitted: 3,
        received: 1,
        under_review: 1,
        in_progress: 1,
        waiting_for_customer: 1,
        completed: 4,
        rejected: 0,
        cancelled: 2,
      },
    });
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    const { container } = renderAt('/dashboard/platform/customer-requests');

    const table = await screen.findByRole('table');
    expect(within(table).getByText('A custom theme')).toBeTruthy();
    expect(within(table).getAllByText('Nile Academy')).toHaveLength(2);
    expect(within(table).getByText('Layla')).toBeTruthy();
    expect(within(table).getAllByText('Unassigned').length).toBeGreaterThan(0);
    expect(await screen.findByText('7 open')).toBeTruthy();
    const open = screen.getByRole('radio', { name: /Open/ });
    expect(open.textContent).toContain('7');
    expect(container.textContent).not.toMatch(/customerRequests:/);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Assignee' }),
      'unassigned'
    );
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: { assigneeUserId: 'unassigned' },
        })
      )
    );
  });
});

describe('Platform customer requests — detail', () => {
  it('marks internal notes distinctly and shows assignment events', async () => {
    vi.spyOn(platformCustomerRequestService, 'get').mockResolvedValue(detail());
    renderAt('/dashboard/platform/customer-requests/r1');

    const timeline = await screen.findByRole('list', {
      name: 'Request history',
    });
    const items = within(timeline).getAllByRole('listitem');
    expect(items).toHaveLength(4);

    const note = screen.getByTestId('customer-request-event-e3');
    expect(note.getAttribute('data-internal')).toBe('true');
    expect(note.textContent).toContain('Only visible to the Atlas team');
    expect(note.textContent).toContain(
      'Check the brand guide before replying.'
    );
    expect(note.querySelector('.bg-warning-surface')).not.toBeNull();

    const reply = screen.getByTestId('customer-request-event-e4');
    expect(reply.getAttribute('data-internal')).toBeNull();
    expect(reply.textContent).not.toContain('Only visible to the Atlas team');

    expect(
      screen.getByTestId('customer-request-event-e2').textContent
    ).toContain('Layla assigned the request to Omar');

    expect(screen.getByTestId('customer-request-routed-to').textContent).toBe(
      'design@atlas.example'
    );
    expect(screen.getByText('sara@nile.example')).toBeTruthy();
  });

  it('says "All Platform Owners" when no team inbox is set', async () => {
    vi.spyOn(platformCustomerRequestService, 'get').mockResolvedValue(
      detail({ routedTo: null })
    );
    renderAt('/dashboard/platform/customer-requests/r1');
    expect(
      (await screen.findByTestId('customer-request-routed-to')).textContent
    ).toBe('All Platform Owners');
  });

  it('limits the status control to allowedStatuses and sends the note', async () => {
    vi.spyOn(platformCustomerRequestService, 'get').mockResolvedValue(detail());
    const update = vi
      .spyOn(platformCustomerRequestService, 'update')
      .mockResolvedValue(detail({ status: 'rejected' }));
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    renderAt('/dashboard/platform/customer-requests/r1');

    const select = await screen.findByRole('combobox', { name: 'Move to' });
    const options = within(select)
      .getAllByRole('option')
      .map((option) => option.textContent)
      .filter((label) => label !== '—');
    expect(options).toEqual(['Under review', 'Declined']);

    await user.selectOptions(select, 'rejected');
    // Declining asks for a reason.
    expect(
      screen.getByText(
        'Declining is final. Tell the customer why, and what they can do instead.'
      )
    ).toBeTruthy();
    await user.type(
      screen.getByTestId('customer-request-status-note'),
      'We only build themes on the Pro plan.'
    );
    await user.click(screen.getByTestId('customer-request-update-status'));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('r1', {
        status: 'rejected',
        note: 'We only build themes on the Pro plan.',
      })
    );
  });

  it('shows a 409 invalid transition as a toast with its own copy', async () => {
    vi.spyOn(platformCustomerRequestService, 'get').mockResolvedValue(detail());
    vi.spyOn(platformCustomerRequestService, 'update').mockRejectedValue(
      new ApiError({
        kind: 'conflict',
        messageKey: 'errors.customerRequest.invalidTransition',
        status: 409,
        retryable: false,
      })
    );
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    renderAt('/dashboard/platform/customer-requests/r1');
    await user.selectOptions(
      await screen.findByRole('combobox', { name: 'Move to' }),
      'under_review'
    );
    await user.click(screen.getByTestId('customer-request-update-status'));
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith({
        intent: 'error',
        titleKey: 'customerRequests:platform.detail.updateFailed',
        descriptionKey: 'errors:customerRequest.invalidTransition',
      })
    );
  });

  it('reassigns from the assignee select', async () => {
    vi.spyOn(platformCustomerRequestService, 'get').mockResolvedValue(detail());
    const update = vi
      .spyOn(platformCustomerRequestService, 'update')
      .mockResolvedValue(detail());
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    renderAt('/dashboard/platform/customer-requests/r1');
    const assignee = await screen.findByRole('combobox', { name: 'Assignee' });
    await waitFor(() =>
      expect(
        within(assignee).getByRole('option', { name: 'Layla' })
      ).toBeTruthy()
    );
    await user.selectOptions(assignee, 'unassigned');
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('r1', { assigneeUserId: null })
    );
  });

  it('sends an internal note with internal: true', async () => {
    vi.spyOn(platformCustomerRequestService, 'get').mockResolvedValue(detail());
    const message = vi
      .spyOn(platformCustomerRequestService, 'message')
      .mockResolvedValue(detail());
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    renderAt('/dashboard/platform/customer-requests/r1');

    await user.click(
      await screen.findByRole('radio', { name: 'Internal note' })
    );
    const composer = screen.getByTestId('platform-request-composer');
    expect(composer.textContent).toContain('Only visible to the Atlas team');
    expect(
      within(composer).getByRole('button', { name: 'Add note' })
    ).toBeTruthy();

    await user.type(
      screen.getByTestId('platform-request-message'),
      'Waiting on design capacity.'
    );
    await user.click(screen.getByTestId('platform-request-send'));
    await waitFor(() =>
      expect(message).toHaveBeenCalledWith('r1', {
        body: 'Waiting on design capacity.',
        internal: true,
      })
    );
  });

  it('only allows internal notes on a closed request', async () => {
    vi.spyOn(platformCustomerRequestService, 'get').mockResolvedValue(
      detail({ status: 'completed', allowedStatuses: ['in_progress'] })
    );
    renderAt('/dashboard/platform/customer-requests/r1');
    const reply = await screen.findByRole('radio', {
      name: 'Reply to customer',
    });
    expect(reply.hasAttribute('disabled')).toBe(true);
    expect(
      screen.getByText(
        'This request is closed, so only internal notes can be added.'
      )
    ).toBeTruthy();
  });
});

describe('Platform customer requests — routing', () => {
  const RULES: readonly CustomerRequestRoutingRule[] = [
    { type: 'logo', email: null, updatedAt: null },
    {
      type: 'domain',
      email: 'infra@atlas.example',
      updatedAt: '2026-09-01T10:00:00.000Z',
    },
    { type: 'theme', email: null, updatedAt: null },
    { type: 'custom_section', email: null, updatedAt: null },
    { type: 'custom_feature', email: null, updatedAt: null },
  ];

  it('saves every rule, an empty inbox as null', async () => {
    vi.spyOn(platformCustomerRequestService, 'routing').mockResolvedValue(
      RULES
    );
    const save = vi
      .spyOn(platformCustomerRequestService, 'updateRouting')
      .mockImplementation(async (payload) =>
        payload.rules.map((rule) => ({
          ...rule,
          updatedAt: '2026-10-08T10:00:00.000Z',
        }))
      );
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    renderAt('/dashboard/platform/customer-requests/routing');

    const logo = await screen.findByTestId('routing-email-logo');
    const domain = screen.getByTestId('routing-email-domain');
    await waitFor(() =>
      expect((domain as HTMLInputElement).value).toBe('infra@atlas.example')
    );
    expect(screen.getByLabelText('Logo inbox')).toBe(logo);

    await user.type(logo, 'design@atlas.example');
    await user.clear(domain);
    await user.click(screen.getByTestId('routing-save'));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        rules: [
          { type: 'logo', email: 'design@atlas.example' },
          { type: 'domain', email: null },
          { type: 'theme', email: null },
          { type: 'custom_section', email: null },
          { type: 'custom_feature', email: null },
        ],
      })
    );
    await waitFor(() =>
      expect(notifySuccess).toHaveBeenCalledWith(
        'customerRequests:routing.saved'
      )
    );
  });

  it('stops an invalid address next to its field', async () => {
    vi.spyOn(platformCustomerRequestService, 'routing').mockResolvedValue(
      RULES
    );
    const save = vi.spyOn(platformCustomerRequestService, 'updateRouting');
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    renderAt('/dashboard/platform/customer-requests/routing');
    await user.type(
      await screen.findByTestId('routing-email-theme'),
      'not-an-email'
    );
    await user.click(screen.getByTestId('routing-save'));
    expect(
      await screen.findByText('Enter a valid email address, or leave it empty.')
    ).toBeTruthy();
    expect(save).not.toHaveBeenCalled();
  });
});
