/**
 * useVerifyEmailFlow — everything the two verify-email pages (management
 * host `/auth/verify-email`, academy host `/verify-email`) share.
 *
 *  - The token is read from `?token=` ONCE, kept in component state, and
 *    removed from the address bar right after (a `replace` navigation, i.e.
 *    `history.replaceState`), so it does not linger in history, a
 *    bookmark, a screenshot or a shared link.
 *  - While the page is mounted the document's referrer policy is
 *    `no-referrer`, so nothing it loads or links to is told the URL the
 *    link opened with.
 *  - The token is submitted exactly once. The guard is a ref rather than
 *    the mutation's own `isIdle`: React 18's StrictMode double-invokes
 *    effects in development, and a single-use token's second submission
 *    would report "already used" for a link that had just worked.
 *  - On success the session is refreshed, so a signed-in reader's cached
 *    account stops looking unverified.
 *  - The result is ONE state, from the backend's specific refusal:
 *    expired / already used are only ever reported for a real link (an
 *    unknown or malformed token is always plain `invalid`), and a network
 *    or rate-limit failure can be retried with the same token because the
 *    token was never spent.
 *  - ATO F1 follow-up: the backend only spends a token for a request
 *    signed in as the account it belongs to. Anyone else, holding a live
 *    link, gets `signInRequired` and the token is NOT spent. So the token
 *    is kept for the sign-in round trip — in `sessionStorage` (this tab,
 *    this origin), for 30 minutes, never back in the URL — and picked up
 *    again when the page is reopened without `?token=`. It is cleared on
 *    success and on every refusal a new attempt would not change
 *    (invalid / expired / used).
 *  - The first submission waits for the session restore, so a signed-in
 *    reader's request carries their session. If the reader then becomes
 *    signed in as someone other than whoever the last attempt was sent
 *    as (sign-in finished in place, or the restore raced the request),
 *    a `signInRequired` outcome is re-submitted automatically, once per
 *    account. A `signInRequired` while signed in therefore means the link
 *    belongs to a different account.
 *  - When the state changes (the outcome replacing "verifying…", or a
 *    retry's outcome replacing the Retry button), focus moves to the
 *    element the page attaches `outcomeRef` to, so the outcome is
 *    announced and focus does not fall back to the document body. The
 *    signed-in and signed-out variants of `signInRequired` count as
 *    different outcomes (signing out of the wrong account replaces the
 *    button that did it).
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@hooks';
import type { ApiError } from '@api';
import { useVerifyEmail } from './useVerifyEmail';

export type VerifyEmailState =
  | 'pending'
  | 'success'
  /** The page was opened without a token (or reloaded after it was cleaned from the URL). */
  | 'missing'
  | 'invalid'
  | 'expired'
  | 'used'
  /** A live link, refused because the request was not signed in as its account; the token is kept. */
  | 'signInRequired'
  | 'rateLimited'
  | 'network';

export interface VerifyEmailFlow {
  readonly state: VerifyEmailState;
  /** Support reference for a failed request, when the backend sent one. */
  readonly requestId?: string;
  /** Whether `retry` can do anything (a network or rate-limit failure, token still held). */
  readonly canRetry: boolean;
  readonly retry: () => void;
  /** Attach to the outcome's heading/message (`tabIndex={-1}`); focused when the state changes. */
  readonly outcomeRef: (element: HTMLElement | null) => void;
}

const EXPIRED_KEY = 'errors.auth.verificationTokenExpired';
const USED_KEY = 'errors.auth.verificationTokenUsed';
const SIGN_IN_REQUIRED_KEY = 'errors.auth.verificationSignInRequired';

/** Where a `signInRequired` token waits for the sign-in round trip (per tab, per origin). */
const PENDING_TOKEN_STORAGE_KEY = 'atlas:pending-email-verification';
/** A kept token older than this is ignored (and dropped). */
const PENDING_TOKEN_MAX_AGE_MS = 30 * 60 * 1000;

/** Refusals another attempt with the same token would not change. */
const TERMINAL_STATES: ReadonlySet<VerifyEmailState> = new Set([
  'invalid',
  'expired',
  'used',
]);

/** Browsers' default policy, restored when the page unmounts (removing the meta alone does not revert it). */
const DEFAULT_REFERRER_POLICY = 'strict-origin-when-cross-origin';

function failureState(error: ApiError | null): VerifyEmailState {
  if (!error) return 'invalid';
  if (error.kind === 'rateLimited') return 'rateLimited';
  if (
    error.kind === 'network' ||
    error.kind === 'timeout' ||
    error.kind === 'server' ||
    error.kind === 'unknown'
  ) {
    return 'network';
  }
  if (error.messageKey === EXPIRED_KEY) return 'expired';
  if (error.messageKey === USED_KEY) return 'used';
  if (error.messageKey === SIGN_IN_REQUIRED_KEY) return 'signInRequired';
  return 'invalid';
}

function clearPendingToken(): void {
  try {
    window.sessionStorage.removeItem(PENDING_TOKEN_STORAGE_KEY);
  } catch {
    // Unavailable storage: nothing was kept.
  }
}

