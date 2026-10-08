/**
 * Local-first dashboard — the session across lost connectivity:
 *   - a reload without a connection resumes READ-ONLY as the saved person;
 *   - only a definitive server "no" ends the session (and wipes the copies);
 *   - sign-out while offline signs this tab out at once, and the server-side
 *     session is revoked first thing on the next online start, before
 *     anything could restore it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createApiError } from '@api';

const signOut = vi.fn();
const refreshToken = vi.fn();
const getCurrent = vi.fn();

vi.mock('./authentication.service', () => ({
  authenticationService: {
    signOut: () => signOut(),
    refreshToken: (...a: unknown[]) => refreshToken(...a),
  },
}));
vi.mock('./current-user.service', () => ({
  currentUserService: { getCurrent: () => getCurrent() },
}));

import { sessionService } from './session.service';
import { tokenService } from './token.service';
import {
  MemoryOfflineStore,
  hasPendingSignOut,
  markPendingSignOut,
  saveIdentitySnapshot,
  setOfflineStoreForTesting,
} from '../offline';

const networkError = () => new ApiError(createApiError('network'));
const unauthorized = () =>
  new ApiError(createApiError('unauthorized', { status: 401 }));

let store: MemoryOfflineStore;

beforeEach(() => {
  store = new MemoryOfflineStore();
  setOfflineStoreForTesting(store);
  window.localStorage.clear();
  vi.spyOn(tokenService, 'mayHaveSession').mockReturnValue(true);
  vi.spyOn(tokenService, 'retrieve').mockReturnValue(null);
});

afterEach(() => {
  setOfflineStoreForTesting(null);
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('restore without a connection', () => {
  it('resumes read-only as the saved person when the server cannot be reached', async () => {
    await saveIdentitySnapshot({
      id: 'u1',
      email: 'owner@example.test',
    } as never);
    refreshToken.mockRejectedValue(networkError());

    const session = await sessionService.restore();

    expect(session).toMatchObject({
      status: 'authenticated',
      offline: true,
      user: { id: 'u1' },
    });
    expect(session.tokens).toBeUndefined();
  });

  it('stays signed out offline when nothing was saved', async () => {
    refreshToken.mockRejectedValue(networkError());
    expect(await sessionService.restore()).toEqual({
      status: 'unauthenticated',
    });
  });

  it('a definitive refusal ends the session and wipes saved copies', async () => {
    await saveIdentitySnapshot({ id: 'u1' } as never);
    await store.put('queries', 'u1|x', { a: 1 });
    refreshToken.mockRejectedValue(unauthorized());

    expect(await sessionService.restore()).toEqual({
      status: 'unauthenticated',
    });
    expect(await store.getAll('queries')).toEqual([]);
    expect(await store.getAll('meta')).toEqual([]);
  });
});

describe('sign-out while offline', () => {
  it('signs out locally, wipes the store and remembers to revoke on the server', async () => {
    await store.put('queries', 'u1|x', { a: 1 });
    await store.put('outbox', 'e1', { a: 1 });
    signOut.mockRejectedValue(networkError());

    expect(await sessionService.signOut()).toEqual({
      status: 'unauthenticated',
    });
    expect(hasPendingSignOut()).toBe(true);
    expect(await store.getAll('queries')).toEqual([]);
    expect(await store.getAll('outbox')).toEqual([]);
  });

  it('does not leave a pending revocation when the server already ended the session', async () => {
    signOut.mockRejectedValue(unauthorized());
    await sessionService.signOut();
    expect(hasPendingSignOut()).toBe(false);
  });

  it('the next start revokes FIRST and restores nothing, even with a valid cookie', async () => {
    markPendingSignOut();
    signOut.mockResolvedValue(undefined);
    refreshToken.mockResolvedValue({ accessToken: 'A', expiresIn: 900 });

    expect(await sessionService.restore()).toEqual({
      status: 'unauthenticated',
    });
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(refreshToken).not.toHaveBeenCalled();
    expect(hasPendingSignOut()).toBe(false);
  });

  it('still offline on the next start: stays signed out and keeps the marker', async () => {
    markPendingSignOut();
    await saveIdentitySnapshot({ id: 'u1' } as never);
    signOut.mockRejectedValue(networkError());

    expect(await sessionService.restore()).toEqual({
      status: 'unauthenticated',
    });
    expect(hasPendingSignOut()).toBe(true);
    expect(refreshToken).not.toHaveBeenCalled();
  });
});
