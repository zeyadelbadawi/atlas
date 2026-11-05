/**
 * useChangePassword hook.
 *
 * Wraps `currentUserService.changePassword` — the real, pre-existing
 * mutation `ProfileSecuritySection` used to bypass with a fake
 * `setTimeout` (Prompt 3A).
 */
import { useApiMutation } from '@/shared/hooks';
import { currentUserService } from '@services/identity';
import { INLINE_ERRORS_META } from '@services/query';
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
    // B1 (V09) — the form shows every failure itself: a wrong current
    // password on that field, a refused new password on its field, and
    // anything else as one inline message. The app-wide toast ("Your
    // session has expired" over "Your current password is incorrect")
    // stays quiet.
    meta: { [INLINE_ERRORS_META]: true },
  });
}
