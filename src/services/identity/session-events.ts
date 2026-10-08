/**
 * Session lifecycle signals, inside this tab and across tabs.
 *
 * Stale-tab recovery: a refresh that the SERVER refused (the session was
 * revoked, expired or replaced) used to clear the token silently while the
 * app kept showing a signed-in UI — every later request then failed with
 * nothing telling the person to sign in again. And a refresh that merely
 * could not reach the server (a laptop waking before its Wi-Fi) was treated
 * exactly the same way, signing a person out for a network blip.
 *
 *  - `isDefinitiveAuthFailure` tells the two apart: only a 401/403 answer
 *    ends a session; a network error or a 5xx leaves it to be retried.
 *  - `announceSessionEnded` tells this tab and every other tab on this
 *    origin (BroadcastChannel) — sign-out in one tab signs them all out.
 *  - `announceSignedIn` lets a tab still running another person's state
 *    notice that the browser's session now belongs to someone else (the
 *    session cookie is shared by every tab) and start over.
 * The server stays authoritative; these only keep every tab's UI honest.
 */
export const SESSION_ENDED_EVENT = 'atlas:session-ended';
const CHANNEL_NAME = 'atlas:session';

type SessionMessage =
  | { readonly type: 'ended' }
  | { readonly type: 'signed-in'; readonly userId: string };

function openChannel(): BroadcastChannel | null {
  try {
    return typeof BroadcastChannel === 'undefined'
      ? null
      : new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
}

function post(message: SessionMessage): void {
  const channel = openChannel();
  if (!channel) return;
  try {
    channel.postMessage(message);
  } finally {
    channel.close();
  }
}

/** True only when the server answered that the session is not valid. */
export function isDefinitiveAuthFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    status?: unknown;
    response?: { status?: unknown };
  };
  const status =
    typeof candidate.status === 'number'
      ? candidate.status
      : candidate.response?.status;
  return status === 401 || status === 403;
}

/** This tab's session is over: tell this tab and every other one. */
export function announceSessionEnded(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SESSION_ENDED_EVENT));
  post({ type: 'ended' });
}

/** A session was just established for `userId` in this browser. */
export function announceSignedIn(userId: string): void {
  post({ type: 'signed-in', userId });
}

export interface SessionSignalHandlers {
  /** The session ended (here or in another tab). */
  readonly onEnded: () => void;
  /** Another tab signed in as `userId`. */
  readonly onSignedInElsewhere: (userId: string) => void;
}

/** Subscribes to both signals; returns the unsubscribe function. */
export function subscribeToSessionSignals(
  handlers: SessionSignalHandlers
): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const onLocal = () => handlers.onEnded();
  window.addEventListener(SESSION_ENDED_EVENT, onLocal);
  const channel = openChannel();
  const onMessage = (event: MessageEvent<SessionMessage>) => {
    if (event.data?.type === 'ended') handlers.onEnded();
    else if (event.data?.type === 'signed-in') {
      handlers.onSignedInElsewhere(event.data.userId);
    }
  };
  channel?.addEventListener('message', onMessage);
  return () => {
    window.removeEventListener(SESSION_ENDED_EVENT, onLocal);
    channel?.removeEventListener('message', onMessage);
    channel?.close();
  };
}
