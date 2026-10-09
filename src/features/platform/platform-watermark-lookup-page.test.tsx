/**
 * Platform watermark lookup (docs/FORENSIC_WATERMARK.md) — the Platform
 * Owner's "who leaked this recording?" page.
 *
 * The real page, hook, service and query cache run end to end; only the
 * transport (`apiClient.get`) is replaced, so what is pinned is the exact
 * request the page sends — and, as importantly, the requests it does NOT
 * send:
 *
 *  1. Idle: explains how to read a code; nothing is requested.
 *  2. A misread code (failed check symbol) is explained client-side and
 *     never reaches the API — a lookup is audited and rate-limited.
 *  3. A valid code is normalised, sent once in the path, written to the
 *     URL, and the result renders every section.
 *  4. A deleted account, an anonymous preview and an unreadable snapshot
 *     each say so.
 *  5. Every backend refusal reads as its own friendly message.
 *  6. `?code=` deep links look up on arrival; a malformed one sends nothing;
 *     a related code opens by link.
 *  7. Arabic renders with no raw keys and keeps technical values LTR.
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
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { LocalizationContext } from '@app/providers/localization/localization.context';
import type { LocalizationContextValue } from '@app/providers/localization/localization.context';
import { ApiError, apiClient } from '@api';
import type { ReadOptions } from '@api';
import type { ApiErrorKind, LanguageCode } from '@types';
import { DASHBOARD_ROUTES } from '@app/routes/route-paths';
import { isPersistableQueryKey } from '@services/offline/query-persistence';
import { platformWatermarkKeys } from '@services/query';
import { formatInternational } from '@components/phone';
import type { WatermarkLookupResponse } from './services/PlatformWatermarkService';

const { default: PlatformWatermarkLookupPage } =
  await import('./pages/PlatformWatermarkLookupPage');

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

const CODE = '7K3QMX9TR7';
const DISPLAY = '7K3QM-X9TR7';
/** Another valid code (check symbol `V`). */
const RELATED = '01234-5678V';
const PATH = `platform/watermarks/${CODE}`;

function lookupResponse(
  overrides: Partial<WatermarkLookupResponse> = {}
): WatermarkLookupResponse {
  return {
    code: DISPLAY,
    surface: 'lesson_video',
    issuedAt: '2026-10-01T09:15:00.000Z',
    lastSeenAt: '2026-10-02T18:40:00.000Z',
    tamperEvents: 2,
    lastTamperAt: '2026-10-02T18:30:00.000Z',
    account: {
      userId: 'user-1',
      state: 'active',
      currentName: 'Layla Haddad',
      currentEmail: 'layla.new@example.com',
      deletedAt: null,
    },
    identityAtIssue: {
      name: 'Layla Haddad',
      email: 'layla@example.com',
      phone: '+201001234567',
      phoneCountry: 'EG',
    },
    snapshotStatus: 'ok',
    content: {
      organization: { id: 'org-1', name: 'Falcon Learning' },
      academy: { id: 'academy-1', name: 'Falcon Academy' },
      course: { id: 'course-1', title: 'Organic Chemistry' },
      lesson: { id: 'lesson-1', title: 'Reaction mechanisms' },
      liveSession: null,
    },
    session: {
      id: 'sess-42',
      startedAt: '2026-10-01T09:00:00.000Z',
      signInIp: '198.51.100.7',
      signInCountry: 'EG',
      signInDevice: 'Chrome on Windows',
    },
    device: {
      id: 'device-9',
      label: 'Chrome on Windows',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
      browser: 'Chrome',
      os: 'Windows',
      type: 'desktop',
    },
    network: { ip: '203.0.113.9', country: 'SA' },
    relatedInSession: [
      {
        code: RELATED,
        surface: 'live_session',
        courseTitle: 'Organic Chemistry',
        lessonTitle: null,
        liveSessionTitle: 'Weekly Q&A',
        issuedAt: '2026-10-01T10:00:00.000Z',
        lastSeenAt: '2026-10-01T11:00:00.000Z',
        tamperEvents: 0,
      },
    ],
    ...overrides,
  };
}

