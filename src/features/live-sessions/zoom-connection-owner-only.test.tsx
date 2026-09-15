/**
 * The Zoom connection screen shows connection controls to an owner and
 * an explanation to everybody else.
 *
 * THIS IS NOT THE SECURITY BOUNDARY, and the tests are written knowing
 * that. `live-provider-oauth.controller.spec.ts` proves the backend
 * refuses a Manager, an Instructor and Staff calling the endpoint
 * directly with no frontend involved at all. What this file pins is
 * whether the screen is HONEST: a Manager must not be shown a Connect
 * button that will 403, and an owner must not be denied one that works.
 *
 * The two failure modes are opposite and both bad: offering an action
 * that cannot succeed, and hiding one that can.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import type { LiveProviderConnectionState } from '@types';

/** The owner-exclusive permission the backend gates the flow on. */
const OWNER = 'tenant.addon.view';

const hasPermission = vi.fn<(permission: string) => boolean>();
const useLiveSessionsStatus = vi.fn();
const startAuthorization = vi.fn();
const completeAuthorization = vi.fn();

vi.mock('@hooks', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    usePermissions: () => ({ hasPermission }),
    usePlatform: () => ({ activeAcademyId: 'academy-1' }),
  };
});

vi.mock('./hooks/useLiveSessions', () => ({
  useLiveSessionsStatus: () => useLiveSessionsStatus() as unknown,
  useZoomConnectionActions: () => ({
    connect: { mutateAsync: startAuthorization, isPending: false, error: null },
    completeAuthorization: { mutate: completeAuthorization, isPending: false },
    check: { mutate: vi.fn(), isPending: false },
    disconnect: { mutate: vi.fn(), isPending: false },
  }),
}));

import LiveSessionsConnectionPage from './pages/LiveSessionsConnectionPage';

const provider = (
  over: Partial<LiveProviderConnectionState> = {},
): LiveProviderConnectionState => ({
  status: 'not_connected',
  providerKey: 'zoom',
  ...over,
});

/**
 * A router is not decoration here: this screen is Zoom's redirect target,
 * so it reads `code`/`state` off its own query string. `entry` is what
 * Zoom would have sent the customer back to.
 */
function renderPage(language = 'en', entry = '/dashboard/add-ons/live-sessions/connection') {
  const i18n = createI18nInstance(language as 'en' | 'ar');
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[entry]}>
        <LiveSessionsConnectionPage />
      </MemoryRouter>
    </I18nextProvider>,
  );
}

const CONNECTION_PATH = '/dashboard/add-ons/live-sessions/connection';

function withStatus(state: LiveProviderConnectionState) {
  useLiveSessionsStatus.mockReturnValue({
    data: { provider: state, addOn: { usable: true, entitled: true }, recordingQuota: {} },
    isLoading: false,
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LiveSessionsConnectionPage — owner-only connection', () => {
  it('offers Connect Zoom to an Organization Owner', () => {
    hasPermission.mockImplementation((p) => p === OWNER);
    withStatus(provider());

    renderPage();
    expect(screen.getByRole('button', { name: /connect zoom/i })).toBeTruthy();
  });

  /*
   * A Manager holds `academy.configure` — which is what USED to gate
   * this. They must now see an explanation instead of a dead button.
   */
  it('shows a Manager an explanation instead of connection controls', () => {
    hasPermission.mockImplementation((p) => p === 'academy.configure');
    withStatus(provider());

    renderPage();
    expect(screen.queryByRole('button', { name: /connect zoom/i })).toBeNull();
    expect(screen.getByText(/only your organization owner/i)).toBeTruthy();
  });

  it.each([
    ['an Instructor', 'instructor.dashboard.view'],
    ['Staff', 'academy.view'],
  ])('hides connection controls from %s', (_label, permission) => {
    hasPermission.mockImplementation((p) => p === permission);
    withStatus(provider({ status: 'connected', externalAccountId: 'acc-123' }));

    renderPage();
    expect(screen.queryByRole('button', { name: /connect zoom|reconnect zoom/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /disconnect/i })).toBeNull();
  });

  /*
   * NO CREDENTIAL FORM AT ALL. The whole point of the migration: the
   * customer is never asked to become a Zoom developer.
   */
  it('never asks the customer for a client secret or any credential', () => {
    hasPermission.mockImplementation((p) => p === OWNER);
    withStatus(provider());

    const { container } = renderPage();
    expect(container.querySelectorAll('input[type="password"]').length).toBe(0);
    expect(container.textContent).not.toMatch(/client secret|account id|sdk secret/i);
  });

  it('shows the connected Zoom account, and no token material', () => {
    hasPermission.mockImplementation((p) => p === OWNER);
    withStatus(
      provider({
        status: 'connected',
        externalAccountId: 'zoom-account-abc',
        connectedAt: '2026-09-01T10:00:00Z',
      }),
    );

    const { container } = renderPage();
    expect(screen.getByText('zoom-account-abc')).toBeTruthy();
    expect(container.textContent).not.toMatch(/access_token|refresh|eyJ/i);
  });

  it('offers Reconnect rather than Connect once a connection exists', () => {
    hasPermission.mockImplementation((p) => p === OWNER);
    withStatus(provider({ status: 'connected', externalAccountId: 'acc' }));

    renderPage();
    expect(screen.getByRole('button', { name: /reconnect zoom/i })).toBeTruthy();
  });

  /* A dead authorization must read as recoverable, not as data loss. */
  it('explains the reconnect-required state to an owner', () => {
    hasPermission.mockImplementation((p) => p === OWNER);
    withStatus(provider({ status: 'reconnect_required' }));

    renderPage();
    expect(screen.getByText(/needs to be reconnected/i)).toBeTruthy();
    expect(screen.getByText(/existing sessions and recordings are safe/i)).toBeTruthy();
  });

  /* A Manager is told WHO can fix it, not offered the fix. */
  it('points a non-owner at the owner when reconnection is required', () => {
    hasPermission.mockImplementation((p) => p === 'academy.configure');
    withStatus(provider({ status: 'reconnect_required' }));

    renderPage();
    expect(screen.getByText(/ask your organization owner to reconnect/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /reconnect zoom/i })).toBeNull();
  });

  /*
   * ARABIC RENDERS ARABIC. A missing key would surface as the raw
   * `liveSessions:connection…` string, which is what this catches.
   */
  it('renders in Arabic with no missing translation keys', () => {
    hasPermission.mockImplementation((p) => p === OWNER);
    withStatus(provider({ status: 'reconnect_required' }));

    const { container } = renderPage('ar');
    expect(container.textContent).not.toMatch(/liveSessions:/);
    expect(container.textContent).toMatch(/[؀-ۿ]/);
  });
});

