/**
 * Token refresh is single-flight and cross-tab safe.
 *
 * The refresh token is the HttpOnly session cookie and it ROTATES on every
 * refresh, so two concurrent refreshes would present a token the first one
 * just retired. Every refresh initiator funnels through
 * `sessionService.refresh`, so:
 *   - concurrent calls in one tab coalesce into exactly one round-trip;
 *   - tabs take turns through the Web Locks API;
 *   - no refresh token is ever sent from script — except a pre-cookie token
 *     an older build left in localStorage, presented exactly once to convert
 *     that session into the cookie.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const refreshToken = vi.fn();
const getCurrent = vi.fn();
const store = vi.fn();
const takeLegacyRefreshToken = vi.fn();

vi.mock('./authentication.service', () => ({
  authenticationService: { refreshToken: (...a: unknown[]) => refreshToken(...a) },
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

import { sessionService } from './session.service';

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('sessionService.refresh — single-flight, cookie session', () => {
  it('coalesces concurrent refreshes into ONE call that sends no token from script', async () => {
    let resolveRefresh!: (v: unknown) => void;
    refreshToken.mockReturnValue(
      new Promise((res) => {
        resolveRefresh = res;
      })
    );
    getCurrent.mockResolvedValue({ id: 'u1', organizations: [] });

    const p1 = sessionService.refresh();
    const p2 = sessionService.refresh();
    const p3 = sessionService.refresh();

    resolveRefresh({ accessToken: 'A1', expiresIn: 900 });
    await Promise.all([p1, p2, p3]);

    expect(refreshToken).toHaveBeenCalledTimes(1);
    // The session cookie is the credential; the body carries no token.
    expect(refreshToken).toHaveBeenCalledWith({});
    expect(store).toHaveBeenCalledWith(
      expect.not.objectContaining({ refreshToken: expect.anything() })
    );
  });

  it('allows a fresh refresh again after the in-flight one settles', async () => {
    refreshToken.mockResolvedValue({ accessToken: 'A', expiresIn: 900 });
    getCurrent.mockResolvedValue({ id: 'u1', organizations: [] });

    await sessionService.refresh();
    await sessionService.refresh();

    expect(refreshToken).toHaveBeenCalledTimes(2);
  });

  it('converts a pre-cookie localStorage session exactly once', async () => {
    takeLegacyRefreshToken.mockReturnValueOnce('LEGACY-R0');
    refreshToken.mockResolvedValue({ accessToken: 'A', expiresIn: 900 });
    getCurrent.mockResolvedValue({ id: 'u1', organizations: [] });

    await sessionService.refresh();
    await sessionService.refresh();

    expect(refreshToken).toHaveBeenNthCalledWith(1, { refreshToken: 'LEGACY-R0' });
    expect(refreshToken).toHaveBeenNthCalledWith(2, {});
  });

  it('takes the cross-tab lock before refreshing when Web Locks exist', async () => {
    const request = vi.fn((_name: string, work: () => Promise<unknown>) => work());
    vi.stubGlobal('navigator', { ...globalThis.navigator, locks: { request } });
    refreshToken.mockResolvedValue({ accessToken: 'A', expiresIn: 900 });
    getCurrent.mockResolvedValue({ id: 'u1', organizations: [] });

    await sessionService.refresh();

    expect(request).toHaveBeenCalledWith('atlas:session-refresh', expect.any(Function));
    expect(refreshToken).toHaveBeenCalledTimes(1);
  });
});
