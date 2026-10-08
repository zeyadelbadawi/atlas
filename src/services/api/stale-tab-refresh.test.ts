/**
 * Stale-tab recovery — the 401 → refresh → retry path.
 *
 *  - A tab back from a long sleep: the access token expired, the session is
 *    still valid → ONE refresh, and every request that hit the 401 at the
 *    same moment is retried with the new token (no competing refreshes —
 *    the session cookie rotates, so a second refresh would be a replay).
 *  - The refresh cannot reach the server (the laptop woke before its
 *    Wi-Fi): the session is NOT thrown away; the caller gets the network
 *    error, which it can retry.
 *  - The server refuses the refresh (revoked, expired): the token is
 *    cleared and the whole app is told the session ended.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosError } from 'axios';

type RejectionHandler = (error: AxiosError) => Promise<unknown>;

let capturedOnRejected: RejectionHandler | undefined;
const requestSpy = vi.fn();

vi.mock('axios', () => {
  const instance = {
    interceptors: {
      request: { use: vi.fn() },
      response: {
        use: (_ok: unknown, onRejected: RejectionHandler) => {
          capturedOnRejected = onRejected;
        },
      },
    },
    request: (...args: unknown[]) => requestSpy(...args),
  };
  return {
    default: { create: () => instance, isAxiosError: () => true },
    isAxiosError: () => true,
  };
});

const clear = vi.fn();
const refresh = vi.fn();

vi.mock('@services/identity', () => ({
  tokenService: {
    retrieve: () => ({ accessToken: 'A0' }),
    mayHaveSession: () => true,
    clear: () => clear(),
  },
  sessionService: { refresh: () => refresh() },
}));

const { HttpClient } = await import('./http-client');

function unauthorized(url: string): AxiosError {
  return {
    isAxiosError: true,
    name: 'AxiosError',
    message: 'Request failed with status code 401',
    toJSON: () => ({}),
    config: { url, headers: {} },
    response: {
      status: 401,
      data: {},
      statusText: 'Unauthorized',
      headers: {},
      config: {},
    },
  } as unknown as AxiosError;
}

const networkError = Object.assign(new Error('Network Error'), {
  isAxiosError: true,
  code: 'ERR_NETWORK',
});

let ended = 0;
const onEnded = () => {
  ended += 1;
};

beforeEach(() => {
  ended = 0;
  window.addEventListener('atlas:session-ended', onEnded);
  new HttpClient('https://example.test/api/v1');
});

afterEach(() => {
  window.removeEventListener('atlas:session-ended', onEnded);
  vi.clearAllMocks();
});

describe('stale tab: expired access token, valid session', () => {
  it('refreshes ONCE for ten simultaneous 401s and retries every one of them', async () => {
    let finish!: () => void;
    refresh.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    requestSpy.mockImplementation(async (config: { url: string }) => ({
      ok: config.url,
    }));

    const pending = Array.from({ length: 10 }, (_, i) =>
      capturedOnRejected!(unauthorized(`/courses/${i}`))
    );
    await Promise.resolve();
    finish();
    const results = await Promise.all(pending);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(requestSpy).toHaveBeenCalledTimes(10);
    expect(results).toHaveLength(10);
    // Each retry is marked, so a second 401 is final — never a loop.
    for (const [config] of requestSpy.mock.calls) {
      expect(config.headers['X-Retry-After-Refresh']).toBe('true');
    }
    expect(clear).not.toHaveBeenCalled();
    expect(ended).toBe(0);
  });
});

describe('stale tab: the refresh cannot reach the server', () => {
  it('keeps the session and reports the network failure instead of a 401', async () => {
    refresh.mockRejectedValue(networkError);
    await expect(capturedOnRejected!(unauthorized('/dashboard'))).rejects.toBe(
      networkError
    );
    expect(clear).not.toHaveBeenCalled();
    expect(ended).toBe(0);
    expect(requestSpy).not.toHaveBeenCalled();
  });
});

describe('the server refuses the refresh (revoked or expired session)', () => {
  it('clears the token and announces that the session ended', async () => {
    refresh.mockRejectedValue(unauthorized('/auth/refresh'));
    const original = unauthorized('/dashboard');
    await expect(capturedOnRejected!(original)).rejects.toBe(original);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(ended).toBe(1);
  });
});
