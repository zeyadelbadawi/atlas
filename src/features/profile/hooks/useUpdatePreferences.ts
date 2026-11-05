/**
 * useUpdatePreferences hook.
 *
 * Wraps `currentUserService.updatePreferences` — the real, pre-existing
 * mutation `ProfilePreferencesSection` used to bypass with a fake
 * `setTimeout` (Prompt 3A).
 */
import { useApiMutation, useAuth } from '@/shared/hooks';
import { currentUserService } from '@services/identity';
import { INLINE_ERRORS_META } from '@services/query';
import type { ApiError } from '@api';
import type { CurrentUser, UserPreferences } from '@types';

export function useUpdatePreferences() {
  const { refreshSession } = useAuth();

  return useApiMutation<CurrentUser, Partial<UserPreferences>, ApiError>({
    mutationFn: (preferences) =>
      currentUserService.updatePreferences(preferences),
    showSuccessToast: false,
    showErrorToast: false,
    // B1 (V15) — the section says itself that nothing was saved, in the
    // language still on screen; no toast repeats it.
    meta: { [INLINE_ERRORS_META]: true },
    onSuccess: async () => {
      await refreshSession();
    },
  });
}
