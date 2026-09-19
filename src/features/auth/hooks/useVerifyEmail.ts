/**
 * useVerifyEmail hook (P64 Phase 1).
 *
 * Wraps `authenticationService.verifyEmail` — the emailed token is the
 * only credential, and the page fires this once on arrival.
 */
import { useApiMutation } from '@/shared/hooks';
import { authenticationService } from '@services/identity';
import type { ApiError } from '@api';
import type { EmailVerificationRequest } from '@types';

export function useVerifyEmail() {
  return useApiMutation<void, EmailVerificationRequest, ApiError>({
    mutationFn: (request) => authenticationService.verifyEmail(request),
    showSuccessToast: false,
    showErrorToast: false,
  });
}
