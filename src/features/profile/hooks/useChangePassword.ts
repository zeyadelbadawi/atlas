/**
 * useChangePassword hook.
 *
 * Wraps `currentUserService.changePassword` — the real, pre-existing
 * mutation `ProfileSecuritySection` used to bypass with a fake
 * `setTimeout` (Prompt 3A).
 */
import { useApiMutation } from '@/shared/hooks';
import { currentUserService } from '@services/identity';
import type { ApiError } from '@api';

export interface ChangePasswordVariables {
  readonly currentPassword: string;
  readonly newPassword: string;
}

export function useChangePassword() {
  return useApiMutation<void, ChangePasswordVariables, ApiError>({
    mutationFn: ({ currentPassword, newPassword }) =>
      currentUserService.changePassword(currentPassword, newPassword),
    showSuccessToast: false,
    showErrorToast: false,
  });
}
