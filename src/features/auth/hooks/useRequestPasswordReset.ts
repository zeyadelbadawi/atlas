/**
 * useRequestPasswordReset hook.
 *
 * Wraps `authenticationService.requestPasswordReset` — `ForgotPasswordForm`
 * used to fake-succeed via `setTimeout` (Prompt 3A).
 */
import { useApiMutation } from '@/shared/hooks';
import { authenticationService } from '@services/identity';
import type { ApiError } from '@api';
import type { PasswordResetRequest } from '@types';

export function useRequestPasswordReset() {
  return useApiMutation<void, PasswordResetRequest, ApiError>({
    mutationFn: (request) => authenticationService.requestPasswordReset(request),
    showSuccessToast: false,
    showErrorToast: false,
  });
}
