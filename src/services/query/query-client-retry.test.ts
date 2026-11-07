/**
 * Owner decision (UX audit, "faster error on failed reads") — one retry
 * layer. The HTTP client retries a failed read once
 * (`http-client-retry.test.ts`); the query layer must not retry on top of
 * it, or a GET that fails with a 500 is fetched again and again before its
 * error shows (~12 s before this change).
 */
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@api';
import { createQueryClient } from './query-client';

function serverError(): ApiError {
  return new ApiError({
    kind: 'server',
    messageKey: 'errors.server',
    status: 500,
    retryable: true,
  });
}

describe('query layer retries', () => {
  it('does not retry a failed query, even a retryable server error', async () => {
    const reportError = vi.fn();
    const client = createQueryClient(reportError);
    const queryFn = vi.fn(async () => {
      throw serverError();
    });
    const observerResult = client
      .getQueryCache()
      .build(client, { queryKey: ['retry-policy'], queryFn });

    await expect(observerResult.fetch()).rejects.toBeInstanceOf(ApiError);
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(reportError).toHaveBeenCalledTimes(1);
  });

  it('declares no query or mutation retries by default', () => {
    const defaults = createQueryClient().getDefaultOptions();
    expect(defaults.queries?.retry).toBe(false);
    expect(defaults.mutations?.retry).toBe(0);
  });
});