/** The kept token, if there is one and it has not expired. Parsed defensively. */
function readPendingToken(): string | null {
  let raw: string | null;
  try {
    raw = window.sessionStorage.getItem(PENDING_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof parsed.token === 'string' &&
      parsed.token.length > 0 &&
      typeof parsed.expiresAt === 'number' &&
      parsed.expiresAt > Date.now()
    ) {
      return parsed.token;
    }
  } catch {
    // Unreadable: dropped below.
  }
  clearPendingToken();
  return null;
}

/** Keeps the token for the sign-in round trip; the expiry runs from the first refusal. */
function storePendingToken(token: string): void {
  if (readPendingToken() === token) return;
  try {
    window.sessionStorage.setItem(
      PENDING_TOKEN_STORAGE_KEY,
      JSON.stringify({
        token,
        expiresAt: Date.now() + PENDING_TOKEN_MAX_AGE_MS,
      })
    );
  } catch {
    // Unavailable storage: the reader opens the link again after signing in.
  }
}

// The academy-host page is also rendered on the server, where
// `useLayoutEffect` warns; the effect itself only ever runs in a browser.
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** `<meta name="referrer" content="no-referrer">` for as long as the caller is mounted. */
function useNoReferrerPolicy(): void {
  useIsomorphicLayoutEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    return () => {
      // A referrer policy set by a meta element survives the element's
      // removal; changing `content` first is what actually restores it.
      meta.content = DEFAULT_REFERRER_POLICY;
      meta.remove();
    };
  }, []);
}

export function useVerifyEmailFlow(): VerifyEmailFlow {
  const [searchParams, setSearchParams] = useSearchParams();
  const [token, setToken] = useState(() => searchParams.get('token'));
  const verifyEmail = useVerifyEmail();
  const { refreshSession, isAuthenticated, isRestoring, user } = useAuth();
  const { mutate, reset } = verifyEmail;
  const requested = useRef(false);
  /** Who the latest attempt was sent as: an account id, `null` signed out, `undefined` before the first. */
  const [submittedAs, setSubmittedAs] = useState<string | null | undefined>(
    undefined
  );
  const viewer = isAuthenticated ? (user?.id ?? '') : null;

  useNoReferrerPolicy();

  // Opened without `?token=` (back from signing in): the kept token, if
  // any. Read after mount — the academy page is also rendered on the
  // server, which has no storage — but before paint.
  useIsomorphicLayoutEffect(() => {
    if (token) return;
    const pending = readPendingToken();
    if (pending) setToken(pending);
    // Mount only: a later token never replaces the one being verified.
  }, []);

  useEffect(() => {
    if (!searchParams.has('token')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('token');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const submit = useCallback(() => {
    if (!token) return;
    setSubmittedAs(viewer);
    mutate(
      { token },
      {
        onSuccess: () => {
          // A no-op when signed out; never turns a verified link into an error.
          refreshSession().catch(() => undefined);
        },
      }
    );
  }, [token, viewer, mutate, refreshSession]);

  useEffect(() => {
    if (!token || isRestoring || requested.current) return;
    requested.current = true;
    submit();
  }, [token, isRestoring, submit]);

  const outcome: VerifyEmailState = !token
    ? 'missing'
    : verifyEmail.isSuccess
      ? 'success'
      : verifyEmail.isError
        ? failureState(verifyEmail.error)
        : 'pending';

  // Signed in as someone the last attempt was not sent as: the automatic
  // re-submission below is about to run, so show it as under way.
  const resubmitDue =
    outcome === 'signInRequired' &&
    submittedAs !== undefined &&
    viewer !== null &&
    submittedAs !== viewer;
  const state: VerifyEmailState = resubmitDue ? 'pending' : outcome;

  useEffect(() => {
    if (!resubmitDue) return;
    reset();
    submit();
  }, [resubmitDue, reset, submit]);

  useEffect(() => {
    if (!token) return;
    if (outcome === 'signInRequired') storePendingToken(token);
    else if (outcome === 'success' || TERMINAL_STATES.has(outcome)) {
      clearPendingToken();
    }
  }, [outcome, token]);

  const canRetry = state === 'network' || state === 'rateLimited';
  const retry = useCallback(() => {
    if (!canRetry) return;
    reset();
    submit();
  }, [canRetry, reset, submit]);

  const outcomeNode = useRef<HTMLElement | null>(null);
  const focusKey =
    state === 'signInRequired' && isAuthenticated
      ? 'signInRequired:otherAccount'
      : state;
  const previousFocusKey = useRef(focusKey);
  useEffect(() => {
    if (previousFocusKey.current === focusKey) return;
    previousFocusKey.current = focusKey;
    outcomeNode.current?.focus({ preventScroll: true });
  }, [focusKey]);
  const outcomeRef = useCallback((element: HTMLElement | null) => {
    outcomeNode.current = element;
  }, []);

  return {
    state,
    requestId: verifyEmail.error?.requestId,
    canRetry,
    retry,
    outcomeRef,
  };
}
