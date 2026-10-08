/**
 * Stale-tab recovery — session signals across tabs (BroadcastChannel) and
 * the line between "the server said no" and "the network failed".
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  announceSessionEnded,
  announceSignedIn,
  isDefinitiveAuthFailure,
  subscribeToSessionSignals,
} from './session-events';

const unsubscribers: (() => void)[] = [];
afterEach(() => {
  unsubscribers.splice(0).forEach((stop) => stop());
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('isDefinitiveAuthFailure', () => {
  it('only a 401/403 answer ends a session', () => {
    expect(isDefinitiveAuthFailure({ status: 401 })).toBe(true);
    expect(isDefinitiveAuthFailure({ response: { status: 403 } })).toBe(true);
    expect(isDefinitiveAuthFailure({ status: 503 })).toBe(false);
    expect(isDefinitiveAuthFailure(new Error('Network Error'))).toBe(false);
    expect(isDefinitiveAuthFailure(undefined)).toBe(false);
  });
});

describe('session signals', () => {
  it('a session ending in one tab reaches this tab and the others', async () => {
    const here = vi.fn();
    const otherTab = vi.fn();
    unsubscribers.push(
      subscribeToSessionSignals({
        onEnded: here,
        onSignedInElsewhere: vi.fn(),
      }),
      subscribeToSessionSignals({
        onEnded: otherTab,
        onSignedInElsewhere: vi.fn(),
      })
    );
    announceSessionEnded();
    await flush();
    expect(here).toHaveBeenCalled();
    expect(otherTab).toHaveBeenCalled();
  });

  it('a sign-in elsewhere names the account it belongs to', async () => {
    const onSignedInElsewhere = vi.fn();
    unsubscribers.push(
      subscribeToSessionSignals({ onEnded: vi.fn(), onSignedInElsewhere })
    );
    announceSignedIn('user-b');
    await flush();
    expect(onSignedInElsewhere).toHaveBeenCalledWith('user-b');
  });
});