function apiError(
  kind: ApiErrorKind,
  status: number,
  messageKey?: string,
  details?: Record<string, string>
): ApiError {
  return new ApiError({
    kind,
    status,
    messageKey: messageKey ?? `errors:${kind}.description`,
    details,
    retryable: kind === 'rateLimited' || kind === 'server',
  });
}

const get = vi.fn<(path: string, options?: ReadOptions) => Promise<unknown>>();

function serve(response: WatermarkLookupResponse | ApiError): void {
  get.mockImplementation(async (path) => {
    if (!path.startsWith('platform/watermarks/')) {
      throw new Error(`unexpected GET ${path}`);
    }
    if (response instanceof ApiError) throw response;
    return response;
  });
}

function lookupCalls(): string[] {
  return get.mock.calls.map(([path]) => path);
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
  return (
    <output data-testid="location">{`${location.pathname}${location.search}`}</output>
  );
}

function renderPage({
  language = 'en',
  search = '',
}: { language?: LanguageCode; search?: string } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={I18N[language]}>
        <LocalizationContext.Provider value={localization(language)}>
          <div dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <MemoryRouter
              initialEntries={[
                `${DASHBOARD_ROUTES.platformWatermarks}${search}`,
              ]}
            >
              <Routes>
                <Route
                  path={DASHBOARD_ROUTES.platformWatermarks}
                  element={<PlatformWatermarkLookupPage />}
                />
              </Routes>
              <LocationProbe />
            </MemoryRouter>
          </div>
        </LocalizationContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
  return { ...view, queryClient };
}

const USER_EVENT_OPTIONS = { delay: null, pointerEventsCheck: 0 } as const;

async function typeAndSubmit(value: string) {
  const user = userEvent.setup(USER_EVENT_OPTIONS);
  const input = screen.getByLabelText('Watermark code', { selector: 'input' });
  await user.clear(input);
  await user.type(input, value);
  await user.click(screen.getByRole('button', { name: 'Look up' }));
  return { user, input };
}

const RAW_KEY =
  /platform:watermarkLookup|watermarkLookup\.|errors:watermark|errors\.watermark/;

beforeAll(() => {
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  serve(lookupResponse());
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

/* ------------------------------------------------------------------ *
 * Tests
 * ------------------------------------------------------------------ */

describe('watermark lookup — idle and client-side validation', () => {
  it('explains how to read a code and requests nothing', () => {
    const { container } = renderPage();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Watermark lookup' })
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Trace a leaked recording to the viewer and session it was issued to.'
      )
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Read the code off the recording' })
    ).toBeTruthy();
    expect(
      screen.getByText('Every lookup is recorded in the audit log.')
    ).toBeTruthy();

    const input = screen.getByLabelText('Watermark code', {
      selector: 'input',
    });
    expect(input.getAttribute('dir')).toBe('ltr');
    expect(input.hasAttribute('data-ltr-content')).toBe(true);
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.getAttribute('spellcheck')).toBe('false');
    expect(input.getAttribute('placeholder')).toBe(DISPLAY);

    expect(get).not.toHaveBeenCalled();
    expect(container.textContent).not.toMatch(RAW_KEY);
  });

  it('echoes the normalised reading while typing (aliases, Arabic digits)', async () => {
    renderPage();
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    const input = screen.getByLabelText('Watermark code', {
      selector: 'input',
    });

    await user.type(input, 'oi234');
    expect(screen.getByTestId('watermark-code-reading').textContent).toBe(
      '01234'
    );
    expect(screen.getByTestId('watermark-code-feedback').textContent).toContain(
      '5 of 10 symbols'
    );

    await user.clear(input);
    await user.type(input, '٠١٢٣٤ ٥٦٧٨v');
    expect(screen.getByTestId('watermark-code-reading').textContent).toBe(
      RELATED
    );
    expect(screen.getByText('Valid code — ready to look up')).toBeTruthy();
    expect(get).not.toHaveBeenCalled();
  });

  it('blocks a misread code client-side: checksum message, no request', async () => {
    renderPage();
    await typeAndSubmit('7K3QM-X9TR2');
    expect(
      screen.getByText(
        'One symbol looks misread — re-check the recording, especially 0/O, 1/I/L, 5/S, 8/B.'
      )
    ).toBeTruthy();
    expect(
      screen
        .getByLabelText('Watermark code', { selector: 'input' })
        .getAttribute('aria-invalid')
    ).toBe('true');
    expect(get).not.toHaveBeenCalled();
    expect(screen.getByTestId('location').textContent).toBe(
      DASHBOARD_ROUTES.platformWatermarks
    );
  });

  it('explains a short code only on submit, and impossible symbols at once', async () => {
    renderPage();
    const { user, input } = await typeAndSubmit('7K3Q');
    expect(
      screen.getByText('A code has 10 symbols — 4 entered so far.')
    ).toBeTruthy();

    await user.clear(input);
    await user.type(input, '7K3QU');
    expect(screen.getByTestId('watermark-code-feedback').textContent).toContain(
      'These characters can’t appear in a code: U.'
    );

    await user.clear(input);
    await user.type(input, '7K3QM-X9TR77');
    expect(screen.getByTestId('watermark-code-feedback').textContent).toContain(
      'Too many symbols'
    );
    expect(get).not.toHaveBeenCalled();
  });
});

