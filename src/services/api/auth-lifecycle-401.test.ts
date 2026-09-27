/**
 * A revoked session must not deadlock the client.
 *
 * THE BUG THIS PINS. `performRefresh` sends `POST /auth/refresh` through
 * the same axios instance, so its own response came back through the same
 * interceptor. With the refresh token already revoked — the state account
 * deletion leaves every session in — that request answered 401 too,
 * re-entered the retry branch, found `refreshPromise` already set, and
 * awaited it. That promise could only settle once this very request
 * settled, so neither ever did: the app froze the instant a user deleted
 * their account, and stayed frozen after a reload, because `restore()`
 * deadlocked the same way through `/auth/validate`.
 *
 * The first test reproduces that topology exactly — the mocked
 * `sessionService.refresh` re-enters the real interceptor with a 401, as
 * the real one does over the wire — and fails by timeout if the
 * re-entrancy is ever reintroduced. Removing the guard from
 * `http-client.ts` must make it fail.
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

const retrieve = vi.fn();
const clear = vi.fn();

/**
 * The real `performRefresh` dynamically imports this module and calls
 * `sessionService.refresh`, which puts `POST /auth/refresh` on the wire.
 * Against a revoked token that answers 401 and re-enters the interceptor,
 * so the mock does precisely that rather than resolving out of band —
 * otherwise the deadlock cannot occur and the test proves nothing.
 */
vi.mock('@services/identity', () => ({
  tokenService: {
    retrieve: () => retrieve(),
    clear: () => clear(),
  },
  sessionService: {
    refresh: () => capturedOnRejected!(unauthorized('/auth/refresh')),
  },
}));

const { HttpClient } = await import('./http-client');

/** A 401 shaped the way axios delivers one, for `url`. */
function unauthorized(url: string): AxiosError {
  return {
    isAxiosError: true,
    name: 'AxiosError',
    message: 'Request failed with status code 401',
    toJSON: () => ({}),
    config: { url, headers: {} },
    response: { status: 401, data: {}, statusText: 'Unauthorized', headers: {}, config: {} },
  } as unknown as AxiosError;
}

/** Resolves 'settled' if `promise` settles in time, throws if it hangs. */
async function mustSettle(promise: Promise<unknown>, ms = 300): Promise<'settled'> {
  const hung = Symbol('hung');
  const outcome = await Promise.race([
    promise.then(
      () => 'settled' as const,
      () => 'settled' as const,
    ),
    new Promise<typeof hung>((resolve) => setTimeout(() => resolve(hung), ms)),
  ]);
  if (outcome === hung) {
    throw new Error('interceptor never settled — the refresh deadlock is back');
  }
  return outcome;
}

beforeEach(() => {
  capturedOnRejected = undefined;
  // A refresh token is present: the precondition for the retry branch.
  retrieve.mockReturnValue({ accessToken: 'A0', refreshToken: 'R0' });
  new HttpClient('https://example.test/api/v1');
});

afterEach(() => vi.clearAllMocks());

describe('401 handling against an already-revoked session', () => {
  it('settles when an ordinary 401 triggers a refresh that is itself 401 (the deadlock)', async () => {
    expect(capturedOnRejected).toBeDefined();
    await expect(mustSettle(capturedOnRejected!(unauthorized('/courses')))).resolves.toBe(
      'settled',
    );
    // The original request is never retried, because the refresh failed.
    expect(requestSpy).not.toHaveBeenCalled();
    // A failed refresh must purge the dead tokens, or a reload retries it.
    expect(clear).toHaveBeenCalled();
  });

  it.each([
    '/auth/refresh',
    '/auth/sign-out',
    '/auth/sign-in',
    '/auth/validate',
    '/auth/academy-join',
  ])(
    'answers a 401 on %s directly, attempting no refresh',
    async (url) => {
      expect(capturedOnRejected).toBeDefined();
      await expect(mustSettle(capturedOnRejected!(unauthorized(url)))).resolves.toBe(
        'settled',
      );
      expect(requestSpy).not.toHaveBeenCalled();
    },
  );
});
