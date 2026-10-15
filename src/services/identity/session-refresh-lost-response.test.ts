/**
 * U-14d / OD-21 — a refresh whose answer was lost must not sign anyone out.
 *
 * The server may have rotated the session cookie before the connection
 * dropped; it then hands the SAME browser the successor it already minted,
 * but only within a short window (≤ 30 s). So `sessionService.refresh`:
 *   - retries an ambiguous failure (network, timeout, 5xx, 429) promptly,
 *     every attempt starting inside that window;
 *   - never retries a refusal (401/403) when Web Locks exist, and only once
 *     (the stale-tab race) when they do not;
 *   - never re-sends a pre-cookie localStorage token;
 *   - keeps every attempt under ONE cross-tab lock, and two tabs never have a
 *     refresh on the wire at the same moment.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const refreshToken = vi.fn();
const getCurrent = vi.fn();
const store = vi.fn();
const takeLegacyRefreshToken = vi.fn();

vi.mock('./authentication.service', () => ({
  authenticationService: {
    refreshToken: (...a: unknown[]) => refreshToken(...a),
  },
}));
vi.mock('./current-user.service', () => ({
  currentUserService: { getCurrent: () => getCurrent() },
}));
vi.mock('./token.service', () => ({
  tokenService: {
    store: (...a: unknown[]) => store(...a),
    takeLegacyRefreshToken: () => takeLegacyRefreshToken(),
    createMetadata: (accessToken: string, expiresIn: number) => ({
      accessToken,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      requiresRefresh: false,
    }),
  },
}));

import {
  LOST_RESPONSE_RETRY_DELAYS_MS,
  SessionService,
} from './session.service';

/** The shapes `ApiError` gives these failures (only the fields read here). */
const lost = (kind: 'network' | 'timeout' | 'server' | 'rateLimited') =>
  Object.assign(new Error(kind), { kind, retryable: true });
const refused = Object.assign(new Error('unauthorized'), {
  kind: 'unauthorized',
  status: 401,
  retryable: false,
});
const invalid = Object.assign(new Error('validation'), {
  kind: 'validation',
  status: 400,
  retryable: false,
});

/** A Web Locks stand-in that really serialises holders of the same name. */
function serialisingLocks() {
  const tails = new Map<string, Promise<unknown>>();
  const request = vi.fn((name: string, work: () => Promise<unknown>) => {
    const previous = tails.get(name) ?? Promise.resolve();
    const run = previous.then(
      () => work(),
      () => work()
    );
    tails.set(
      name,
      run.catch(() => undefined)
    );
    return run;
  });
  return { request };
}