describe('watermark lookup — results', () => {
  it('looks up a valid code once, in the path, and renders every section', async () => {
    const { container } = renderPage();
    await typeAndSubmit('7k3qm x9tr7');

    expect(await screen.findByTestId('watermark-result')).toBeTruthy();
    expect(lookupCalls()).toEqual([PATH]);
    expect(screen.getByTestId('location').textContent).toBe(
      `${DASHBOARD_ROUTES.platformWatermarks}?code=${DISPLAY}`
    );

    const summary = screen.getByTestId('watermark-summary');
    expect(
      within(summary).getByTestId('watermark-summary-code').textContent
    ).toBe(DISPLAY);
    expect(
      within(summary).getByTestId('watermark-summary-code').getAttribute('dir')
    ).toBe('ltr');
    expect(within(summary).getAllByText('Lesson video').length).toBeGreaterThan(
      0
    );
    expect(within(summary).getByText('Active')).toBeTruthy();
    expect(within(summary).getByText('Tamper events: 2')).toBeTruthy();
    expect(
      within(summary)
        .getByRole('link', { name: 'Open account' })
        .getAttribute('href')
    ).toBe('/dashboard/platform/users/user-1');

    for (const heading of [
      'Viewer at issue time',
      'What was watched',
      'Session',
      'Device & network',
      'Watermark activity',
      'Other codes in this session',
    ]) {
      expect(
        screen.getByRole('heading', { name: heading }),
        heading
      ).toBeTruthy();
    }

    // Viewer at issue time + current account.
    expect(screen.getByTestId('watermark-identity-email').textContent).toBe(
      'layla@example.com'
    );
    expect(screen.getByTestId('watermark-phone').textContent).toBe(
      formatInternational('+201001234567')
    );
    expect(screen.getByTestId('watermark-phone').textContent).toMatch(/^\+20 /);
    expect(screen.getByText('layla.new@example.com')).toBeTruthy();
    // What was watched.
    expect(screen.getByText('Falcon Academy')).toBeTruthy();
    expect(screen.getByText('Reaction mechanisms')).toBeTruthy();
    // Session + network, LTR.
    const sessionId = screen.getByTestId('watermark-session-id');
    expect(sessionId.textContent).toBe('sess-42');
    expect(sessionId.getAttribute('dir')).toBe('ltr');
    expect(sessionId.hasAttribute('data-ltr-content')).toBe(true);
    expect(screen.getByText('198.51.100.7')).toBeTruthy();
    expect(screen.getByTestId('watermark-network-ip').textContent).toBe(
      '203.0.113.9'
    );
    expect(screen.getAllByText('Egypt').length).toBeGreaterThan(0);
    expect(screen.getByText('Saudi Arabia')).toBeTruthy();
    // Tamper warning.
    expect(
      screen.getByTestId('watermark-tamper-warning').textContent
    ).toContain('the watermark being hidden or removed');
    // Related code links to its own lookup.
    expect(
      screen
        .getAllByRole('link', { name: `Look up ${RELATED}` })[0]
        .getAttribute('href')
    ).toBe(`${DASHBOARD_ROUTES.platformWatermarks}?code=${RELATED}`);
    expect(screen.getAllByText('Weekly Q&A').length).toBeGreaterThan(0);

    // Copy buttons for the technical values.
    for (const label of [
      'Copy code',
      'Copy email address',
      'Copy phone number',
      'Copy session ID',
      'Copy IP address',
    ]) {
      expect(
        screen.getAllByRole('button', { name: label }).length,
        label
      ).toBeGreaterThan(0);
    }

    expect(container.textContent).not.toMatch(RAW_KEY);
  });

  it('copies the code to the clipboard', async () => {
    renderPage({ search: `?code=${DISPLAY}` });
    await screen.findByTestId('watermark-result');
    // user-event installs its own clipboard stub on `navigator`.
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    await user.click(screen.getByRole('button', { name: 'Copy code' }));
    expect(await navigator.clipboard.readText()).toBe(DISPLAY);
  });

  it('reveals the user agent on demand', async () => {
    renderPage({ search: `?code=${DISPLAY}` });
    await screen.findByTestId('watermark-result');
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    await user.click(screen.getByRole('button', { name: 'Show user agent' }));
    const agent = await screen.findByLabelText('User agent');
    expect(agent.textContent).toContain('Mozilla/5.0');
    expect(agent.getAttribute('dir')).toBe('ltr');
  });

  it('says when the account was deleted and shows the identity at issue', async () => {
    serve(
      lookupResponse({
        account: {
          userId: 'user-1',
          state: 'deleted',
          currentName: null,
          currentEmail: null,
          deletedAt: '2026-10-05T12:00:00.000Z',
        },
      })
    );
    renderPage({ search: `?code=${DISPLAY}` });
    const notice = await screen.findByTestId('watermark-deleted-notice');
    expect(notice.textContent).toContain(
      'Account deleted — identity shown is from the time the code was issued.'
    );
    expect(screen.getAllByText('Deleted').length).toBeGreaterThan(0);
    expect(screen.getByText('Deleted on')).toBeTruthy();
    expect(screen.getByTestId('watermark-identity-email').textContent).toBe(
      'layla@example.com'
    );
    expect(screen.queryByText('layla.new@example.com')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Open account' })).toBeNull();
  });

  it('explains an anonymous preview', async () => {
    serve(
      lookupResponse({
        surface: 'course_preview',
        account: {
          userId: null,
          state: 'anonymous',
          currentName: null,
          currentEmail: null,
          deletedAt: null,
        },
        identityAtIssue: null,
        snapshotStatus: 'absent',
        session: {
          id: null,
          startedAt: null,
          signInIp: null,
          signInCountry: null,
          signInDevice: null,
        },
        tamperEvents: 0,
        lastTamperAt: null,
        relatedInSession: [],
      })
    );
    renderPage({ search: `?code=${DISPLAY}` });
    const notice = await screen.findByTestId('watermark-anonymous-notice');
    expect(notice.textContent).toContain('wasn’t signed in');
    const summary = screen.getByTestId('watermark-summary');
    expect(
      within(summary).getAllByText('Anonymous preview').length
    ).toBeGreaterThan(0);
    expect(within(summary).getByText('Course preview')).toBeTruthy();
    expect(
      screen.getByText(
        'Anonymous preview — the visitor wasn’t signed in, so no identity was recorded.'
      )
    ).toBeTruthy();
    expect(
      screen.getByText('No signed-in session — this was an anonymous preview.')
    ).toBeTruthy();
    expect(screen.getByText('No tampering detected.')).toBeTruthy();
    expect(screen.getByText('No other codes')).toBeTruthy();
    expect(screen.queryByTestId('watermark-tamper-warning')).toBeNull();
  });

  it('warns when the identity snapshot cannot be read', async () => {
    serve(
      lookupResponse({ identityAtIssue: null, snapshotStatus: 'unreadable' })
    );
    renderPage({ search: `?code=${DISPLAY}` });
    expect(
      (await screen.findByTestId('watermark-unreadable-notice')).textContent
    ).toContain('couldn’t be decrypted');
    expect(screen.queryByTestId('watermark-identity-email')).toBeNull();
  });
});

describe('watermark lookup — refusals', () => {
  it.each([
    [
      'not found',
      apiError('notFound', 404, 'errors.watermark.notFound'),
      'No record for this code',
      'No watermark was issued with this code.',
      false,
    ],
    [
      'checksum (server)',
      apiError('validation', 400, 'errors.watermark.checksumMismatch', {
        problem: 'checksum',
      }),
      'This code looks misread',
      'One symbol of this code looks misread.',
      false,
    ],
    [
      'invalid (server)',
      apiError('validation', 400, 'errors.watermark.invalidCode', {
        problem: 'length',
      }),
      'That isn’t a valid code',
      'That isn’t a valid watermark code.',
      false,
    ],
    [
      'rate limited',
      apiError('rateLimited', 429, 'errors.watermark.lookupRateLimited'),
      'Too many lookups',
      'Wait a few minutes, then try again.',
      true,
    ],
    [
      'per-IP throttle (no specific key)',
      apiError('rateLimited', 429),
      'Too many lookups',
      'Wait a few minutes, then try again.',
      true,
    ],
    [
      'unavailable',
      apiError('server', 503, 'errors.watermark.lookupUnavailable'),
      'Lookup unavailable',
      'temporarily unavailable',
      true,
    ],
    [
      'forbidden',
      apiError('forbidden', 403),
      'Platform Owners only',
      'Only a Platform Owner can look up watermark codes.',
      false,
    ],
  ])('%s', async (_name, error, title, description, retryable) => {
    serve(error);
    const { container } = renderPage({ search: `?code=${DISPLAY}` });
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(title)).toBeTruthy();
    expect(alert.textContent).toContain(description);
    expect(
      Boolean(within(alert).queryByRole('button', { name: 'Try again' }))
    ).toBe(retryable);
    expect(container.textContent).not.toMatch(RAW_KEY);
    // No automatic retries: every request is audited and rate-limited.
    expect(lookupCalls()).toEqual([PATH]);
  });

  it('retries only when asked to', async () => {
    serve(apiError('rateLimited', 429, 'errors.watermark.lookupRateLimited'));
    renderPage({ search: `?code=${DISPLAY}` });
    const alert = await screen.findByRole('alert');
    serve(lookupResponse());
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByTestId('watermark-result')).toBeTruthy();
    expect(lookupCalls()).toEqual([PATH, PATH]);
  });
});

