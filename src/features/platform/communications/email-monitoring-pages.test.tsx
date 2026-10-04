/**
 * W3 — Academy Email Activity and OTP & Security Monitoring pages.
 *
 * The real pages, hooks, services and query cache run; only the transport
 * (`apiClient.get`) is replaced by a small in-memory backend, so what is
 * pinned is the exact request each page sends and what the operator reads:
 * loading, empty, error and data states, in English and Arabic, with no
 * raw translation key, full address, IP or code ever rendered.
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
  EmailActivityItem,
  EmailActivityPage as ActivityPageData,
  EmailActivitySummary,
  SecurityEventPage,
  SecurityMonitoringSummary,
} from './services/platform-email-monitoring.types';

/* Radix `Select` never finishes opening in jsdom: swap it for a native one. */
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

const { default: EmailActivityPage } =
  await import('./activity/EmailActivityPage');
const { default: SecurityMonitoringPage } =
  await import('./security/SecurityMonitoringPage');

const ACADEMY = '11111111-1111-4111-8111-111111111111';
const ZERO_STATUSES = {
  queued: 0,
  retrying: 0,
  waiting: 0,
  sent: 0,
  delivered: 0,
  delayed: 0,
  bounced: 0,
  complained: 0,
  not_sent: 0,
  in_app_only: 0,
  suppressed: 0,
  failed: 0,
};

function activityItem(
  id: string,
  overrides: Partial<EmailActivityItem> = {}
): EmailActivityItem {
  return {
    id,
    key: 'enrollment.granted',
    category: 'transactional',
    security: false,
    status: 'delivered',
    deliveryStatus: 'delivered',
    provider: 'brevo',
    errorCategory: null,
    recipient: { maskedEmail: 'l•••@example.com' },
    academy: { id: ACADEMY, name: 'Horizon Academy' },
    locale: 'en',
    attempts: 1,
    createdAt: '2026-10-02T09:00:00.000Z',
    dispatchedAt: '2026-10-02T09:00:05.000Z',
    deliveryUpdatedAt: null,
    ...overrides,
  };
}

const ACTIVITY_ITEMS: readonly EmailActivityItem[] = [
  activityItem('e1'),
  activityItem('e2', {
    key: 'course.order.paid',
    status: 'failed',
    deliveryStatus: 'failed',
    errorCategory: 'provider_rejected',
    attempts: 6,
  }),
  activityItem('e3', {
    key: 'auth.email.otp',
    category: 'security',
    security: true,
    status: 'sent',
    deliveryStatus: 'sent',
  }),
];

const ACTIVITY_SUMMARY: EmailActivitySummary = {
  window: { from: '2026-09-03T00:00:00.000Z', to: '2026-10-03T00:00:00.000Z' },
  total: 3,
  byStatus: { ...ZERO_STATUSES, delivered: 1, failed: 1, sent: 1 },
  academies: [
    {
      academyId: ACADEMY,
      academyName: 'Horizon Academy',
      total: 3,
      byStatus: { ...ZERO_STATUSES, delivered: 1, failed: 1, sent: 1 },
    },
  ],
  deliveryWebhooksObserved: false,
};

const SECURITY_SUMMARY: SecurityMonitoringSummary = {
  windowDays: 7,
  totals: {
    otpSent: 8,
    otpResent: 2,
    otpVerified: 7,
    otpFailed: 3,
    otpExpired: 1,
    otpLocked: 1,
    otpSuppressed: 0,
    otpRateLimited: 4,
    signinRateLimited: 6,
    deletionCodeSent: 1,
    deletionCodeVerified: 1,
    deletionCodeFailed: 0,
    deletionCodeLocked: 0,
    deletionCodeRateLimited: 0,
  },
  verifyRate: 0.7,
  series: [
    {
      date: '2026-10-02',
      sent: 6,
      verified: 4,
      failed: 2,
      locked: 1,
      rateLimited: 5,
    },
    {
      date: '2026-10-03',
      sent: 4,
      verified: 3,
      failed: 2,
      locked: 0,
      rateLimited: 5,
    },
  ],
  generatedAt: '2026-10-03T12:00:00.000Z',
};

