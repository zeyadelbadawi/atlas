/**
 * Token refresh is single-flight (session-inactivity bug fix).
 *
 * Refresh tokens rotate server-side, so presenting the same token twice
 * concurrently makes the second call fail with a denylisted-token 401 —
 * the root cause of "the next request fails after the tab was idle, until a
 * reload". Every refresh initiator funnels through `sessionService.refresh`,
 * so concurrent calls MUST coalesce into exactly one backend round-trip.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const refreshToken = vi.fn();
const getCurrent = vi.fn();
const store = vi.fn();

vi.mock('./authentication.service', () => ({
  authenticationService: { refreshToken: (...a: unknown[]) => refreshToken(...a) },
}));
vi.mock('./current-user.service', () => ({
  currentUserService: { getCurrent: () => getCurrent() },
}));
vi.mock('./token.service', () => ({
  tokenService: {
    store: (...a: unknown[]) => store(...a),
    createMetadata: (accessToken: string, expiresIn: number, rt?: string) => ({
      accessToken,
      refreshToken: rt,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      requiresRefresh: false,
    }),
  },
}));

import { sessionService } from './session.service';

afterEach(() => vi.clearAllMocks());

describe('sessionService.refresh — single-flight', () => {
  it('coalesces concurrent refreshes into ONE backend refresh call', async () => {
    let resolveRefresh!: (v: unknown) => void;
    refreshToken.mockReturnValue(
      new Promise((res) => {
        resolveRefresh = res;
      }),
    );
    getCurrent.mockResolvedValue({ id: 'u1', organizations: [] });

    // Three initiators race with the SAME current refresh token.
    const p1 = sessionService.refresh('R0');
    const p2 = sessionService.refresh('R0');
    const p3 = sessionService.refresh('R0');

    resolveRefresh({ accessToken: 'A1', refreshToken: 'R1', expiresIn: 900 });
    await Promise.all([p1, p2, p3]);

    // Exactly one rotation happened — R0 was presented once, not three times.
    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(refreshToken).toHaveBeenCalledWith({ refreshToken: 'R0' });
  });

  it('allows a fresh refresh again after the in-flight one settles', async () => {
    refreshToken.mockResolvedValue({ accessToken: 'A', refreshToken: 'R', expiresIn: 900 });
    getCurrent.mockResolvedValue({ id: 'u1', organizations: [] });

    await sessionService.refresh('R0');
    await sessionService.refresh('R1');

    // Two sequential (non-overlapping) refreshes each make their own call.
    expect(refreshToken).toHaveBeenCalledTimes(2);
  });
});
