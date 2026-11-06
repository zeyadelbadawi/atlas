/**
 * Automatic retries must never duplicate a write (cloud remediation,
 * finding E).
 *
 * Every method used to be replayed up to three times on a network error,
 * a 5xx or a 429. For a write those failures are ambiguous — the server may
 * already have committed it — so a replayed POST could create a second
 * submission, invitation or payment. Removing the `isReplaySafe` check in
 * `http-client.ts` must make the POST cases here fail.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

vi.mock('@services/identity', () => ({
  tokenService: { retrieve: () => null, clear: vi.fn() },
  sessionService: { refresh: vi.fn() },
}));

const { HttpClient, isReplaySafe } = await import('./http-client');

function failure(
  method: string,
  status: number | null,
  data?: unknown,
  headers: Record<string, string> = {}
): AxiosError {
  return {
    isAxiosError: true,
    name: 'AxiosError',
    message: 'failed',
    toJSON: () => ({}),
    config: { url: '/things', method, data, headers: {} },
    response:
      status === null
        ? undefined
        : { status, data: {}, statusText: '', headers, config: {} },
  } as unknown as AxiosError;
}

describe('HttpClient transient retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    requestSpy.mockReset();
    requestSpy.mockResolvedValue({ data: 'ok' });
    new HttpClient('https://example.test/api/v1');
  });

  async function run(error: AxiosError) {
    const outcome = capturedOnRejected!(error).then(
      () => 'retried',
      () => 'rejected'
    );
    await vi.runAllTimersAsync();
    return outcome;
  }

  it.each([
    ['post', 502],
    ['post', 500],
    ['post', null],
    ['patch', 503],
  ])(
    'never replays a %s after an ambiguous failure (%s)',
    async (method, status) => {
      expect(await run(failure(method, status))).toBe('rejected');
      expect(requestSpy).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['get', 502],
    ['get', null],
    ['put', 503],
    ['put', null],
    ['delete', 502],
    ['delete', 504],
  ])(
    'replays an idempotent request once after a gateway failure (%s %s)',
    async (method, status) => {
      expect(await run(failure(method, status))).toBe('retried');
      expect(requestSpy).toHaveBeenCalledTimes(1);
    }
  );

  // B2 (UX audit) — a plain 500 is not retried underneath the caller: the
  // query layer retries reads, a mutation shows its error at once.
  it.each([
    ['get', 500],
    ['put', 500],
    ['delete', 500],
  ])('leaves %s (%s) to the caller', async (method, status) => {
    expect(await run(failure(method, status))).toBe('rejected');
    expect(requestSpy).not.toHaveBeenCalled();
  });

  it('replays a request at most once', async () => {
    const error = failure('put', 503);
    (error.config!.headers as Record<string, unknown>)['X-Retry-Count'] = 1;
    expect(await run(error)).toBe('rejected');
    expect(requestSpy).not.toHaveBeenCalled();
  });

  it('replays a POST refused by the rate limiter once, when it clears within seconds', async () => {
    expect(
      await run(failure('post', 429, undefined, { 'retry-after': '1' }))
    ).toBe('retried');
  });

  it.each([
    ['no Retry-After', {}],
    ['a long Retry-After', { 'retry-after': '900' }],
  ])(
    'surfaces a 429 at once with %s (B1: replays only spent attempts)',
    async (_label, headers) => {
      expect(await run(failure('post', 429, undefined, headers))).toBe(
        'rejected'
      );
      expect(await run(failure('get', 429, undefined, headers))).toBe(
        'rejected'
      );
    }
  );

  it('replays a POST whose body carries an idempotency key the server dedupes on', async () => {
    const body = JSON.stringify({
      idempotencyKey: 'checkout-123',
      planKey: 'pro',
    });
    expect(await run(failure('post', 502, body))).toBe('retried');
  });
});

describe('isReplaySafe', () => {
  it('treats an empty idempotency key as absent', () => {
    expect(
      isReplaySafe({ method: 'post', data: { idempotencyKey: '' } }, {})
    ).toBe(false);
  });
  it('accepts an object body with a key', () => {
    expect(
      isReplaySafe({ method: 'post', data: { idempotencyKey: 'k' } }, {})
    ).toBe(true);
  });
});