const SECURITY_EVENTS: SecurityEventPage = {
  items: [
    {
      id: 's1',
      type: 'otp_failed',
      surface: 'academy',
      academy: { id: ACADEMY, name: 'Horizon Academy' },
      maskedEmail: 's•••@example.com',
      subjectRef: 'a1b2c3d4',
      ipRef: '9f8e7d6c',
      reason: 'invalid_code',
      attemptsRemaining: 3,
      occurrences: 1,
      createdAt: '2026-10-03T10:00:00.000Z',
    },
    {
      id: 's2',
      type: 'signin_rate_limited',
      surface: 'management',
      academy: null,
      maskedEmail: null,
      subjectRef: 'deadbeef',
      ipRef: '01234567',
      reason: 'ip_budget',
      attemptsRemaining: null,
      occurrences: 12,
      createdAt: '2026-10-03T09:00:00.000Z',
    },
  ],
  nextCursor: null,
};

type Mode = 'data' | 'empty' | 'error' | 'pending';
let mode: Mode = 'data';
const get = vi.fn<(path: string, options?: ReadOptions) => Promise<unknown>>();

function serve(): void {
  get.mockImplementation(async (path) => {
    if (mode === 'pending') return new Promise(() => undefined);
    if (mode === 'error') {
      throw new ApiError({
        kind: 'server',
        messageKey: 'errors.server',
        status: 500,
        retryable: true,
      });
    }
    const empty = mode === 'empty';
    switch (path) {
      case 'platform-communications/email-activity':
        return {
          items: empty ? [] : ACTIVITY_ITEMS,
          nextCursor: null,
          window: ACTIVITY_SUMMARY.window,
        } satisfies ActivityPageData;
      case 'platform-communications/email-activity/summary':
        return empty
          ? {
              ...ACTIVITY_SUMMARY,
              total: 0,
              byStatus: ZERO_STATUSES,
              academies: [],
            }
          : ACTIVITY_SUMMARY;
      case 'platform-security/summary':
        return SECURITY_SUMMARY;
      case 'platform-security/events':
        return empty ? { items: [], nextCursor: null } : SECURITY_EVENTS;
      default:
        throw new Error(`unexpected GET ${path}`);
    }
  });
}

function paramsOf(path: string): Record<string, unknown> {
  const calls = get.mock.calls.filter(([p]) => p === path);
  return (calls.at(-1)?.[1]?.params ?? {}) as Record<string, unknown>;
}

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

function renderPage(
  page: 'activity' | 'security',
  language: LanguageCode = 'en'
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Page = page === 'activity' ? EmailActivityPage : SecurityMonitoringPage;
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={I18N[language]}>
        <LocalizationContext.Provider value={localization(language)}>
          <div dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <MemoryRouter
              initialEntries={[`/dashboard/platform/email/${page}`]}
            >
              <Page />
            </MemoryRouter>
          </div>
        </LocalizationContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

function expectNoRawKeys(container: HTMLElement): void {
  expect(container.textContent ?? '').not.toMatch(
    /platformEmail:|navigation:items/
  );
}

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
  mode = 'data';
  serve();
  vi.spyOn(apiClient, 'get').mockImplementation(((
    path: string,
    options?: ReadOptions
  ) => get(path, options)) as typeof apiClient.get);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  get.mockReset();
});

describe('Academy Email Activity page', () => {
  it('shows a loading state before data arrives', async () => {
    mode = 'pending';
    const { container } = renderPage('activity');
    expect(
      await screen.findByRole('heading', { name: 'Academy Email Activity' })
    ).toBeTruthy();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('renders rows with honest statuses, masked recipients and error categories (EN)', async () => {
    const { container } = renderPage('activity');
    const table = await screen.findByRole('table', {
      name: 'Academy emails, newest first',
    });
    expect(
      within(table).getAllByText('l•••@example.com').length
    ).toBeGreaterThan(0);
    expect(within(table).getByText('Delivered')).toBeTruthy();
    expect(within(table).getByText('Failed')).toBeTruthy();
    expect(within(table).getByText('Sent to provider')).toBeTruthy();
    expect(
      within(table).getByText('Provider rejected the message')
    ).toBeTruthy();
    expect(within(table).getByText('Security email')).toBeTruthy();
    // The summary and the honest note about missing delivery confirmations.
    expect(screen.getByText('Failed or bounced')).toBeTruthy();
    expect(screen.getByRole('note').textContent).toContain(
      'No delivery confirmations'
    );
    expect(
      screen.getByRole('button', { name: 'Show emails for Horizon Academy' })
    ).toBeTruthy();
    expectNoRawKeys(container);
  });

  it('sends the status filter to the server', async () => {
    renderPage('activity');
    await screen.findByRole('table');
    fireEvent.change(screen.getByLabelText('Status'), {
      target: { value: 'failed' },
    });
    await waitFor(() =>
      expect(paramsOf('platform-communications/email-activity').status).toBe(
        'failed'
      )
    );
    expect(typeof paramsOf('platform-communications/email-activity').from).toBe(
      'string'
    );
  });

  it('filters to one academy from the busiest-academies list', async () => {
    renderPage('activity');
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Show emails for Horizon Academy',
      })
    );
    await waitFor(() =>
      expect(paramsOf('platform-communications/email-activity').academyId).toBe(
        ACADEMY
      )
    );
  });

  it('distinguishes the empty state', async () => {
    mode = 'empty';
    renderPage('activity');
    expect(
      await screen.findByText('No academy emails in this period')
    ).toBeTruthy();
  });

  it('shows an error state with retry when the read fails', async () => {
    mode = 'error';
    renderPage('activity');
    expect(
      await screen.findByRole('button', { name: /try again|retry/i })
    ).toBeTruthy();
  });

  it('renders in Arabic with no raw keys', async () => {
    const { container } = renderPage('activity', 'ar');
    expect(
      await screen.findByRole('heading', { name: 'نشاط بريد الأكاديميات' })
    ).toBeTruthy();
    const table = await screen.findByRole('table');
    expect(within(table).getByText('تم التسليم')).toBeTruthy();
    expect(within(table).getByText('رفض المزوّد الرسالة')).toBeTruthy();
    expectNoRawKeys(container);
  });
});

