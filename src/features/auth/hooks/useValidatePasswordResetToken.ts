/**
 * useValidatePasswordResetToken hook (P64 Phase 1).
 *
 * Asks the backend whether a reset token is usable BEFORE the new-password
 * form is shown, so an expired link says so up front instead of after the
 * user has typed a password twice. `data` is `false` for a missing token
 * without a request being made.
 */
import { useApiQuery } from '@/shared/hooks';
import { authKeys, INLINE_ERRORS_META } from '@services/query';
import { authenticationService } from '@services/identity';
import type { ApiError } from '@api';

export function useValidatePasswordResetToken(token: string | null) {
  return useApiQuery<boolean, ApiError>({
    queryKey: authKeys.passwordResetToken(token ?? ''),
    queryFn: () =>
      token
        ? authenticationService.validatePasswordResetToken(token)
        : Promise.resolve(false),
    // A token is either valid now or it is not — re-asking on focus or on a
    // retry schedule gains nothing and the endpoint is rate-limited.
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    // B1 (V20) — the page says what happened (and offers a retry); no toast.
    meta: { [INLINE_ERRORS_META]: true },
  });
}
