/**
 * useUpdatePreferences hook.
 *
 * Wraps `currentUserService.updatePreferences` — the real, pre-existing
 * mutation `ProfilePreferencesSection` used to bypass with a fake
 * `setTimeout` (Prompt 3A).
 */
import { useApiMutation, useAuth } from '@/shared/hooks';
import { currentUserService } from '@services/identity';
import type { ApiError } from '@api';
import type { CurrentUser, UserPreferences } from '@types';

export function useUpdatePreferences() {
  const { refreshSession } = useAuth();

  return useApiMutation<CurrentUser, Partial<UserPreferences>, ApiError>({
    mutationFn: (preferences) => currentUserService.updatePreferences(preferences),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await refreshSession();
    },
  });
}
