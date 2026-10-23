/**
 * B2 — Platform Founding Academies page.
 *
 *  1. The seat meter, the table and the statuses render in EN and AR with
 *     no raw keys; search and status are server filters.
 *  2. "Add founding academy" shows the server quote (seat and the price
 *     that will be locked) and creates with no client-sent price.
 *  3. "Email founders" reviews the server's recipient count before sending
 *     and sends that confirmed count.
 *  4. Revoke needs a reason and a confirmation.
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
import { apiClient } from '@api';
import type { LanguageCode } from '@types';
import type {
  FoundingMembership,
  FoundingMembershipDetail,
} from './services/PlatformFoundingService';

const notify = vi.fn();
const notifySuccess = vi.fn();
const notifyError = vi.fn();

vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useToast: () => ({ notify, notifySuccess, notifyError, dismissAll: vi.fn() }),
}));

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

const { default: PlatformFoundingAcademiesPage } =
  await import('./pages/PlatformFoundingAcademiesPage');

const BASE = 'platform-founding-academies';

function membership(
  id: string,
  overrides: Partial<FoundingMembership> = {}
): FoundingMembership {
  return {
    id,
    seatNumber: 1,
    status: 'active',
    organization: { id: `org-${id}`, name: `Academy ${id}` },
    owner: { name: `Owner ${id}`, email: `${id}@example.com` },
    plan: {
      id: 'p-growth',
      key: 'growth',
      name: 'Growth',
      nameLocalized: { en: 'Growth', ar: 'النمو' },
    },
    lockedPrice: { amount: 27900, currency: 'EGP' },
    lockStartsAt: '2026-10-01T00:00:00.000Z',
    lockEndsAt: '2028-10-01T00:00:00.000Z',
    subscription: {
      status: 'active',
      billingCycle: 'yearly',
      planKey: 'growth',
      planName: 'Growth',
      currentPeriodEnd: '2027-10-01T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    },
    nextRenewal: {
      amount: 27900,
      currency: 'EGP',
      locked: true,
      periodStartsAt: '2027-10-01T00:00:00.000Z',
    },
    conciergeHoursUsed: 2.5,
    conciergeHoursCap: 6,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
    ...overrides,
  };
}

const ROWS: FoundingMembership[] = [
  membership('a'),
  membership('b', {
    seatNumber: 2,
    status: 'revoked',
    organization: { id: 'org-b', name: 'Revoked Academy' },
  }),
];

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();

function serve() {
  get.mockImplementation(
    async (path: string, options?: { params?: Record<string, unknown> }) => {
      if (path === BASE) {
        const status = options?.params?.status;
        const items = status
          ? ROWS.filter((row) => row.status === status)
          : ROWS;
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
      if (path === `${BASE}/summary`)
        return {
          seatCap: 20,
          seatsTaken: 1,
          seatsAvailable: 19,
          onboardedThisWeek: 1,
          weeklyTarget: 5,
          weekStartsAt: '2026-10-18T21:00:00.000Z',
          counts: { active: 1, ended: 0, revoked: 1 },
        };
      if (path === `${BASE}/plans`)
        return [
          {
            id: 'p-growth',
            key: 'growth',
            name: 'Growth',
            annualPrice: { amount: 27900, currency: 'EGP' },
          },
        ];
      if (path === `${BASE}/candidates`)
        return [
          {
            id: 'org-new',
            name: 'New Academy',
            ownerName: 'Mona',
            ownerEmail: 'mona@example.com',
          },
        ];
      if (path === `${BASE}/quote`)
        return {
          organization: { id: 'org-new', name: 'New Academy' },
          owner: { name: 'Mona', email: 'mona@example.com' },
          plan: { id: 'p-growth', key: 'growth', name: 'Growth' },
          lockedPrice: { amount: 27900, currency: 'EGP' },
          nextSeatNumber: 2,
          alreadyMember: false,
        };
      if (path === 'platform/contact-submissions')
        return {
          items: [],
          pagination: { page: 1, pageSize: 50, totalItems: 0, totalPages: 1 },
        };
      if (path.startsWith(`${BASE}/`)) {
        const detail: FoundingMembershipDetail = {
          ...membership('a'),
          timeline: [],
        };
        return detail;
      }
      throw new Error(`unexpected GET ${path}`);
    }
  );
  post.mockImplementation(
    async (path: string, body: Record<string, unknown>) => {
      if (path === `${BASE}/email/preview`)
        return {
          recipientCount: 1,
          recipients: [
            {
              membershipId: 'a',
              seatNumber: 1,
              organizationName: 'Academy a',
              ownerName: 'Owner a',
            },
          ],
          quota: {
            provider: 'brevo',
            dailyLimit: 255,
            dailyUsed: 10,
            remainingToday: 245,
          },
        };
      if (path === `${BASE}/email`)
        return { sendId: 's1', queued: body.confirmRecipientCount };
      if (path === BASE)
        return {
          ...membership('new', {
            organization: { id: 'org-new', name: 'New Academy' },
          }),
          timeline: [],
        };
      if (path.endsWith('/revoke'))
        return { ...membership('a', { status: 'revoked' }), timeline: [] };
      throw new Error(`unexpected POST ${path}`);
    }
  );
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
              initialEntries={['/dashboard/platform/founding-academies']}
            >
              <PlatformFoundingAcademiesPage />
            </MemoryRouter>
          </div>
        </LocalizationContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

const USER = { delay: null, pointerEventsCheck: 0 } as const;

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
  serve();
  vi.spyOn(apiClient, 'get').mockImplementation(((
    path: string,
    options?: unknown
  ) => get(path, options)) as typeof apiClient.get);
  vi.spyOn(apiClient, 'post').mockImplementation(((
    path: string,
    body: unknown
  ) => post(path, body)) as typeof apiClient.post);
  vi.spyOn(apiClient, 'patch').mockImplementation(((
    path: string,
    body: unknown
  ) => patch(path, body)) as typeof apiClient.patch);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  get.mockReset();
  post.mockReset();
  patch.mockReset();
  notifySuccess.mockReset();
  notifyError.mockReset();
});

const RAW_KEYS = /platform:founding|founding\.(meter|table|status)\./;

describe('Platform Founding Academies page', () => {
  it('renders the seat meter, rows and statuses with no raw keys (EN and AR)', async () => {
    const { container } = renderPage();
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Academy a')).toBeTruthy();
    expect(within(table).getByText('Revoked')).toBeTruthy();
    const meters = await screen.findAllByRole('meter');
    expect(meters[0].getAttribute('aria-valuenow')).toBe('1');
    expect(meters[0].getAttribute('aria-valuemax')).toBe('20');
    expect(meters[1].getAttribute('aria-valuemax')).toBe('5');
    expect(container.textContent).not.toMatch(RAW_KEYS);
    cleanup();

    const ar = renderPage('ar');
    await screen.findByRole('table');
    expect(ar.container.textContent).toMatch(/[؀-ۿ]/);
    expect(ar.container.textContent).not.toMatch(RAW_KEYS);
  });

  it('sends the status filter to the server', async () => {
    renderPage();
    await screen.findByRole('table');
    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), {
      target: { value: 'revoked' },
    });
    await waitFor(() =>
      expect(
        get.mock.calls.some(
          ([path, options]) =>
            path === BASE && options?.params?.status === 'revoked'
        )
      ).toBe(true)
    );
  });

  it('adds a founding academy from the server quote, sending no price', async () => {
    const user = userEvent.setup(USER);
    renderPage();
    await screen.findByRole('table');
    await user.click(
      screen.getAllByRole('button', { name: 'Add founding academy' })[0]
    );
    const dialog = await screen.findByRole('dialog');
    await user.click(
      await within(dialog).findByRole('radio', { name: /New Academy/ })
    );
    const quote = await within(dialog).findByTestId('founding-quote');
    expect(quote.textContent).toContain('Seat 2');
    expect(quote.textContent).toMatch(/27,900/);
    await user.click(
      within(dialog).getByRole('button', { name: 'Add founding academy' })
    );
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        BASE,
        expect.objectContaining({
          organizationId: 'org-new',
          planKey: 'growth',
        })
      )
    );
    const body = post.mock.calls.find(([path]) => path === BASE)?.[1] as Record<
      string,
      unknown
    >;
    expect(Object.keys(body)).not.toContain('price');
    expect(Object.keys(body)).not.toContain('lockedAmount');
  });

  it('reviews the recipient count before sending, and sends that confirmed count', async () => {
    const user = userEvent.setup(USER);
    renderPage();
    const table = await screen.findByRole('table');
    await user.click(
      within(table).getByRole('checkbox', { name: 'Select Academy a' })
    );
    await user.click(screen.getByRole('button', { name: 'Email selected' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getAllByLabelText('Subject')[0], 'Setup');
    await user.type(within(dialog).getAllByLabelText('Message')[0], 'Hello');
    await user.type(within(dialog).getAllByLabelText('Subject')[1], 'التجهيز');
    await user.type(within(dialog).getAllByLabelText('Message')[1], 'أهلًا');
    await user.click(within(dialog).getByRole('button', { name: 'Review' }));
    expect(
      (await within(dialog).findByTestId('founding-email-count')).textContent
    ).toContain('1');
    expect(post).toHaveBeenCalledWith(`${BASE}/email/preview`, {
      audience: 'selected',
      membershipIds: ['a'],
    });
    await user.click(within(dialog).getByRole('button', { name: /Send/ }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        `${BASE}/email`,
        expect.objectContaining({
          audience: 'selected',
          membershipIds: ['a'],
          confirmRecipientCount: 1,
        })
      )
    );
  });

  it('revokes only with a reason and a confirmation', async () => {
    const user = userEvent.setup(USER);
    renderPage();
    const table = await screen.findByRole('table');
    await user.click(within(table).getByText('Academy a'));
    const sheet = await screen.findByRole('dialog');
    await user.click(
      await within(sheet).findByRole('button', { name: 'Revoke membership' })
    );
    const confirm = await screen.findByRole('alertdialog');
    const action = within(confirm).getByRole('button', { name: 'Revoke' });
    expect((action as HTMLButtonElement).disabled).toBe(true);
    await user.type(
      within(confirm).getByLabelText(/Reason/),
      'Left the programme'
    );
    await user.click(action);
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(`${BASE}/a/revoke`, {
        reason: 'Left the programme',
      })
    );
  });
});
