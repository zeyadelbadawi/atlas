/**
 * useResendEmailVerification hook.
 *
 * Wraps `authenticationService.resendEmailVerification` — emails the
 * signed-in account a fresh link. No toasts: the verify pages render the
 * outcome (sent / rate limited / failed) inline, next to the button.
 */
import { useApiMutation } from '@/shared/hooks';
import { authenticationService } from '@services/identity';
import type { ApiError } from '@api';

export function useResendEmailVerification() {
  return useApiMutation<void, void, ApiError>({
    mutationFn: () => authenticationService.resendEmailVerification(),
    showSuccessToast: false,
    showErrorToast: false,
  });
}
