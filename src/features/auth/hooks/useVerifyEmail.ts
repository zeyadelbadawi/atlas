/**
 * useVerifyEmail hook (P64 Phase 1).
 *
 * Wraps `authenticationService.verifyEmail` — the emailed token is the
 * only credential, and the page fires this once on arrival. A success
 * invalidates the cached current user and session, so a signed-in reader
 * does not keep seeing the account as unverified.
 */
import { useApiMutation } from '@/shared/hooks';
import { authenticationService } from '@services/identity';
import { authKeys } from '@services/query';
import type { ApiError } from '@api';
import type { EmailVerificationRequest } from '@types';

export function useVerifyEmail() {
  return useApiMutation<void, EmailVerificationRequest, ApiError>({
    mutationFn: (request) => authenticationService.verifyEmail(request),
    showSuccessToast: false,
    showErrorToast: false,
    invalidateKeys: [authKeys.currentUser(), authKeys.session()],
  });
}
