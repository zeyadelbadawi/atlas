/**
 * useResendEmailVerification hook.
 *
 * Wraps `authenticationService.resendEmailVerification` — emails the
 * signed-in account a fresh link. No toasts: the verify pages render the
 * outcome (sent / rate limited / failed) inline, next to the button.
 */
import { useApiMutation } from '@/shared/hooks';
import { authenticationService } from '@services/identity';
import { INLINE_ERRORS_META } from '@services/query';
import type { ApiError } from '@api';

export function useResendEmailVerification() {
  return useApiMutation<void, void, ApiError>({
    mutationFn: () => authenticationService.resendEmailVerification(),
    showSuccessToast: false,
    showErrorToast: false,
    // B1 (V20) — the page renders the failure itself; without this flag the
    // app-wide reporter added a second message, a toast, on top of it.
    meta: { [INLINE_ERRORS_META]: true },
  });
}
