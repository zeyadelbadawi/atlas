/**
 * A sign-out that cannot reach the server must say so: SessionService
 * records it and revokes the session before the next restore. (It used to
 * be swallowed here, so an offline sign-out left the server session live
 * with nothing scheduled to end it.)
 */
import { describe, expect, it, vi } from 'vitest';

const post = vi.fn();
vi.mock('@api', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  apiClient: { post: (...a: unknown[]) => post(...a) },
}));

import { authenticationService } from './authentication.service';

describe('authenticationService.signOut', () => {
  it('propagates a failure to deliver the sign-out', async () => {
    post.mockRejectedValueOnce(new Error('Network Error'));
    await expect(authenticationService.signOut()).rejects.toThrow(
      'Network Error'
    );
  });

  it('resolves when the server ended the session', async () => {
    post.mockResolvedValueOnce(undefined);
    await expect(authenticationService.signOut()).resolves.toBeUndefined();
    expect(post).toHaveBeenLastCalledWith('/auth/sign-out');
  });
});