describe('watermark lookup — deep links', () => {
  it('looks up a ?code= deep link on arrival and fills the field', async () => {
    renderPage({ search: `?code=${encodeURIComponent('7k3qm x9tr7')}` });
    expect(await screen.findByTestId('watermark-result')).toBeTruthy();
    expect(lookupCalls()).toEqual([PATH]);
    expect(
      (
        screen.getByLabelText('Watermark code', {
          selector: 'input',
        }) as HTMLInputElement
      ).value
    ).toBe('7k3qm x9tr7');
  });

  it('shows a loading skeleton while the lookup runs', async () => {
    let resolve: (value: WatermarkLookupResponse) => void = () => undefined;
    get.mockImplementation(
      () => new Promise((done) => (resolve = done as typeof resolve))
    );
    renderPage({ search: `?code=${DISPLAY}` });
    expect(await screen.findByTestId('watermark-loading')).toBeTruthy();
    expect(screen.getByTestId('watermark-lookup-status').textContent).toBe(
      `Looking up ${DISPLAY}…`
    );
    resolve(lookupResponse());
    expect(await screen.findByTestId('watermark-result')).toBeTruthy();
  });

  it('sends nothing for a malformed ?code= and explains why', async () => {
    renderPage({ search: '?code=7K3QM-X9TR2' });
    expect(
      screen.getByText(
        'One symbol looks misread — re-check the recording, especially 0/O, 1/I/L, 5/S, 8/B.'
      )
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Read the code off the recording' })
    ).toBeTruthy();
    await new Promise((settle) => setTimeout(settle, 20));
    expect(get).not.toHaveBeenCalled();
  });

  it('opens a related code by link', async () => {
    renderPage({ search: `?code=${DISPLAY}` });
    await screen.findByTestId('watermark-result');
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    await user.click(
      screen.getAllByRole('link', { name: `Look up ${RELATED}` })[0]
    );
    await waitFor(() =>
      expect(lookupCalls()).toEqual([PATH, 'platform/watermarks/012345678V'])
    );
    expect(screen.getByTestId('location').textContent).toBe(
      `${DASHBOARD_ROUTES.platformWatermarks}?code=${RELATED}`
    );
    expect(
      (
        screen.getByLabelText('Watermark code', {
          selector: 'input',
        }) as HTMLInputElement
      ).value
    ).toBe(RELATED);
  });

  it('clearing the field returns to the idle state and drops ?code=', async () => {
    renderPage({ search: `?code=${DISPLAY}` });
    await screen.findByTestId('watermark-result');
    const user = userEvent.setup(USER_EVENT_OPTIONS);
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByTestId('location').textContent).toBe(
      DASHBOARD_ROUTES.platformWatermarks
    );
    expect(
      screen.getByRole('heading', { name: 'Read the code off the recording' })
    ).toBeTruthy();
    expect(screen.queryByTestId('watermark-result')).toBeNull();
  });
});

