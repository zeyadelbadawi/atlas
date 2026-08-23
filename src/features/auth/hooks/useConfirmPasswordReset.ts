/**
 * useConfirmPasswordReset hook.
 *
 * Wraps `authenticationService.confirmPasswordReset` — `ResetPasswordForm`
 * used to fake-succeed via `setTimeout` (Prompt 3A).
 */
import { useApiMutation } from '@/shared/hooks';
import { authenticationService } from '@services/identity';
import type { ApiError } from '@api';
import type { PasswordResetConfirmation } from '@types';

export function useConfirmPasswordReset() {
  return useApiMutation<void, PasswordResetConfirmation, ApiError>({
    mutationFn: (request) => authenticationService.confirmPasswordReset(request),
    showSuccessToast: false,
    showErrorToast: false,
  });
}
