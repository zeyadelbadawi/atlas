/**
 * useUpdatePlatformSettings hook.
 *
 * `GeneralSettings` patches only the fields it owns, never the whole
 * object.
 */
import { useApiMutation } from '@/shared/hooks';
import { INLINE_ERRORS_META, platformSettingsKeys } from '@services/query';
import { platformSettingsService } from '../services/PlatformSettingsService';
import type { ApiError } from '@api';
import type { PlatformConfiguration } from '@types';

export function useUpdatePlatformSettings() {
  return useApiMutation<
    PlatformConfiguration,
    Partial<PlatformConfiguration>,
    ApiError
  >({
    mutationFn: (payload) =>
      platformSettingsService.updateConfiguration(payload),
    // B1 — a save is confirmed; a failure is shown once, by the form (on
    // its fields, or one inline message), never also as a toast.
    successMessageKey: 'settings:messages.saveSuccess',
    showErrorToast: false,
    meta: { [INLINE_ERRORS_META]: true },
    invalidateKeys: [platformSettingsKeys.all],
  });
}
