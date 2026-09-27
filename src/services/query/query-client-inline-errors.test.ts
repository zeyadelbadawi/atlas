/**
 * The app-wide error reporter (a toast, in `AtlasQueryProvider`) hears
 * every failed mutation — except one that declares it renders its own
 * failures (`meta.inlineErrors`). Sign-up is the first: on an academy
 * website its "email already registered" answer becomes the join step, and
 * a global "try signing in instead" toast on top would contradict it.
 */
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@api';
import { createQueryClient, INLINE_ERRORS_META } from './query-client';

function conflict(): ApiError {
  return new ApiError({
    kind: 'conflict',
    messageKey: 'errors.auth.emailAlreadyRegistered',
    status: 409,
    retryable: false,
  });
}

async function runFailingMutation(meta?: Record<string, unknown>) {
  const reportError = vi.fn();
  const client = createQueryClient(reportError);
  const mutation = client.getMutationCache().build(client, {
    mutationFn: async () => {
      throw conflict();
    },
    retry: false,
    meta,
  });
  await mutation.execute(undefined).catch(() => undefined);
  return reportError;
}

describe('createQueryClient — inline-error mutations', () => {
  it('reports an ordinary failed mutation', async () => {
    const reportError = await runFailingMutation();
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(reportError.mock.calls[0][0].messageKey).toBe(
      'errors.auth.emailAlreadyRegistered'
    );
  });

  it('stays quiet for a mutation that renders its own failures', async () => {
    const reportError = await runFailingMutation({
      [INLINE_ERRORS_META]: true,
    });
    expect(reportError).not.toHaveBeenCalled();
  });
});
