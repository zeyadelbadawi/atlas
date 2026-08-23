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
    onSuccess: async () => {
      await refreshSession();
    },
  });
}
