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
  | 'rateLimited'
  | 'network';

export interface VerifyEmailFlow {
  readonly state: VerifyEmailState;
  /** Support reference for a failed request, when the backend sent one. */
  readonly requestId?: string;
  /** Whether `retry` can do anything (a network or rate-limit failure, token still held). */
  readonly canRetry: boolean;
  readonly retry: () => void;
}

const EXPIRED_KEY = 'errors.auth.verificationTokenExpired';
const USED_KEY = 'errors.auth.verificationTokenUsed';

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
  return 'invalid';
}

/** `<meta name="referrer" content="no-referrer">` for as long as the caller is mounted. */
function useNoReferrerPolicy(): void {
  useLayoutEffect(() => {
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
  const [token] = useState(() => searchParams.get('token'));
  const verifyEmail = useVerifyEmail();
  const { refreshSession } = useAuth();
  const { mutate, reset } = verifyEmail;
  const requested = useRef(false);

  useNoReferrerPolicy();

  useEffect(() => {
    if (!searchParams.has('token')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('token');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const submit = useCallback(() => {
    if (!token) return;
    mutate(
      { token },
      {
        onSuccess: () => {
          // A no-op when signed out; never turns a verified link into an error.
          refreshSession().catch(() => undefined);
        },
      }
    );
  }, [token, mutate, refreshSession]);

  useEffect(() => {
    if (!token || requested.current) return;
    requested.current = true;
    submit();
  }, [token, submit]);

  const state: VerifyEmailState = !token
    ? 'missing'
    : verifyEmail.isSuccess
      ? 'success'
      : verifyEmail.isError
        ? failureState(verifyEmail.error)
        : 'pending';

  const canRetry = state === 'network' || state === 'rateLimited';
  const retry = useCallback(() => {
    if (!canRetry) return;
    reset();
    submit();
  }, [canRetry, reset, submit]);

  return {
    state,
    requestId: verifyEmail.error?.requestId,
    canRetry,
    retry,
  };
}