/**
 * Coming back from Zoom.
 *
 * Zoom's registered redirect URI points at THIS PAGE rather than at the
 * API, because a top-level navigation from zoom.us carries no
 * `Authorization` header and Atlas authenticates with a bearer token this
 * app holds — an API endpoint receiving that redirect would answer 401 the
 * moment the customer pressed Allow. So the page picks the result off its
 * own query string and forwards it on an authenticated request.
 */
describe('LiveSessionsConnectionPage — returning from Zoom', () => {
  it('forwards the code and state Zoom returned', async () => {
    hasPermission.mockImplementation((p) => p === OWNER);
    withStatus(provider());

    renderPage('en', `${CONNECTION_PATH}?code=auth-code&state=state-value`);

    await waitFor(() =>
      expect(completeAuthorization).toHaveBeenCalledWith({
        code: 'auth-code',
        state: 'state-value',
      }),
    );
  });

  /*
   * EXACTLY ONCE. The state is single-use server-side, so a second send
   * is refused — and StrictMode runs effects twice in development, which
   * would turn a good connection into a spurious error.
   */
  it('sends the authorization exactly once', async () => {
    hasPermission.mockImplementation((p) => p === OWNER);
    withStatus(provider());

    const { rerender } = renderPage(
      'en',
      `${CONNECTION_PATH}?code=auth-code&state=state-value`,
    );
    await waitFor(() => expect(completeAuthorization).toHaveBeenCalledTimes(1));

    rerender(<div />);
    expect(completeAuthorization).toHaveBeenCalledTimes(1);
  });

  /*
   * THE CODE MUST NOT SURVIVE IN THE URL. Left there it sits in history,
   * in a bookmark, and in anything that logs a referrer.
   */
  it('strips the authorization code from the URL', async () => {
    hasPermission.mockImplementation((p) => p === OWNER);
    withStatus(provider());

    const { container } = renderPage(
      'en',
      `${CONNECTION_PATH}?code=auth-code&state=state-value`,
    );

    await waitFor(() => expect(completeAuthorization).toHaveBeenCalled());
    expect(container.textContent).not.toMatch(/auth-code|state-value/);
  });

  /* Declined at the consent screen: an outcome, with nothing sent. */
  it('reports a declined authorization without calling the server', async () => {
    hasPermission.mockImplementation((p) => p === OWNER);
    withStatus(provider());

    renderPage('en', `${CONNECTION_PATH}?error=access_denied`);

    expect(await screen.findByText(/wasn’t connected/i)).toBeTruthy();
    expect(completeAuthorization).not.toHaveBeenCalled();
  });

  /* A half-callback is not worth a round trip either. */
  it.each([
    ['only a code', `${CONNECTION_PATH}?code=auth-code`],
    ['only a state', `${CONNECTION_PATH}?state=state-value`],
  ])('does not send a callback with %s', async (_label, entry) => {
    hasPermission.mockImplementation((p) => p === OWNER);
    withStatus(provider());

    renderPage('en', entry);

    expect(await screen.findByText(/wasn’t connected/i)).toBeTruthy();
    expect(completeAuthorization).not.toHaveBeenCalled();
  });

  /* An ordinary visit is not a callback. */
  it('does nothing on a normal visit to the page', async () => {
    hasPermission.mockImplementation((p) => p === OWNER);
    withStatus(provider());

    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /connect zoom/i })).toBeTruthy(),
    );
    expect(completeAuthorization).not.toHaveBeenCalled();
    expect(screen.queryByText(/wasn’t connected/i)).toBeNull();
  });

  it('renders the return states in Arabic with no missing keys', async () => {
    hasPermission.mockImplementation((p) => p === OWNER);
    withStatus(provider());

    const { container } = renderPage('ar', `${CONNECTION_PATH}?error=access_denied`);

    await waitFor(() => expect(container.textContent).toMatch(/[؀-ۿ]/));
    expect(container.textContent).not.toMatch(/liveSessions:/);
  });
});
