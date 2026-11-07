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

const { HttpClient, isReplaySafe, isTransportRetryable } =
  await import('./http-client');

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

  // Owner decision (faster error on failed reads) — one retry layer: a
  // read is retried once here after ANY server error, the query layer not
  // at all, so a GET that fails with a 500 shows its error in ~1–2 s.
  it.each([
    ['get', 500],
    ['get', 501],
    ['head', 500],
    ['options', 503],
  ])(
    'replays a read once after a server error (%s %s)',
    async (method, status) => {
      expect(await run(failure(method, status))).toBe('retried');
      expect(requestSpy).toHaveBeenCalledTimes(1);
    }
  );

  it('waits about a second before that one retry', async () => {
    const outcome = capturedOnRejected!(failure('get', 500));
    await vi.advanceTimersByTimeAsync(999);
    expect(requestSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(requestSpy).toHaveBeenCalledTimes(1);
    await outcome;
  });

  it('a read that fails twice surfaces its error in under 3 s', async () => {
    requestSpy.mockImplementation(() => {
      const retried = failure('get', 500);
      (retried.config!.headers as Record<string, unknown>)['X-Retry-Count'] = 1;
      return capturedOnRejected!(retried);
    });
    const started = Date.now();
    const outcome = capturedOnRejected!(failure('get', 500)).then(
      () => 'retried',
      () => 'rejected'
    );
    await vi.runAllTimersAsync();
    expect(await outcome).toBe('rejected');
    expect(requestSpy).toHaveBeenCalledTimes(1);
    expect(Date.now() - started).toBeLessThan(3_000);
  });

  // A plain 500 on a write is not replayed: it will not fix itself in a
  // second, and the person sees the failed save at once.
  it.each([
    ['put', 500],
    ['delete', 500],
  ])('leaves %s (%s) to the caller', async (method, status) => {
    expect(await run(failure(method, status))).toBe('rejected');
    expect(requestSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['get', 400],
    ['get', 401],
    ['get', 403],
    ['get', 404],
    ['get', 409],
    ['get', 422],
    ['put', 404],
  ])('never retries a 4xx (%s %s)', async (method, status) => {
    expect(await run(failure(method, status))).toBe('rejected');
    expect(requestSpy).not.toHaveBeenCalled();
  });

  it('does not retry a lost response while the browser is offline', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      expect(await run(failure('get', null))).toBe('rejected');
      expect(requestSpy).not.toHaveBeenCalled();
    } finally {
      onLine.mockRestore();
    }
  });

  it.each([
    ['a timeout', 'ECONNABORTED'],
    ['a cancellation', 'ERR_CANCELED'],
  ])('does not retry after %s', async (_label, code) => {
    const error = failure('get', null);
    (error as { code?: string }).code = code;
    expect(await run(error)).toBe('rejected');
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

describe('isTransportRetryable', () => {
  const response = (status: number) =>
    ({ response: { status } }) as unknown as Pick<AxiosError, 'response'>;
  it('retries reads after any 5xx, writes only after 502–504', () => {
    expect(isTransportRetryable({ method: 'get' }, response(500))).toBe(true);
    expect(isTransportRetryable({ method: 'put' }, response(500))).toBe(false);
    expect(isTransportRetryable({ method: 'put' }, response(502))).toBe(true);
    expect(isTransportRetryable({ method: 'get' }, response(429))).toBe(false);
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
