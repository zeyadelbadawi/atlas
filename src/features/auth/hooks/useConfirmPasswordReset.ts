/**
 * useConfirmPasswordReset hook.
 *
 * Wraps `authenticationService.confirmPasswordReset` — `ResetPasswordForm`
 * used to fake-succeed via `setTimeout` (Prompt 3A).
 */
import { useApiMutation } from '@/shared/hooks';
import { authenticationService } from '@services/identity';
import { INLINE_ERRORS_META } from '@services/query';
import type { ApiError } from '@api';
import type { PasswordResetConfirmation } from '@types';

export function useConfirmPasswordReset() {
  return useApiMutation<void, PasswordResetConfirmation, ApiError>({
    mutationFn: (request) =>
      authenticationService.confirmPasswordReset(request),
    showSuccessToast: false,
    showErrorToast: false,
    // B1 (V20) — the page renders the failure itself; without this flag the
    // app-wide reporter added a second message, a toast, on top of it.
    meta: { [INLINE_ERRORS_META]: true },
  });
}
