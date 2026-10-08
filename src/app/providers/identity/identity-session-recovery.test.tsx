/**
 * Stale-tab recovery — the identity state the whole app reads.
 *
 *  - Coming back to a tab (it becomes visible, or the connection returns)
 *    refreshes an access token that is about to expire, so the next click
 *    works — timers do not run while a laptop sleeps.
 *  - A session that ended (the server refused a refresh, or another tab
 *    signed out) turns this tab unauthenticated and empties its cache,
 *    instead of a signed-in UI in which nothing works.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { useContext } from 'react';

const restore = vi.fn();
const refresh = vi.fn();
const clearToken = vi.fn();
const queryClear = vi.fn();

vi.mock('@services/query', () => ({
  getGlobalQueryClient: () => ({ clear: queryClear }),
}));

vi.mock('@services/identity', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    sessionService: {
      restore: () => restore(),
      refresh: () => refresh(),
      switchOrganization: vi.fn(),
    },
    tokenService: {
      clear: () => clearToken(),
      shouldRefresh: (expiresAt: string) =>
        new Date(expiresAt).getTime() - Date.now() <= 5 * 60 * 1000,
    },
  };
});

import { AtlasIdentityProvider } from './IdentityProvider';
import { IdentityContext } from './identity.context';

const user = { id: 'u1', name: 'Sara', email: 's@x.test', organizations: [] };
// Inside the 5-minute refresh window, but before the 2-minute timer fires:
// only the tab waking up can trigger the refresh.
const soon = () => new Date(Date.now() + 4 * 60_000).toISOString();
const later = () => new Date(Date.now() + 15 * 60_000).toISOString();

function Probe(): JSX.Element {
  const ctx = useContext(IdentityContext)!;
  return <p data-testid="state">{ctx.isAuthenticated ? 'in' : 'out'}</p>;
}

beforeEach(() => {
  restore.mockResolvedValue({
    status: 'authenticated',
    user,
    tokens: { accessToken: 'A0', expiresAt: soon() },
  });
  refresh.mockResolvedValue({
    status: 'authenticated',
    user,
    tokens: { accessToken: 'A1', expiresAt: later() },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function mounted() {
  render(
    <AtlasIdentityProvider>
      <Probe />
    </AtlasIdentityProvider>
  );
  await waitFor(() =>
    expect(screen.getByTestId('state').textContent).toBe('in')
  );
}

describe('identity session recovery', () => {
  it('refreshes a nearly expired token when the tab becomes visible again', async () => {
    await mounted();
    refresh.mockClear();
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.getByTestId('state').textContent).toBe('in');
  });

  it('a refresh the server refuses ends the session everywhere', async () => {
    refresh.mockRejectedValue({ status: 401 });
    const ended = vi.fn();
    window.addEventListener('atlas:session-ended', ended);
    await mounted();
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() =>
      expect(screen.getByTestId('state').textContent).toBe('out')
    );
    expect(ended).toHaveBeenCalled();
    expect(clearToken).toHaveBeenCalled();
    expect(queryClear).toHaveBeenCalled();
    window.removeEventListener('atlas:session-ended', ended);
  });

  it('a refresh that cannot reach the server keeps the session', async () => {
    refresh.mockRejectedValue(new Error('Network Error'));
    await mounted();
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(screen.getByTestId('state').textContent).toBe('in');
    expect(clearToken).not.toHaveBeenCalled();
  });

  it('a sign-out in another tab signs this tab out and empties its cache', async () => {
    await mounted();
    await act(async () => {
      window.dispatchEvent(new CustomEvent('atlas:session-ended'));
    });
    expect(screen.getByTestId('state').textContent).toBe('out');
    expect(queryClear).toHaveBeenCalled();
  });
});
