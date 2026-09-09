/**
 * Active device session hooks (Phase 10).
 *
 * These replace the display-only "Current Device — last active: now" block
 * that `ProfileSecuritySection` used to render. That block was a hardcoded
 * fiction: it showed one row regardless of how many devices were signed
 * in, and "now" was a literal string rather than any recorded activity.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/shared/hooks';
import { authenticationService } from '@services/identity';
import type { ApiError } from '@api';
import type { UserSession } from '@types';

/** Shared so the revoke mutation can invalidate exactly what the list reads. */
export const SESSIONS_QUERY_KEY = ['auth', 'sessions'] as const;

/**
 * The caller's own active sessions. Takes no user id — the backend
 * resolves the owner from the access token, so there is no parameter here
 * that could be pointed at somebody else.
 */
export function useSessions() {
  return useApiQuery<readonly UserSession[], ApiError>({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: () => authenticationService.listSessions(),
    // Session activity changes on a human timescale, and this list is
    // read on a settings screen the user opens deliberately. Refetching
    // on focus keeps a revoked-elsewhere session from lingering on screen
    // without polling the endpoint continuously.
    staleTime: 30_000,
  });
}

export interface RevokeSessionVariables {
  readonly sessionId: string;
  /**
   * Whether this is the session making the request. The caller uses it to
   * decide between "refresh the list" and "this device just signed
   * itself out" — the two outcomes are genuinely different and the second
   * cannot be recovered from by refetching, because every subsequent
   * request from this device will 401.
   */
  readonly isCurrent: boolean;
}

/**
 * Revokes one session. Deliberately does NOT invalidate the list when the
 * revoked session was the current one: that request would fire with an
 * access token the backend has just denied, producing a spurious error
 * toast on the way out. The component handles the sign-out path instead.
 */
export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useApiMutation<void, RevokeSessionVariables, ApiError>({
    mutationFn: ({ sessionId }) =>
      authenticationService.revokeSession(sessionId),
    onSuccess: (_data, variables) => {
      if (variables.isCurrent) return;
      void queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
    },
    // Both surfaced inline by the component — a toast alone would leave
    // the failed row looking untouched with no explanation attached to it.
    showSuccessToast: false,
    showErrorToast: false,
  });
}
