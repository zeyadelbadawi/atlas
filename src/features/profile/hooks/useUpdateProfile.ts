/**
 * useUpdateProfile hook.
 *
 * Wraps `currentUserService.updateProfile` — the real, pre-existing
 * mutation `ProfilePersonalSection` used to bypass with a fake
 * `setTimeout` (Prompt 3A). Refreshes the session afterward so the
 * updated name is reflected everywhere `useAuth().user` is read, not
 * just locally in this form.
 */
import { useApiMutation, useAuth } from '@/shared/hooks';
import { currentUserService } from '@services/identity';
import { INLINE_ERRORS_META } from '@services/query';
import type { ApiError } from '@api';
import type { CurrentUser } from '@types';

export interface UpdateProfileVariables {
  readonly name?: string;
  readonly avatar?: string;
}

export function useUpdateProfile() {
  const { refreshSession } = useAuth();

  return useApiMutation<CurrentUser, UpdateProfileVariables, ApiError>({
    mutationFn: (updates) => currentUserService.updateProfile(updates),
    showSuccessToast: false,
    showErrorToast: false,
    // The form renders every failure itself (fields, a taken name on the
    // name field — W4 — or its own message), so the app-wide error toast
    // stays quiet instead of repeating it.
    meta: { [INLINE_ERRORS_META]: true },
    onSuccess: async () => {
      await refreshSession();
    },
  });
}
