/**
 * useRequestPasswordReset hook.
 *
 * Wraps `authenticationService.requestPasswordReset` — `ForgotPasswordForm`
 * used to fake-succeed via `setTimeout` (Prompt 3A).
 */
import { useApiMutation } from '@/shared/hooks';
import { authenticationService } from '@services/identity';
import { INLINE_ERRORS_META } from '@services/query';
import type { ApiError } from '@api';
import type { PasswordResetRequest } from '@types';

export function useRequestPasswordReset() {
  return useApiMutation<void, PasswordResetRequest, ApiError>({
    mutationFn: (request) =>
      authenticationService.requestPasswordReset(request),
    showSuccessToast: false,
    showErrorToast: false,
    // B1 (V20) — the page renders the failure itself; without this flag the
    // app-wide reporter added a second message, a toast, on top of it.
    meta: { [INLINE_ERRORS_META]: true },
  });
}