beforeEach(() => {
  getCurrent.mockResolvedValue({ id: 'u1', organizations: [] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('sessionService.refresh — lost refresh answer (U-14d)', () => {
  it('retries a dropped answer promptly and recovers the session', async () => {
    vi.useFakeTimers();
    refreshToken
      .mockRejectedValueOnce(lost('network'))
      .mockResolvedValueOnce({ accessToken: 'A1', expiresIn: 900 });

    const pending = new SessionService().refresh();
    await vi.advanceTimersByTimeAsync(LOST_RESPONSE_RETRY_DELAYS_MS[0]);
    const session = await pending;

    expect(session.status).toBe('authenticated');
    expect(refreshToken).toHaveBeenCalledTimes(2);
    // Both attempts present only the cookie: no token from script.
    expect(refreshToken).toHaveBeenNthCalledWith(1, {});
    expect(refreshToken).toHaveBeenNthCalledWith(2, {});
    expect(store).toHaveBeenCalledTimes(1);
  });

  it.each(['timeout', 'server', 'rateLimited'] as const)(
    'treats a %s the same way',
    async (kind) => {
      vi.useFakeTimers();
      refreshToken
        .mockRejectedValueOnce(lost(kind))
        .mockResolvedValueOnce({ accessToken: 'A1', expiresIn: 900 });
      const pending = new SessionService().refresh();
      await vi.advanceTimersByTimeAsync(LOST_RESPONSE_RETRY_DELAYS_MS[0]);
      await expect(pending).resolves.toMatchObject({ status: 'authenticated' });
      expect(refreshToken).toHaveBeenCalledTimes(2);
    }
  );

  it('gives up after the bounded retries, with the network error (never a sign-out)', async () => {
    vi.useFakeTimers();
    const last = lost('timeout');
    refreshToken
      .mockRejectedValueOnce(lost('network'))
      .mockRejectedValueOnce(lost('timeout'))
      .mockRejectedValueOnce(last);

    const pending = new SessionService().refresh();
    const outcome = expect(pending).rejects.toBe(last);
    for (const delay of LOST_RESPONSE_RETRY_DELAYS_MS) {
      await vi.advanceTimersByTimeAsync(delay);
    }
    await outcome;
    expect(refreshToken).toHaveBeenCalledTimes(
      1 + LOST_RESPONSE_RETRY_DELAYS_MS.length
    );
    expect(store).not.toHaveBeenCalled();
  });

  it('every retry starts inside the server window (≤ 30 s after the first attempt)', async () => {
    const { REFRESH_TIMEOUT_MS } = await vi.importActual<{
      REFRESH_TIMEOUT_MS: number;
    }>('./authentication.service');
    // Worst case: every attempt runs to its timeout before the next waits.
    const lastAttemptStartsAt =
      LOST_RESPONSE_RETRY_DELAYS_MS.length * REFRESH_TIMEOUT_MS +
      LOST_RESPONSE_RETRY_DELAYS_MS.reduce((sum, d) => sum + d, 0);
    expect(lastAttemptStartsAt).toBeLessThan(25_000);
  });

  it('never retries a refusal when Web Locks exist', async () => {
    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      locks: serialisingLocks(),
    });
    refreshToken.mockRejectedValue(refused);
    await expect(new SessionService().refresh()).rejects.toBe(refused);
    expect(refreshToken).toHaveBeenCalledTimes(1);
  });

  it('never retries a non-transient error', async () => {
    refreshToken.mockRejectedValue(invalid);
    await expect(new SessionService().refresh()).rejects.toBe(invalid);
    expect(refreshToken).toHaveBeenCalledTimes(1);
  });

  it('without Web Locks a refusal is retried once (another tab may have just rotated)', async () => {
    vi.stubGlobal('navigator', { ...globalThis.navigator, locks: undefined });
    vi.useFakeTimers();
    refreshToken
      .mockRejectedValueOnce(refused)
      .mockResolvedValueOnce({ accessToken: 'A1', expiresIn: 900 });
    const pending = new SessionService().refresh();
    await vi.advanceTimersByTimeAsync(400);
    await expect(pending).resolves.toMatchObject({ status: 'authenticated' });
    expect(refreshToken).toHaveBeenCalledTimes(2);

    refreshToken.mockReset();
    refreshToken.mockRejectedValue(refused);
    const twice = new SessionService().refresh();
    const outcome = expect(twice).rejects.toBe(refused);
    await vi.advanceTimersByTimeAsync(400);
    await outcome;
    expect(refreshToken).toHaveBeenCalledTimes(2);
  });

  it('never re-sends a pre-cookie localStorage token', async () => {
    takeLegacyRefreshToken.mockReturnValueOnce('LEGACY-R0');
    refreshToken.mockRejectedValue(lost('network'));
    await expect(new SessionService().refresh()).rejects.toMatchObject({
      kind: 'network',
    });
    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(refreshToken).toHaveBeenCalledWith({ refreshToken: 'LEGACY-R0' });
  });

  it('keeps every retry under ONE cross-tab lock, and concurrent callers share it', async () => {
    const locks = serialisingLocks();
    vi.stubGlobal('navigator', { ...globalThis.navigator, locks });
    vi.useFakeTimers();
    refreshToken
      .mockRejectedValueOnce(lost('network'))
      .mockResolvedValueOnce({ accessToken: 'A1', expiresIn: 900 });

    const service = new SessionService();
    const all = Promise.all([
      service.refresh(),
      service.refresh(),
      service.refresh(),
    ]);
    await vi.advanceTimersByTimeAsync(LOST_RESPONSE_RETRY_DELAYS_MS[0]);
    await all;

    expect(locks.request).toHaveBeenCalledTimes(1);
    expect(refreshToken).toHaveBeenCalledTimes(2);
  });
});

describe('sessionService.refresh — two tabs', () => {
  it('two tabs never have a refresh on the wire at the same time', async () => {
    const locks = serialisingLocks();
    vi.stubGlobal('navigator', { ...globalThis.navigator, locks });
    let inFlight = 0;
    let maxInFlight = 0;
    refreshToken.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return { accessToken: 'A', expiresIn: 900 };
    });

    // Two independent pages (each its own SessionService), same origin lock.
    const tabA = new SessionService();
    const tabB = new SessionService();
    await Promise.all([tabA.refresh(), tabB.refresh(), tabA.refresh()]);

    expect(refreshToken).toHaveBeenCalledTimes(2); // one per tab
    expect(maxInFlight).toBe(1);
    expect(locks.request).toHaveBeenCalledTimes(2);
  });
});