describe('watermark lookup — Arabic and privacy', () => {
  it('renders in Arabic with no raw keys, technical values LTR', async () => {
    const { container } = renderPage({
      language: 'ar',
      search: `?code=${DISPLAY}`,
    });
    await screen.findByTestId('watermark-result');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'تتبّع العلامة المائية'
    );
    expect(container.textContent).toMatch(/[؀-ۿ]/);
    expect(container.textContent).not.toMatch(RAW_KEY);
    expect(screen.getAllByText('مصر', { exact: false }).length).toBeGreaterThan(
      0
    );
    for (const testId of [
      'watermark-summary-code',
      'watermark-identity-email',
      'watermark-session-id',
      'watermark-network-ip',
      'watermark-phone',
    ]) {
      const element = screen.getByTestId(testId);
      expect(element.getAttribute('dir'), testId).toBe('ltr');
      expect(element.hasAttribute('data-ltr-content'), testId).toBe(true);
    }
  });

  it('never keeps the result: not persisted offline, gone from the cache on unmount', async () => {
    expect(isPersistableQueryKey(platformWatermarkKeys.lookup(CODE))).toBe(
      false
    );
    const { queryClient, unmount } = renderPage({ search: `?code=${DISPLAY}` });
    await screen.findByTestId('watermark-result');
    const query = queryClient
      .getQueryCache()
      .find({ queryKey: platformWatermarkKeys.lookup(CODE) });
    expect(query?.meta?.persistOffline).toBe(false);
    unmount();
    await waitFor(() =>
      expect(
        queryClient
          .getQueryCache()
          .find({ queryKey: platformWatermarkKeys.lookup(CODE) })
      ).toBeUndefined()
    );
  });
});
