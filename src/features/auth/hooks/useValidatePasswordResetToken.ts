/**
 * useValidatePasswordResetToken hook (P64 Phase 1).
 *
 * Asks the backend whether a reset token is usable BEFORE the new-password
 * form is shown, so an expired link says so up front instead of after the
 * user has typed a password twice. `data` is `false` for a missing token
 * without a request being made.
 */
import { useApiQuery } from '@/shared/hooks';
import { authKeys } from '@services/query';
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
  });
}