describe('OTP & Security Monitoring page', () => {
  it('shows a loading state before data arrives', async () => {
    mode = 'pending';
    const { container } = renderPage('security');
    expect(
      await screen.findByRole('heading', { name: 'OTP & Security Monitoring' })
    ).toBeTruthy();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('renders aggregates and masked recent events (EN)', async () => {
    const { container } = renderPage('security');
    const sentTile = (await screen.findByText('Codes sent')).closest(
      'div.rounded-lg'
    );
    expect(sentTile?.textContent).toContain('10'); // 8 sent + 2 resent
    const rateTile = screen
      .getByText('Rate-limit hits')
      .closest('div.rounded-lg');
    expect(rateTile?.textContent).toContain('10'); // 4 code + 6 sign-in
    expect(screen.getByText('70%')).toBeTruthy();
    expect(screen.getByText('Lockouts')).toBeTruthy();
    const table = await screen.findByRole('table', {
      name: 'Security events, newest first',
    });
    expect(within(table).getByText('s•••@example.com')).toBeTruthy();
    expect(
      within(table).getByText('Before sign-in (ref deadbeef)')
    ).toBeTruthy();
    expect(within(table).getByText('IP ref 9f8e7d6c')).toBeTruthy();
    expect(within(table).getByText(/12 times/)).toBeTruthy();
    expect(within(table).getByText(/3 attempts left/)).toBeTruthy();
    expectNoRawKeys(container);
  });

  it('offers the trend as a table, not only a chart', async () => {
    renderPage('security');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Show as table' })
    );
    const trend = await screen.findByRole('table', {
      name: 'Daily security events',
    });
    expect(within(trend).getByText('2026-10-02')).toBeTruthy();
  });

  it('validates the email lookup and sends it only after Apply, never in the URL', async () => {
    renderPage('security');
    await screen.findByText('Codes sent');
    const input = screen.getByLabelText('Email address');
    fireEvent.change(input, { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(paramsOf('platform-security/events').email).toBeUndefined();

    fireEvent.change(input, { target: { value: 'person@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    await waitFor(() =>
      expect(paramsOf('platform-security/events').email).toBe(
        'person@example.com'
      )
    );
    expect(window.location.search).not.toContain('person');
  });

  it('distinguishes the empty event list', async () => {
    mode = 'empty';
    renderPage('security');
    expect(
      await screen.findByText('No security events in this period')
    ).toBeTruthy();
  });

  it('shows an error state when the reads fail', async () => {
    mode = 'error';
    renderPage('security');
    expect(
      (await screen.findAllByRole('button', { name: /try again|retry/i }))
        .length
    ).toBeGreaterThan(0);
  });

  it('renders in Arabic with no raw keys', async () => {
    const { container } = renderPage('security', 'ar');
    expect(
      await screen.findByRole('heading', { name: 'مراقبة رموز التحقق والأمان' })
    ).toBeTruthy();
    expect(await screen.findByText('الرموز المرسلة')).toBeTruthy();
    expectNoRawKeys(container);
  });
});
